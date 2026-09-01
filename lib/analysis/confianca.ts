import type { ContextoExecucao } from './executor'
import type { Plano, Suficiencia } from './types'

/**
 * Painel de confiança (PLANO-DATAPROPROMAX.md, Fase 1, item de maior valor por menor esforço).
 *
 * Nenhum número aqui é novo: `confianca_sem_enriquecimento` já vem da Suficiência,
 * `taxa_correspondencia` já vem da ligação geográfica de cada dataset (dados.ts), a completude já
 * vem de `ctx.qualidade` (perfilColuna, corrida durante a execução). O que faltava era juntar
 * estes números dispersos num único bloco visível ao utilizador, em vez de cada um ficar escondido
 * num sítio diferente do pipeline.
 */

export type ConfiancaAnalise = {
  percentagem: number
  datasetsUsados: number
  ligacoesGeograficas: { dataset_id: number; nivel: string; taxa_correspondencia: number }[]
  completudeMediaPct: number | null
  valoresDerivados: number
  passosViaCodigo: number
}

export function calcularConfianca(
  ctx: ContextoExecucao,
  plano: Plano,
  suficiencia: Suficiencia
): ConfiancaAnalise {
  const ligacoesGeograficas = Array.from(ctx.ligacoes.entries())
    .filter((entrada): entrada is [number, NonNullable<(typeof entrada)[1]>] => entrada[1] != null)
    .map(([dataset_id, ligacao]) => ({
      dataset_id,
      nivel: ligacao.nivel,
      taxa_correspondencia: Math.round(ligacao.taxa_correspondencia * 100) / 100,
    }))

  const completudeMediaPct =
    ctx.qualidade.length > 0
      ? Math.round((ctx.qualidade.reduce((s, q) => s + q.completude_pct, 0) / ctx.qualidade.length) * 10) / 10
      : null

  // "Valor derivado": qualquer passo que não leu uma coluna directamente — normalização (taxa,
  // densidade, per_capita, razao_coluna) ou execucao_codigo. Conta quantos números da resposta
  // não estavam já prontos nos dados, tiveram de ser calculados pelo motor.
  const valoresDerivados = plano.passos.filter(
    (p: any) => (p.normalizacao && p.normalizacao !== 'nenhuma') || p.metodo === 'execucao_codigo'
  ).length

  return {
    percentagem: Math.round(suficiencia.confianca_sem_enriquecimento * 100),
    datasetsUsados: ctx.tabelas.size,
    ligacoesGeograficas,
    completudeMediaPct,
    valoresDerivados,
    passosViaCodigo: ctx.codigoExecutado.length,
  }
}
