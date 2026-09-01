import { executarPipeline, novoIdAnalise } from './pipeline'
import { compararCorridas } from './comparar-corridas'
import { criarAnalise, guardarResultado, obterAnalise } from './persistencia'
import { obterViva, registarCorrida } from './viva'
import { logger } from '@/lib/logger'

/**
 * Volta a fazer a mesma pergunta, e diz o que mudou.
 *
 * Cria uma análise NOVA em vez de sobrepor a antiga. Substituir a resposta apagaria o histórico, e
 * o histórico é o produto: um relatório distribuído em Março tem de continuar a existir tal como
 * foi distribuído, mesmo depois de a corrida de Abril dizer outra coisa.
 *
 * A comparação é calculada aqui, no momento em que as duas corridas estão ambas à mão, e guardada
 * com a corrida. Calculá-la à leitura obrigaria a carregar duas análises inteiras sempre que
 * alguém abre a página, para chegar quase sempre ao mesmo resultado.
 */
export async function recorrerAnalise(raizId: string): Promise<{
  analiseId: string
  comparacao: ReturnType<typeof compararCorridas>
} | null> {
  const viva = await obterViva(raizId)
  if (!viva) return null

  // Compara-se sempre contra a corrida MAIS RECENTE, não contra a raiz. Contra a raiz, o mesmo
  // "aumento de 12%" reapareceria em todas as corridas seguintes como se fosse notícia nova.
  const anteriorId = viva.ultima_analise_id || raizId
  const anterior = await obterAnalise(anteriorId)
  const raiz = await obterAnalise(raizId)
  if (!raiz) return null

  const novaId = novoIdAnalise()
  await criarAnalise(novaId, raiz.pergunta, raiz.datasets_ids || [], viva.utilizador_id)

  const resultado = await executarPipeline(raiz.pergunta, raiz.datasets_ids || [], () => {}, novaId)
  await guardarResultado(resultado)

  const comparacao = compararCorridas(
    { calcs: (anterior?.resultados as any)?.calcs, series: (anterior?.resultados as any)?.series },
    { calcs: resultado.contexto.calcs as any, series: resultado.contexto.series as any }
  )

  await registarCorrida({
    raizId,
    analiseId: novaId,
    anteriorId: anterior ? anteriorId : null,
    comparacao,
  })

  logger.info('analise_viva_recorrida', {
    raizId,
    novaId,
    comparavel: comparacao.comparavel,
    numeros: comparacao.numeros.length,
    unidades: comparacao.unidades.length,
  })

  return { analiseId: novaId, comparacao }
}
