export type MapKind = 'health' | 'poles' | 'malaria' | 'feeder' | 'cereals'

/** Tipo de experiência publicada no catálogo */
export type MapExperienceType = 'map' | 'dashboard' | 'map-dashboard'

export const MAP_EXPERIENCE_LABELS: Record<
  MapExperienceType,
  { label: string; short: string; description: string }
> = {
  map: {
    label: 'Mapa interactivo',
    short: 'Mapa',
    description: 'Exploração geográfica com camadas e legenda',
  },
  dashboard: {
    label: 'Dashboard analítico',
    short: 'Dashboard',
    description: 'Indicadores, gráficos e filtros sem mapa principal',
  },
  'map-dashboard': {
    label: 'Mapa + dashboard',
    short: 'Mapa & dashboard',
    description: 'Mapa interactivo integrado com painéis analíticos',
  },
}

export type PublicMapDashboard = {
  slug: string
  title: string
  subtitle: string
  description: string
  coverage: string
  category: string
  badges: string[]
  kind: MapKind
  experienceType: MapExperienceType
  /** Destaques curtos no card e no hero (máx. 3) */
  highlights?: string[]
  /** Caminho público dos dados (GeoJSON ou JSON) */
  dataPath: string
  /** Caminho opcional para miniatura no card */
  previewImagePath?: string | null
  featured?: boolean
  /** Estatística destacada no hero do catálogo */
  heroStat?: { value: string; label: string }
}

/** Catálogo de mapas interactivos publicados no portal */
export const MAP_CATALOG: PublicMapDashboard[] = [
  {
    slug: 'mapa-de-saude',
    title: 'Mapa Inteligente de Saúde Pública em Moçambique',
    subtitle: 'Postos administrativos ADM3 · 20 variáveis compostas · Camada GIS',
    description:
      'Inteligência de saúde ligada a GIS ao nível do posto administrativo de Moçambique (~204 unidades), com 20 variáveis compostas de saúde desagregadas a partir de fontes provinciais. Coordenadas representam centroides aproximados (WGS84).',
    coverage: 'Moçambique: 11 províncias, 204 postos ADM3',
    category: 'Saúde',
    badges: ['204 Postos Admin.', '20 Variáveis', '11 Províncias'],
    kind: 'health',
    experienceType: 'map-dashboard',
    highlights: [
      'Camadas GIS e tiles OpenStreetMap',
      '20 variáveis compostas por posto ADM3',
      'Painel de estatísticas por posto',
    ],
    dataPath: '/data/health-adm3.geojson',
    featured: false,
    heroStat: { value: '204', label: 'Postos ADM3' },
  },
  {
    slug: 'diagnostico-rede-postes',
    title: 'Análise e Diagnóstico da Infraestrutura Elétrica',
    subtitle: 'Mapa geoespacial · KPIs · Cross-filter · Exportação CSV',
    description:
      'Dashboard interactivo do levantamento de postes: mapa com estado e material, KPIs clicáveis, filtros cruzados, matriz material×estado, hotspots de defeitos e exportação dos postes de maior risco.',
    coverage: 'Moçambique: Manica, Maputo Cidade, Maputo Província, Nampula',
    category: 'Infraestrutura',
    badges: ['3 911 Postes', '4 Províncias', 'Campo 2025'],
    kind: 'poles',
    experienceType: 'map-dashboard',
    highlights: [
      'Mapa Leaflet com hotspots de defeitos',
      'KPIs clicáveis e filtros cruzados',
      'Matriz material×estado e top-20 risco',
    ],
    dataPath: '/data/poles-network.json',
    featured: false,
    heroStat: { value: '3 911', label: 'Postes levantados' },
  },
  {
    slug: 'malaria-geografia-2015-2018',
    title: 'Série Temporal e Geográfica de Incidência de Malária em Moçambique',
    subtitle: 'IMASIDA 2015 · IIM 2018 · Prevalência provincial RDT',
    description:
      'Dashboard analítico da prevalência de malária em crianças 6–59 meses: comparação IMASIDA 2015 com IIM 2018 por província, mosaico geográfico, ranking de variação e série temporal com contexto nacional.',
    coverage: 'Moçambique: 11 províncias',
    category: 'Saúde',
    badges: ['11 Províncias', 'IMASIDA 2015', 'IIM 2018'],
    kind: 'malaria',
    experienceType: 'map-dashboard',
    highlights: [
      'Série temporal 2015→2018 por província',
      'Mosaico geográfico e ranking de variação',
      'Modos carga 2018 vs. mudança provincial',
    ],
    dataPath: '/data/malaria-provinces.json',
    featured: true,
    heroStat: { value: '11', label: 'Províncias' },
  },
  {
    slug: 'feederpulse-mz',
    title: 'A Rede eléctrica por detrás do crescimento de Moçambique',
    subtitle: '25 alimentadores · Risco ciclónico · Idade da infra · Prioridade CAPEX',
    description:
      'Dashboard de inteligência energética sobre a rede de distribuição: mapa interactivo de alimentadores de média tensão, KPIs de clientes e transformadores, análise de risco ciclónico vs. vintage da infraestrutura e ranking de prioridade de investimento.',
    coverage: 'Moçambique: 11 províncias (amostra 25 alimentadores)',
    category: 'Energia',
    badges: ['25 Alimentadores', '93 130 Clientes', '748 km MV'],
    kind: 'feeder',
    experienceType: 'map-dashboard',
    highlights: [
      'Mapa Leaflet com risco ciclónico por alimentador',
      'Quatro gráficos: província, scatter, tensão, vintage',
      'Top-10 prioridade CAPEX (~USD 180M)',
    ],
    dataPath: '/data/feeder-pulse.json',
    featured: false,
    heroStat: { value: '25', label: 'Alimentadores (amostra)' },
  },
  {
    slug: 'producao-cereais',
    title: 'Produção de Cereais por Província em Moçambique',
    subtitle: 'Milho, arroz, sorgo e milheto · 12 rondas do IAI/TIA 2002–2023',
    description:
      'Dashboard analítico da produção de cereais por província: mapa coroplético com símbolos proporcionais, mistura de culturas, radar comparando as rondas do Inquérito Agrário Integrado e ranking de ganhos e perdas entre rondas consecutivas.',
    coverage: 'Moçambique: 10 províncias, 12 rondas do IAI/TIA (2002–2023)',
    category: 'Agricultura',
    badges: ['10 Províncias', '12 Rondas 2002–2023', '4 Culturas'],
    kind: 'cereals',
    experienceType: 'map-dashboard',
    highlights: [
      'Mapa coroplético com símbolos proporcionais',
      'Mistura de culturas e radar por ronda do inquérito',
      'Ranking de ganhos e perdas entre rondas',
    ],
    dataPath: '/data/cereal-production-series.json',
    featured: false,
    heroStat: { value: '12', label: 'Rondas do inquérito' },
  },
]

export function findMapBySlug(slug: string): PublicMapDashboard | undefined {
  return MAP_CATALOG.find((m) => m.slug === slug)
}

export function findFeaturedMaps(): PublicMapDashboard[] {
  return MAP_CATALOG.filter((m) => m.featured)
}

/** Forma mínima de uma linha de MapOverride (lib/db.ts) — evita import de tipos de BD aqui. */
export type MapOverrideLike = {
  slug: string
  title?: string | null
  subtitle?: string | null
  description?: string | null
  coverage?: string | null
  category?: string | null
  badgesJson?: string | null
  highlightsJson?: string | null
  featured?: number | boolean | null
  heroStatValue?: string | null
  heroStatLabel?: string | null
}

/**
 * Aplica sobreposições editáveis via admin sobre o catálogo estático. Campos NULL/omitidos na
 * sobreposição mantêm o valor por defeito do código — não é possível criar novos "tipos" de
 * mapa por aqui, só editar metadados dos já existentes.
 */
export function applyMapOverrides(
  base: PublicMapDashboard[],
  overrides: MapOverrideLike[]
): PublicMapDashboard[] {
  const bySlug = new Map(overrides.map((o) => [o.slug, o]))
  return base.map((map) => {
    const o = bySlug.get(map.slug)
    if (!o) return map
    let badges = map.badges
    if (o.badgesJson) {
      try {
        const parsed = JSON.parse(o.badgesJson)
        if (Array.isArray(parsed)) badges = parsed
      } catch {
        /* ignora JSON inválido */
      }
    }
    let highlights = map.highlights
    if (o.highlightsJson) {
      try {
        const parsed = JSON.parse(o.highlightsJson)
        if (Array.isArray(parsed)) highlights = parsed
      } catch {
        /* ignora JSON inválido */
      }
    }
    return {
      ...map,
      title: o.title || map.title,
      subtitle: o.subtitle || map.subtitle,
      description: o.description || map.description,
      coverage: o.coverage || map.coverage,
      category: o.category || map.category,
      badges,
      highlights,
      featured: o.featured == null ? map.featured : Boolean(o.featured),
      heroStat: o.heroStatValue
        ? { value: o.heroStatValue, label: o.heroStatLabel || map.heroStat?.label || '' }
        : map.heroStat,
    }
  })
}
