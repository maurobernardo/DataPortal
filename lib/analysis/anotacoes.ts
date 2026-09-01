import { db } from '@/lib/db'

/**
 * Anotações numa análise.
 *
 * O que faltava não era mais um gráfico: era poder dizer alguma coisa SOBRE o gráfico antes de o
 * mandar para outra pessoa. Sem isto, quem prepara uma reunião tira um print do dashboard e escreve
 * o contexto num email à parte, e o contexto perde-se do documento no primeiro reencaminhamento.
 *
 * Três decisões que valem a pena registar.
 *
 * A anotação prende-se a uma ÂNCORA, que é o `passo_id` do gráfico ou da série, e não a uma
 * posição no ecrã. Coordenadas parecem mais precisas e são mais frágeis: bastava alguém abrir o
 * dashboard num monitor diferente, ou o gráfico mudar de forma, para a nota apontar para o vazio.
 *
 * As anotações são de quem as escreve, não da análise. Duas pessoas podem anotar a mesma análise
 * partilhada sem se pisarem, e ninguém altera o trabalho de outra pessoa: quem escreveu apaga.
 *
 * E ficam FORA de `resultados`. Aquele campo é o registo do que o motor calculou, com proveniência
 * verificável; misturar lá texto escrito à mão apagaria a fronteira entre o que foi medido e o que
 * foi opinado, que é a fronteira que este portal existe para manter visível.
 */

export type Anotacao = {
  id: number
  analise_id: string
  utilizador_id: number
  /** `passo_id` do gráfico, série ou mapa a que a nota se refere. Vazio: nota geral da análise. */
  ancora: string
  texto: string
  autor: string | null
  criado_em: string
}

/** Uma nota é um comentário, não um relatório: o limite existe para o painel continuar legível. */
export const MAX_CARACTERES = 600

let tabelaGarantida = false

async function garantirTabela() {
  if (tabelaGarantida) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS analise_anotacoes (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      analise_id CHAR(12) NOT NULL,
      utilizador_id BIGINT NOT NULL,
      ancora VARCHAR(64) NOT NULL DEFAULT '',
      texto TEXT NOT NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_analise (analise_id),
      INDEX idx_analise_ancora (analise_id, ancora)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  )
  tabelaGarantida = true
}

export async function listarAnotacoes(analiseId: string): Promise<Anotacao[]> {
  await garantirTabela()
  // O nome do autor vem por LEFT JOIN: uma conta apagada não pode fazer desaparecer a nota, que
  // pode ser a única explicação de um número num relatório já distribuído.
  const [linhas] = (await db.execute(
    `SELECT a.id, a.analise_id, a.utilizador_id, a.ancora, a.texto, a.criado_em, u.name AS autor
     FROM analise_anotacoes a
     LEFT JOIN users u ON u.id = a.utilizador_id
     WHERE a.analise_id = ?
     ORDER BY a.criado_em ASC`,
    [analiseId]
  )) as [any[], unknown]
  return linhas.map((l) => ({
    id: Number(l.id),
    analise_id: String(l.analise_id),
    utilizador_id: Number(l.utilizador_id),
    ancora: String(l.ancora || ''),
    texto: String(l.texto || ''),
    autor: l.autor ? String(l.autor) : null,
    criado_em: String(l.criado_em),
  }))
}

export async function criarAnotacao(entrada: {
  analiseId: string
  utilizadorId: number
  ancora: string
  texto: string
}): Promise<number | null> {
  const texto = entrada.texto.trim()
  if (!texto) return null
  await garantirTabela()
  const [r] = (await db.execute(
    `INSERT INTO analise_anotacoes (analise_id, utilizador_id, ancora, texto) VALUES (?, ?, ?, ?)`,
    [entrada.analiseId, entrada.utilizadorId, entrada.ancora.slice(0, 64), texto.slice(0, MAX_CARACTERES)]
  )) as [any, unknown]
  return Number(r?.insertId) || null
}

/**
 * Apaga uma anotação, e só se for de quem pede.
 *
 * A verificação de dono vai no WHERE e não numa leitura prévia seguida de comparação: entre ler e
 * apagar há uma janela, e uma condição na própria instrução não tem janela nenhuma.
 */
export async function apagarAnotacao(id: number, utilizadorId: number): Promise<boolean> {
  await garantirTabela()
  const [r] = (await db.execute(`DELETE FROM analise_anotacoes WHERE id = ? AND utilizador_id = ?`, [
    id,
    utilizadorId,
  ])) as [any, unknown]
  return Number(r?.affectedRows) > 0
}
