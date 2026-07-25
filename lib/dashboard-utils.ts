export const DASHBOARD_CATEGORIES = [
  'Saúde',
  'Educação',
  'Agricultura',
  'Economia',
  'Demografia',
  'Geoespacial',
  'Trabalho',
  'Ambiente',
  'Outros',
] as const

export type DashboardCategory = (typeof DASHBOARD_CATEGORIES)[number]

/** Lista padrão + nomes vindos da BD (admin registra tipo `dashboard` em Category). */
export function mergeDashboardCategorySelectOptions(dbNames: readonly string[]): string[] {
  const base = [...DASHBOARD_CATEGORIES]
  const seen = new Set<string>(base)
  const extra: string[] = []
  for (const raw of dbNames) {
    const n = (raw || '').trim()
    if (!n || seen.has(n)) continue
    seen.add(n)
    extra.push(n)
  }
  extra.sort((a, b) => a.localeCompare(b, 'pt'))
  return [...base, ...extra]
}

/** Normaliza URL para embed em iframe (Power BI, ArcGIS, etc.). */
export function normalizeDashboardEmbedUrl(url: string) {
  try {
    const u = new URL(url.trim())

    if (u.hostname.includes('powerbi.com')) {
      if (!u.searchParams.has('chromeless')) {
        u.searchParams.set('chromeless', 'true')
      }
      return u.toString()
    }

    // ArcGIS Dashboards — ex.: dataformoz.maps.arcgis.com/apps/dashboards/{id}
    if (u.hostname.includes('arcgis.com') && /\/apps\/dashboards\/[a-f0-9]+/i.test(u.pathname)) {
      u.searchParams.set('embed', 'true')
      return u.toString()
    }

    if (u.hostname.includes('arcgis.com') && /\/apps\/(experience|instant|mapviewer)\//i.test(u.pathname)) {
      u.searchParams.set('embed', 'true')
      return u.toString()
    }

    return u.toString()
  } catch {
    return url
  }
}
