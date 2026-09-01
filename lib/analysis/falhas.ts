import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Registo estruturado de falhas do pipeline de análise (PLANO-MOTOR-FINAL.md, secção 3).
 *
 * Antes disto, cada falha ficava só em `logger.error` como texto livre — útil para depurar uma
 * ocorrência isolada, inútil para responder "que tipo de pergunta continua a falhar mais" sem
 * alguém ler logs manualmente. Esta tabela é a base de dados de que a suite de regressão semanal
 * e o painel de falhas (secção 6 do plano) precisam para funcionar sem depender de um utilizador
 * reportar um print de ecrã.
 */

let tabelaGarantida = false

async function garantirTabela() {
  if (tabelaGarantida) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS analise_falhas (
      id INT NOT NULL AUTO_INCREMENT,
      analise_id VARCHAR(40) NOT NULL,
      etapa VARCHAR(40) NULL,
      tipo_erro VARCHAR(80) NULL,
      mensagem TEXT NULL,
      tentativa INT NOT NULL DEFAULT 1,
      criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX analise_falhas_analise_idx (analise_id),
      INDEX analise_falhas_criado_idx (criado_em)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  tabelaGarantida = true
}

/** Extrai a etapa e o tipo de erro da mensagem, quando possível — sem depender de o chamador saber. */
function classificarErro(erro: unknown): { etapa: string | null; tipoErro: string; mensagem: string } {
  const mensagem = erro instanceof Error ? erro.message : String(erro)
  const matchEtapa = mensagem.match(/^Estágio (\w+):/)
  let tipoErro = 'desconhecido'
  if (/truncad/i.test(mensagem)) tipoErro = 'truncagem_tokens'
  else if (/não é JSON válido/i.test(mensagem)) tipoErro = 'json_invalido'
  else if (/depois de várias tentativas/i.test(mensagem)) tipoErro = 'api_indisponivel'
  else if (/Nenhum dos datasets/i.test(mensagem)) tipoErro = 'dados_ilegiveis'
  else if (/Nenhum passo do plano produziu resultados/i.test(mensagem)) tipoErro = 'sem_resultados'
  return { etapa: matchEtapa ? matchEtapa[1] : null, tipoErro, mensagem: mensagem.slice(0, 2000) }
}

/**
 * Regista uma falha do pipeline. Nunca deve impedir o fluxo principal de continuar — uma falha AO
 * registar a falha só fica nos logs do servidor, isolada, tal como o padrão já usado em
 * `lib/audit.ts`.
 */
export async function registarFalhaEstruturada(
  analiseId: string,
  erro: unknown,
  tentativa: number
): Promise<void> {
  try {
    await garantirTabela()
    const { etapa, tipoErro, mensagem } = classificarErro(erro)
    await db.execute(
      'INSERT INTO analise_falhas (analise_id, etapa, tipo_erro, mensagem, tentativa) VALUES (?, ?, ?, ?, ?)',
      [analiseId, etapa, tipoErro, mensagem, tentativa]
    )
  } catch (erroRegisto) {
    logger.error('erro_registar_falha_estruturada', { error: erroRegisto, analiseId })
  }
}

export type FalhaAgregada = {
  tipo_erro: string
  etapa: string | null
  total: number
  ultima_ocorrencia: string
}

/** Para o painel de administração (PLANO-MOTOR-FINAL.md, secção 6): que tipo de falha é mais comum. */
export async function resumoFalhasRecentes(dias = 30): Promise<FalhaAgregada[]> {
  await garantirTabela()
  const janela = Math.min(Math.max(Math.trunc(dias) || 30, 1), 365)
  const [rows] = (await db.execute(
    `SELECT tipo_erro, etapa, COUNT(*) as total, MAX(criado_em) as ultima_ocorrencia
     FROM analise_falhas
     WHERE criado_em >= DATE_SUB(NOW(), INTERVAL ${janela} DAY)
     GROUP BY tipo_erro, etapa
     ORDER BY total DESC`
  )) as [FalhaAgregada[], unknown]
  return rows
}
