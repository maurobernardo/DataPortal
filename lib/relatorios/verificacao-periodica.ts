import { obterDigesto, guardarEstadoVerificacao, referenciasVerificacaoPorAntiguidade, type ReferenciaVerificacao } from './persistencia'
import { serieDoPortal } from './dados-portal'
import { verificarAfirmacao } from './verificar-afirmacao'
import { logger } from '@/lib/logger'

/**
 * Repete sozinha, periodicamente, a MESMA comparação que uma pessoa da equipa já fez uma vez em
 * PainelVerificacao.tsx (a referência fica guardada por `guardarReferenciaVerificacao`, chamada a
 * partir da rota /api/reports/[id]/verificar). O valor disto não é verificar pela primeira vez —
 * isso continua a exigir alguém a escolher o dataset certo — é apanhar quando um relatório já
 * validado fica desactualizado PORQUE o dataset de referência mudou depois, sem ninguém pedir uma
 * verificação nova. Sem isto, um relatório podia ficar anos a mostrar "confirmado" mesmo depois de
 * o dado real ter mudado.
 */

export type ResultadoVerificacaoPeriodica = {
  reportId: number
  totalAfirmacoes: number
  totalConfirma: number
  totalDiverge: number
  totalNaoComparavel: number
  erro?: string
}

export async function reverificarRelatorio(ref: ReferenciaVerificacao): Promise<ResultadoVerificacaoPeriodica> {
  const base = { reportId: ref.reportId, totalAfirmacoes: 0, totalConfirma: 0, totalDiverge: 0, totalNaoComparavel: 0 }
  try {
    const digesto = await obterDigesto(ref.reportId, 'pt')
    const afirmacoes = digesto?.afirmacoes_numericas
    if (!Array.isArray(afirmacoes) || afirmacoes.length === 0) {
      return { ...base, erro: 'sem afirmações numéricas' }
    }

    const valoresPortal = await serieDoPortal({
      datasetId: ref.datasetId,
      nivelGeo: ref.nivelGeo,
      colunaMetrica: ref.colunaMetrica,
      colunaIndicador: ref.colunaIndicador,
      valorIndicador: ref.valorIndicador,
      colunaTempo: ref.colunaTempo,
      unidadeMetrica: ref.unidadeMetrica,
      incluirNacional: true,
    })
    if (valoresPortal.length === 0) {
      return { ...base, totalAfirmacoes: afirmacoes.length, totalNaoComparavel: afirmacoes.length, erro: 'dataset de referência sem valores ligáveis' }
    }

    let confirma = 0
    let diverge = 0
    let naoComparavel = 0
    for (const a of afirmacoes) {
      const veredicto = verificarAfirmacao(a, valoresPortal)
      if (veredicto.estado === 'confirma') confirma++
      else if (veredicto.estado === 'diverge') diverge++
      else naoComparavel++
    }

    const resumo = {
      totalAfirmacoes: afirmacoes.length,
      totalConfirma: confirma,
      totalDiverge: diverge,
      totalNaoComparavel: naoComparavel,
      estado: diverge > 0 ? ('divergente' as const) : ('ok' as const),
    }
    await guardarEstadoVerificacao(ref.reportId, resumo)
    return { ...base, ...resumo }
  } catch (erro: any) {
    logger.error('erro_reverificar_relatorio', { error: erro, reportId: ref.reportId })
    return { ...base, erro: 'falha inesperada' }
  }
}

export async function processarLote(quantos: number): Promise<ResultadoVerificacaoPeriodica[]> {
  const referencias = await referenciasVerificacaoPorAntiguidade(quantos)
  const resultados: ResultadoVerificacaoPeriodica[] = []
  for (const ref of referencias) resultados.push(await reverificarRelatorio(ref))
  return resultados
}
