import { db } from '@/lib/db'

/**
 * Limite de análises gratuitas por conta, partilhado entre AI Insights (dados) e a análise de
 * relatórios: uma conta normal tem direito a 2 análises no total, contando as duas frentes juntas
 * — administradores não têm limite nenhum.
 *
 * O que conta como "uma análise":
 *   - Dados: só quando o pipeline chega mesmo a produzir um dashboard (`analises.estado = 'pronto'`).
 *     Uma pergunta que a viabilidade recusa e devolve sugestões alternativas nunca chega a gerar
 *     resultado nenhum (fica noutro estado, nunca 'pronto'), por isso nunca conta — cobrar por uma
 *     tentativa que nem chegou a correr seria punir quem só estava a tactear a pergunta certa.
 *   - Relatórios: sempre que a conta desbloqueia o resumo de um relatório (`relatorio_acesso`),
 *     tanto faz se o digesto foi gerado agora ou já existia de outra pessoa — para quem o lê, é
 *     na mesma "uma análise" que passou a poder ver.
 */
export const LIMITE_ANALISES_GRATIS = 2

export type EstadoLimiteAnalises = {
  usadas: number
  limite: number
  restantes: number
  atingiu: boolean
}

export async function contarAnalisesUsadas(utilizadorId: number): Promise<number> {
  const [linhasDados] = (await db.execute(
    `SELECT COUNT(*) AS n FROM analises WHERE utilizador_id = ? AND estado = 'pronto'`,
    [utilizadorId]
  )) as [{ n: number }[], unknown]
  const [linhasRelatorios] = (await db.execute(
    `SELECT COUNT(DISTINCT report_id) AS n FROM relatorio_acesso WHERE utilizador_id = ?`,
    [utilizadorId]
  )) as [{ n: number }[], unknown]
  return Number(linhasDados[0]?.n ?? 0) + Number(linhasRelatorios[0]?.n ?? 0)
}

/** `ehAdmin` vem sempre de quem chama (a sessão já sabe o papel): administradores nunca são
 *  limitados, por isso nem vale a pena contar nada para eles. */
export async function obterEstadoLimite(utilizadorId: number, ehAdmin: boolean): Promise<EstadoLimiteAnalises> {
  if (ehAdmin) {
    return { usadas: 0, limite: Infinity, restantes: Infinity, atingiu: false }
  }
  const usadas = await contarAnalisesUsadas(utilizadorId)
  const restantes = Math.max(0, LIMITE_ANALISES_GRATIS - usadas)
  return { usadas, limite: LIMITE_ANALISES_GRATIS, restantes, atingiu: usadas >= LIMITE_ANALISES_GRATIS }
}

export const MENSAGEM_LIMITE_ATINGIDO =
  'Já usou as suas 2 análises gratuitas (dados e relatórios contam para o mesmo limite). Contacte a equipa do portal para continuar a analisar.'
