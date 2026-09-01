import type { Digesto } from './digesto'

/**
 * A linha do tempo dos achados de um relatório, montada a partir do que já está no digesto.
 *
 * Junta duas fontes que já existem por razões diferentes: os `achados` com um "ano" datado (a
 * maioria não tem, e fica de fora), e as `afirmacoes_numericas` (que já trazem período). As duas
 * juntas dão uma sequência cronológica mais rica do que qualquer uma sozinha, sem pedir mais nada
 * ao modelo além do campo "ano" que `achados` já ganhou.
 *
 * Só aparece quando há pelo menos dois pontos datados: um só ano não é uma linha do tempo, é uma
 * data solta, e a tabela de dados ou o próprio achado já a mostram.
 */

export type EventoLinhaTempo = {
  ano: number
  texto: string
  pagina: number
  tipo: 'achado' | 'dado'
}

const MINIMO_EVENTOS = 2

export function construirLinhaTempo(
  digesto: Pick<Digesto, 'achados' | 'afirmacoes_numericas'>
): EventoLinhaTempo[] {
  const eventos: EventoLinhaTempo[] = []

  for (const a of digesto.achados) {
    if (a.ano != null) eventos.push({ ano: a.ano, texto: a.texto, pagina: a.pagina, tipo: 'achado' })
  }

  for (const af of digesto.afirmacoes_numericas) {
    const ano = af.periodo_fim ?? af.periodo_inicio
    if (ano != null) eventos.push({ ano, texto: af.texto, pagina: af.pagina, tipo: 'dado' })
  }

  if (eventos.length < MINIMO_EVENTOS) return []

  return eventos.sort((a, b) => a.ano - b.ano)
}
