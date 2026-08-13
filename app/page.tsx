import { Suspense } from 'react'
import { db, countDatasets } from '@/lib/db'
import { HeroSection } from '@/components/HeroSection'
import { FeaturedCatalogSection } from '@/components/FeaturedCatalogSection'
import { AboutSection } from '@/components/AboutSection'
import { FeaturesSection } from '@/components/FeaturesSection'
import { FAQSection } from '@/components/FAQSection'
import { PartnersCarouselSection } from '@/components/PartnersCarouselSection'
import { ContactsSection } from '@/components/ContactsSection'

export const dynamic = 'force-dynamic'

async function getStats() {
  try {
    const [totalDatasets, sums, orgRows] = await Promise.all([
      countDatasets(),
      (async () => {
        const [rows] = await db.execute(
          'SELECT COALESCE(SUM(views), 0) as views, COALESCE(SUM(downloads), 0) as downloads FROM Dataset'
        ) as any
        return rows[0] || { views: 0, downloads: 0 }
      })(),
      (async () => {
        const [rows] = await db.execute(
          'SELECT COUNT(DISTINCT source) as organizations FROM Dataset WHERE source IS NOT NULL AND source != ""'
        ) as any
        return rows[0] || { organizations: 0 }
      })(),
    ])

    return {
      datasets: totalDatasets,
      views: sums.views || 0,
      downloads: sums.downloads || 0,
      organizations: orgRows.organizations || 0,
    }
  } catch (error) {
    return { datasets: 0, views: 0, downloads: 0, organizations: 0 }
  }
}

async function getMostViewedDatasets() {
  try {
    const base = `SELECT d.id, d.title, d.description, d.source, d.format, d.dataType, d.views, d.downloads, d.updatedAt,
              c.name as categoryName
       FROM Dataset d
       LEFT JOIN Category c ON c.id = d.categoryId`
    const [geoRows] = await db.execute(
      `${base} WHERE d.dataType = 'geoespacial' ORDER BY d.views DESC, d.downloads DESC LIMIT 18`
    ) as any
    const [alfRows] = await db.execute(
      `${base} WHERE d.dataType = 'alfanumerico' ORDER BY d.views DESC, d.downloads DESC LIMIT 18`
    ) as any
    const geo = Array.isArray(geoRows) ? geoRows : []
    const alf = Array.isArray(alfRows) ? alfRows : []
    const merged = [...geo, ...alf].sort(
      (a: any, b: any) =>
        (Number(b.views) || 0) - (Number(a.views) || 0) ||
        (Number(b.downloads) || 0) - (Number(a.downloads) || 0)
    )
    return merged.slice(0, 30) as any[]
  } catch {
    return []
  }
}

export default async function Home() {
  const [stats, mostViewed] = await Promise.all([getStats(), getMostViewedDatasets()])

  const heroDatasets = mostViewed.map((dataset) => ({
    id: Number(dataset.id),
    title: dataset.title || 'Dataset sem título',
    source: dataset.source || null,
    format: dataset.format || null,
    views: Number(dataset.views || 0),
    updatedAt: dataset.updatedAt ? new Date(dataset.updatedAt).toISOString() : null,
    category: dataset.categoryName || null,
    dataType: dataset.dataType === 'geoespacial' ? ('geoespacial' as const) : ('alfanumerico' as const),
  }))

  const featuredDatasets = mostViewed.map((dataset) => ({
    id: Number(dataset.id),
    title: dataset.title || 'Dataset sem título',
    description: dataset.description || 'Sem descrição disponível.',
    updated: dataset.updatedAt
      ? new Date(dataset.updatedAt).toLocaleDateString('pt-BR')
      : 'Sem data',
    downloads: Number(dataset.downloads || 0),
    views: Number(dataset.views || 0),
    format: dataset.format || 'Dados',
    source: dataset.source || 'Portal',
    category: dataset.categoryName || 'Geral',
    dataType:
      dataset.dataType === 'geoespacial'
        ? ('geoespacial' as const)
        : ('alfanumerico' as const),
  }))

  return (
    <div className="overflow-x-hidden">
      <HeroSection
        statsData={{
          datasets: Number(stats.datasets || 0),
          organizations: Number(stats.organizations || 0),
          downloads: Number(stats.downloads || 0),
          views: Number(stats.views || 0),
        }}
        highlightedDatasets={heroDatasets}
      />
      <FeaturedCatalogSection datasets={featuredDatasets} />
      <AboutSection />
      <FeaturesSection />
      <PartnersCarouselSection />
      <FAQSection />
      <Suspense fallback={null}>
        <ContactsSection />
      </Suspense>
    </div>
  )
}