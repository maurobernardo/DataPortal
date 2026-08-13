import type { Arquetipo } from './types'

/**
 * Compositor de dashboards (Parte 12).
 *
 * Escopo real desta implementação: varia a ORDEM dos blocos de conteúdo consoante o arquétipo
 * que a Compreensão já infere (compreensao.arquetipo_sugerido), e omite blocos sem dados em vez
 * de mostrar uma secção vazia. Não implementa os 4 temas de cor nem a variação de hero da
 * especificação completa (Parte 13): isso exigiria um sistema de temas que ainda não existe no
 * portal e seria pior meio-feito do que ausente. R5 pede duas coisas, "layout" e "tema"; aqui só
 * a primeira está feita.
 */

export type BlocoConteudo = 'resposta' | 'mapa' | 'graficos' | 'o_que_mostram' | 'porque'

export type DashboardSpec = {
  arquetipo: string
  ordem: BlocoConteudo[]
}

const TODOS_OS_BLOCOS: BlocoConteudo[] = ['resposta', 'mapa', 'graficos', 'o_que_mostram', 'porque']

/**
 * Ordem por arquétipo: o que deve aparecer primeiro depende do tipo de pergunta.
 * - geoespacial/ranking: o mapa é a resposta, vem logo a seguir à resposta directa.
 * - comparativo/temporal: o gráfico é o argumento central, antes do mapa.
 * - diagnostico: o raciocínio ("o que mostram" + "porquê") importa mais do que a superfície
 *   visual, por isso vem antes de mapa/gráficos.
 * - outros (exploratorio, descritiva, preditiva, ...): ordem por defeito, resposta -> mapa ->
 *   gráficos -> texto.
 */
const ORDEM_POR_ARQUETIPO: Partial<Record<Arquetipo, BlocoConteudo[]>> = {
  geoespacial: ['resposta', 'mapa', 'o_que_mostram', 'graficos', 'porque'],
  ranking: ['resposta', 'mapa', 'graficos', 'o_que_mostram', 'porque'],
  comparativo: ['resposta', 'graficos', 'mapa', 'o_que_mostram', 'porque'],
  temporal: ['resposta', 'graficos', 'o_que_mostram', 'mapa', 'porque'],
  diagnostico: ['resposta', 'o_que_mostram', 'porque', 'mapa', 'graficos'],
}

export function compor(
  arquetipo: Arquetipo | string,
  disponiveis: { mapa: boolean; graficos: boolean }
): DashboardSpec {
  const base = ORDEM_POR_ARQUETIPO[arquetipo as Arquetipo] || TODOS_OS_BLOCOS
  const ordem = base.filter((b) => {
    if (b === 'mapa') return disponiveis.mapa
    if (b === 'graficos') return disponiveis.graficos
    return true
  })
  return { arquetipo, ordem }
}
