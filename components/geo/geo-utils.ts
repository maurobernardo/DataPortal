import type { GeoDataset } from '@/components/geo/types'

export function pickMostPopular(datasets: GeoDataset[]): GeoDataset | null {
  if (!datasets.length) return null
  return [...datasets].sort((a, b) => b.downloads + b.views - (a.downloads + a.views))[0]
}
