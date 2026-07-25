export type PublicReport = {
  id: number
  title: string
  year: string
  coverage: string
  author?: string | null
  partners?: string | null
  detailsText?: string | null
  filePath?: string | null
  fileSize?: string | null
}
