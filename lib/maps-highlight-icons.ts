import {
  ArrowUpDown,
  BarChart3,
  CircleCheck,
  Filter,
  Gauge,
  Layers,
  LayoutGrid,
  LineChart,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'

/**
 * Mapeia o texto de uma capacidade (map.highlights) para um ícone específico do seu conteúdo —
 * antes disto, todos os itens da lista usavam o mesmo ícone de gráfico de barras, sem relação
 * nenhuma com o que estava escrito ao lado (ex.: "Camadas GIS" e "Ranking de variação" com o
 * mesmo símbolo). Regras por palavra-chave, na ordem em que devem ser testadas — mais específico
 * primeiro, para "KPI" não cair na regra genérica de "filtro" quando a frase tem as duas.
 */
const REGRAS_ICONE_CAPACIDADE: { match: RegExp; icon: LucideIcon }[] = [
  { match: /\bkpi/i, icon: Gauge },
  { match: /série temporal|tendência|evoluç/i, icon: LineChart },
  { match: /mosaico|matriz/i, icon: LayoutGrid },
  { match: /ranking|prioridade|top-?\d/i, icon: ArrowUpDown },
  { match: /filtro|cross-filter|cruzad/i, icon: Filter },
  { match: /camada|gis|tile|leaflet|hotspot/i, icon: Layers },
  { match: /gráfico|scatter|tensão|vintage/i, icon: BarChart3 },
  { match: /vari[aá]ve|composta/i, icon: SlidersHorizontal },
]

export function iconeParaCapacidade(texto: string): LucideIcon {
  for (const regra of REGRAS_ICONE_CAPACIDADE) {
    if (regra.match.test(texto)) return regra.icon
  }
  return CircleCheck
}
