import { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { getSiteUrl } from '@/lib/site'

const staticPages: Array<{
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}> = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/dados-espaciais', changeFrequency: 'daily', priority: 0.95 },
  { path: '/dados-alfanumericos', changeFrequency: 'daily', priority: 0.95 },
  { path: '/dashboards-alfanumericos', changeFrequency: 'weekly', priority: 0.85 },
  { path: '/maps', changeFrequency: 'weekly', priority: 0.85 },
  { path: '/maps/mapa-de-saude', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/maps/diagnostico-rede-postes', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/maps/malaria-geografia-2015-2018', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/maps/feederpulse-mz', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/catalogo', changeFrequency: 'daily', priority: 0.9 },
  { path: '/relatorios', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/ai-insights', changeFrequency: 'weekly', priority: 0.88 },
  { path: '/politica-cookies', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/termos-condicoes', changeFrequency: 'yearly', priority: 0.4 },
]

async function datasetEntries(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const [rows] = (await db.execute(
      'SELECT id, updatedAt FROM Dataset ORDER BY updatedAt DESC'
    )) as any
    const list = (rows ?? []) as { id: number; updatedAt?: Date | string | null }[]
    return list.map((r) => ({
      url: `${baseUrl}/dataset/${r.id}`,
      lastModified: r.updatedAt ? new Date(r.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }))
  } catch {
    return []
  }
}

async function reportEntries(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const [rows] = (await db.execute(
      'SELECT id, updatedAt, createdAt FROM Report ORDER BY COALESCE(updatedAt, createdAt) DESC'
    )) as any
    const list = (rows ?? []) as { id: number; updatedAt?: Date | string | null; createdAt?: Date | string | null }[]
    return list.map((r) => ({
      url: `${baseUrl}/relatorios/${r.id}`,
      lastModified: r.updatedAt ? new Date(r.updatedAt) : r.createdAt ? new Date(r.createdAt) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = staticPages.map(
    ({ path, changeFrequency, priority }) => ({
      url: `${baseUrl}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })
  )

  const datasets = await datasetEntries(baseUrl)
  const reports = await reportEntries(baseUrl)

  return [...staticEntries, ...datasets, ...reports]
}
