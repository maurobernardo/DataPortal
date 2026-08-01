import { Flame, TrendingUp } from 'lucide-react'
import type { GeoDataset } from '@/components/geo/types'

export function pickMostPopular(datasets: GeoDataset[]): GeoDataset | null {
  if (!datasets.length) return null
  return [...datasets].sort((a, b) => b.downloads + b.views - (a.downloads + a.views))[0]
}

/** Níveis de popularidade por número de visualizações — usado nos badges "Popular" dos cards de dataset. */
export const POPULARITY_TIERS = [
  { min: 1000, key: 'viral', label: 'Viral', icon: Flame },
  { min: 500, key: 'super', label: 'Super popular', icon: Flame },
  { min: 100, key: 'very', label: 'Muito popular', icon: TrendingUp },
  { min: 50, key: 'popular', label: 'Popular', icon: TrendingUp },
] as const

export function getPopularityTier(views: number) {
  return POPULARITY_TIERS.find((tier) => views >= tier.min) ?? null
}
