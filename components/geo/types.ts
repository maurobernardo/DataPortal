export type GeoDataset = {
  id: number
  title: string
  description: string
  source: string
  year: number
  format: string
  fileSize?: string | null
  filePath?: string | null
  views: number
  downloads: number
  keywords: string | null
  geometry?: string | null
  coverage?: string | null
  minimumUnit?: string | null
  previewAvailable?: number | boolean | null
  bboxMinX?: number | null
  bboxMinY?: number | null
  bboxMaxX?: number | null
  bboxMaxY?: number | null
  category: {
    id: number
    name: string
  }
}
