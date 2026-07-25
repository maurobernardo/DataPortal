import { MAP_CATALOG } from '@/lib/maps-catalog'

export type PortalSearchEntry = { label: string; href: string; kind?: string }

/** Chips «Tente:» na home — vários módulos do portal */
export const HERO_TRY_SUGGESTIONS: PortalSearchEntry[] = [
  {
    label: 'aeroportos nacionais',
    href: `/dados-espaciais?search=${encodeURIComponent('aeroportos nacionais')}`,
    kind: 'geoespacial',
  },
  {
    label: 'mapa de saúde ADM3',
    href: '/maps/mapa-de-saude',
    kind: 'mapa',
  },
  {
    label: 'malária 2015–2018',
    href: '/maps/malaria-geografia-2015-2018',
    kind: 'mapa',
  },
  {
    label: 'dashboards alfanuméricos',
    href: `/dashboards-alfanumericos?search=${encodeURIComponent('indicadores')}`,
    kind: 'dashboard',
  },
  {
    label: 'diagnóstico rede de postes',
    href: '/maps/diagnostico-rede-postes',
    kind: 'mapa',
  },
  {
    label: 'FeederPulse energia',
    href: '/maps/feederpulse-mz',
    kind: 'mapa',
  },
  {
    label: 'relatórios e estudos',
    href: `/relatorios?search=${encodeURIComponent('relatório')}`,
    kind: 'relatorio',
  },
  {
    label: 'limites administrativos',
    href: `/dados-espaciais?search=${encodeURIComponent('limites administrativos')}`,
    kind: 'geoespacial',
  },
]

function matchesQuery(text: string, q: string) {
  return text.toLowerCase().includes(q)
}

/** Mapas & dashboards publicados (catálogo estático) */
export function searchMapCatalog(q: string, limit = 4): PortalSearchEntry[] {
  const out: PortalSearchEntry[] = []
  for (const m of MAP_CATALOG) {
    const hay = `${m.title} ${m.subtitle} ${m.category} ${m.description} ${m.coverage}`.toLowerCase()
    if (!matchesQuery(hay, q)) continue
    out.push({
      label: m.title,
      href: `/maps/${m.slug}`,
      kind: 'mapa',
    })
    if (out.length >= limit) break
  }
  return out
}

/** Secções do portal (atalhos quando o termo é genérico) */
export function searchPortalSections(q: string): PortalSearchEntry[] {
  const sections: PortalSearchEntry[] = [
    {
      label: 'Catálogo geoespacial',
      href: `/dados-espaciais?search=${encodeURIComponent(q)}`,
      kind: 'geoespacial',
    },
    {
      label: 'Catálogo alfanumérico',
      href: `/dados-alfanumericos?search=${encodeURIComponent(q)}`,
      kind: 'alfanumerico',
    },
    {
      label: 'Dashboards alfanuméricos',
      href: `/dashboards-alfanumericos?search=${encodeURIComponent(q)}`,
      kind: 'dashboard',
    },
    {
      label: 'Mapas inteligentes',
      href: `/maps`,
      kind: 'mapa',
    },
    {
      label: 'Relatórios publicados',
      href: `/relatorios?search=${encodeURIComponent(q)}`,
      kind: 'relatorio',
    },
  ]

  const triggers: Record<string, string[]> = {
    geoespacial: ['geo', 'mapa', 'camada', 'shp', 'espacial', 'territ'],
    alfanumerico: ['alfan', 'csv', 'excel', 'indicador', 'tabela', 'serie'],
    dashboard: ['dashboard', 'painel', 'power bi', 'arcgis'],
    mapa: ['mapa inteligente', 'leaflet', 'poste', 'saúde adm', 'cross-filter', 'hotspot'],
    relatorio: ['relat', 'estudo', 'publicaç', 'pdf', 'documento'],
  }

  const matched = new Set<string>()
  for (const [kind, words] of Object.entries(triggers)) {
    if (words.some((w) => q.includes(w))) matched.add(kind)
  }

  if (matched.size === 0) return []

  return sections.filter((s) => s.kind && matched.has(s.kind)).slice(0, 3)
}

export function mergeSearchEntries(
  ...groups: PortalSearchEntry[][]
): PortalSearchEntry[] {
  const seen = new Set<string>()
  const out: PortalSearchEntry[] = []
  for (const group of groups) {
    for (const e of group) {
      const key = `${e.href}|${e.label.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(e)
    }
  }
  return out
}
