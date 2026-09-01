import { db } from '@/lib/db'

/**
 * Análises vivas: a pergunta que continua a ser feita.
 *
 * Até aqui toda a análise era um cadáver. Nascia, era publicada, e morria: os dados por baixo
 * mudavam e ninguém sabia. É a diferença entre um relatório e um serviço, e é a única coisa nesta
 * ronda que muda a forma como o portal ganha dinheiro em vez de só melhorar o produto.
 *
 * O que se guarda é a PERGUNTA, não a resposta. Cada corrida cria uma análise nova, ligada à
 * original, e a original passa a ser a raiz de uma linhagem. É deliberado não sobrepor: substituir
 * a resposta apagaria o histórico, e o histórico é precisamente o produto. Um relatório distribuído
 * em Março tem de continuar a existir tal como foi distribuído, mesmo depois de a corrida de Abril
 * dizer outra coisa.
 */

export type Periodicidade = 'semanal' | 'mensal' | 'trimestral'

export type AnaliseViva = {
  raiz_id: string
  utilizador_id: number
  periodicidade: Periodicidade
  activa: boolean
  ultima_corrida: string | null
  ultima_analise_id: string | null
  criado_em: string
}

const DIAS: Record<Periodicidade, number> = { semanal: 7, mensal: 30, trimestral: 90 }

let tabelasGarantidas = false

/**
 * Põe estas tabelas na mesma colação de `analises`.
 *
 * Não é um detalhe de arrumação: o MySQL recusa comparar duas colunas de texto com colações
 * diferentes, e `analises_vivas.raiz_id` existe para ser comparada com `analises.id`. Criadas com
 * `utf8mb4_unicode_ci` enquanto `analises` está em `utf8mb4_general_ci`, o JOIN do painel morria com
 * "Illegal mix of collations" e a página inteira deixava de abrir. Visto ao vivo.
 *
 * A conversão corre uma vez por arranque e só quando a colação está mesmo diferente: `CONVERT TO`
 * reescreve a tabela, e fazê-lo a cada pedido seria trocar um erro por um problema de desempenho.
 * Uma falha aqui não pode derrubar nada, porque sem a conversão o que se perde é o painel, e com
 * uma excepção não tratada perde-se a análise também.
 */
async function alinharColacao(tabelas: string[]) {
  try {
    const [refs] = (await db.execute(
      "SELECT TABLE_COLLATION c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'analises'"
    )) as [any[], unknown]
    const alvo = String(refs[0]?.c || '')
    if (!alvo) return
    for (const nome of tabelas) {
      const [linhas] = (await db.execute(
        'SELECT TABLE_COLLATION c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
        [nome]
      )) as [any[], unknown]
      const actual = String(linhas[0]?.c || '')
      if (!actual || actual === alvo) continue
      await db.execute(`ALTER TABLE \`${nome}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE ${alvo}`)
    }
  } catch {
    /* sem alinhamento o painel falha; com uma excepção aqui falharia tudo o resto também */
  }
}

async function garantirTabelas() {
  if (tabelasGarantidas) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS analises_vivas (
      raiz_id CHAR(12) PRIMARY KEY,
      utilizador_id BIGINT NOT NULL,
      periodicidade VARCHAR(16) NOT NULL DEFAULT 'mensal',
      activa TINYINT(1) NOT NULL DEFAULT 1,
      ultima_corrida DATETIME NULL,
      ultima_analise_id CHAR(12) NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_utilizador (utilizador_id),
      INDEX idx_activa (activa, ultima_corrida)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  )
  // A linhagem vive numa tabela própria e não numa coluna em `analises`: uma corrida é uma relação
  // entre duas análises, e não um atributo de uma delas. Assim uma análise pode ser lida sem se
  // saber nada disto, que é como todo o resto do portal continua a funcionar.
  await db.execute(
    `CREATE TABLE IF NOT EXISTS analises_corridas (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      raiz_id CHAR(12) NOT NULL,
      analise_id CHAR(12) NOT NULL,
      anterior_id CHAR(12) NULL,
      comparacao LONGTEXT NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_analise (analise_id),
      INDEX idx_raiz (raiz_id, criado_em)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  )
  await alinharColacao(['analises_vivas', 'analises_corridas'])
  tabelasGarantidas = true
}

function comoViva(l: any): AnaliseViva {
  return {
    raiz_id: String(l.raiz_id),
    utilizador_id: Number(l.utilizador_id),
    periodicidade: (l.periodicidade || 'mensal') as Periodicidade,
    activa: Number(l.activa) === 1,
    ultima_corrida: l.ultima_corrida ? String(l.ultima_corrida) : null,
    ultima_analise_id: l.ultima_analise_id ? String(l.ultima_analise_id) : null,
    criado_em: String(l.criado_em),
  }
}

export async function obterViva(raizId: string): Promise<AnaliseViva | null> {
  await garantirTabelas()
  const [linhas] = (await db.execute('SELECT * FROM analises_vivas WHERE raiz_id = ? LIMIT 1', [raizId])) as [
    any[],
    unknown,
  ]
  return linhas[0] ? comoViva(linhas[0]) : null
}

export async function definirViva(
  raizId: string,
  utilizadorId: number,
  activa: boolean,
  periodicidade: Periodicidade = 'mensal'
): Promise<void> {
  await garantirTabelas()
  await db.execute(
    `INSERT INTO analises_vivas (raiz_id, utilizador_id, periodicidade, activa)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE activa = VALUES(activa), periodicidade = VALUES(periodicidade)`,
    [raizId, utilizadorId, periodicidade, activa ? 1 : 0]
  )
}

export async function listarVivasDoUtilizador(utilizadorId: number): Promise<(AnaliseViva & { pergunta: string })[]> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    `SELECT v.*, a.pergunta
     FROM analises_vivas v
     JOIN analises a ON a.id = v.raiz_id
     WHERE v.utilizador_id = ? AND v.activa = 1
     ORDER BY v.criado_em DESC`,
    [utilizadorId]
  )) as [any[], unknown]
  return linhas.map((l) => ({ ...comoViva(l), pergunta: String(l.pergunta || '') }))
}

/**
 * As análises vivas que já passaram da data.
 *
 * Uma que nunca correu conta como vencida: foi marcada para ser acompanhada e ainda não o foi.
 */
export async function listarVivasVencidas(limite = 20): Promise<AnaliseViva[]> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    `SELECT * FROM analises_vivas
     WHERE activa = 1
       AND (ultima_corrida IS NULL
            OR ultima_corrida < DATE_SUB(NOW(), INTERVAL CASE periodicidade
                 WHEN 'semanal' THEN 7 WHEN 'trimestral' THEN 90 ELSE 30 END DAY))
     ORDER BY ultima_corrida IS NOT NULL, ultima_corrida ASC
     LIMIT ?`,
    [limite]
  )) as [any[], unknown]
  return linhas.map(comoViva)
}

export function proximaCorrida(viva: AnaliseViva): Date {
  const base = viva.ultima_corrida ? new Date(viva.ultima_corrida) : new Date()
  const d = new Date(base)
  d.setDate(d.getDate() + DIAS[viva.periodicidade])
  return d
}

export async function registarCorrida(entrada: {
  raizId: string
  analiseId: string
  anteriorId: string | null
  comparacao: unknown
}): Promise<void> {
  await garantirTabelas()
  await db.execute(
    `INSERT INTO analises_corridas (raiz_id, analise_id, anterior_id, comparacao)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE comparacao = VALUES(comparacao)`,
    [entrada.raizId, entrada.analiseId, entrada.anteriorId, JSON.stringify(entrada.comparacao ?? null)]
  )
  await db.execute(
    `UPDATE analises_vivas SET ultima_corrida = NOW(), ultima_analise_id = ? WHERE raiz_id = ?`,
    [entrada.analiseId, entrada.raizId]
  )
}

export async function listarCorridas(
  raizId: string
): Promise<{ analise_id: string; anterior_id: string | null; comparacao: any; criado_em: string }[]> {
  await garantirTabelas()
  const [linhas] = (await db.execute(
    'SELECT analise_id, anterior_id, comparacao, criado_em FROM analises_corridas WHERE raiz_id = ? ORDER BY criado_em DESC',
    [raizId]
  )) as [any[], unknown]
  return linhas.map((l) => ({
    analise_id: String(l.analise_id),
    anterior_id: l.anterior_id ? String(l.anterior_id) : null,
    comparacao: (() => {
      try {
        return l.comparacao ? JSON.parse(l.comparacao) : null
      } catch {
        return null
      }
    })(),
    criado_em: String(l.criado_em),
  }))
}

/** A comparação da corrida mais recente, que é o "o que mudou" a mostrar no ecrã. */
export async function ultimaComparacao(raizId: string) {
  const corridas = await listarCorridas(raizId)
  return corridas[0]?.comparacao ?? null
}
