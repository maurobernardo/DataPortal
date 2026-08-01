export type RecentlyViewedEntry = {
  id: number | string
  title: string
  href: string
  dataType: string
  viewedAt: number
}

const STORAGE_KEY = 'dataportal.recently-viewed'
const MAX_ENTRIES = 8

export function getRecentlyViewed(): RecentlyViewedEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function pushRecentlyViewed(entry: Omit<RecentlyViewedEntry, 'viewedAt'>) {
  if (typeof window === 'undefined') return
  try {
    const current = getRecentlyViewed().filter((e) => e.id !== entry.id)
    current.unshift({ ...entry, viewedAt: Date.now() })
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(0, MAX_ENTRIES)))
  } catch {
    /* localStorage indisponível (modo privado, quota) — ignora silenciosamente */
  }
}
