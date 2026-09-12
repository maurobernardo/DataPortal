import { Suspense } from 'react'
import { db, countDatasets, contarServicos } from '@/lib/db'
import { MAP_CATALOG } from '@/lib/maps-catalog'
import { getDatasetPreview } from '@/lib/dataset-preview'
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

/** Contagens REAIS por categoria (todo o catálogo, não só a amostra dos mais vistos que
 *  alimenta o "Catálogo em destaque" abaixo) — sem isto, o separador de uma categoria mostrava
 *  quantos datasets dessa categoria calhavam de estar entre os 30 mais vistos, não quantos
 *  existem a sério no portal (visto ao vivo: "Todos (30)" com o portal a ter 97 datasets). */
async function getContagensPorCategoria(): Promise<Record<string, number>> {
  try {
    const [rows] = (await db.execute(
      `SELECT c.name as nome, COUNT(d.id) as total FROM Dataset d
       JOIN Category c ON c.id = d.categoryId
       GROUP BY c.name`
    )) as any
    const mapa: Record<string, number> = {}
    for (const r of rows) mapa[r.nome] = Number(r.total) || 0
    return mapa
  } catch {
    return {}
  }
}

async function getMostViewedDatasets() {
  try {
    const base = `SELECT d.id, d.title, d.description, d.source, d.format, d.dataType, d.filePath, d.views, d.downloads, d.updatedAt,
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
  const [stats, mostViewed, contagens, contagensPorCategoria] = await Promise.all([
    getStats(),
    getMostViewedDatasets(),
    contarServicos(),
    getContagensPorCategoria(),
  ])

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

  // O cartão de destaque do hero roda entre vários datasets geoespaciais (nunca alfanuméricos:
  // não têm mapa para mostrar), trocando de alguns em alguns minutos no cliente (ver HeroSection).
  // Só a pré-visualização do primeiro é gerada aqui no servidor, reaproveitando o mesmo código que
  // já serve a ficha do dataset; as seguintes são pedidas ao rodar, já do lado do cliente.
  const heroGeoDatasetsOrdenados = heroDatasets.filter((d) => d.dataType === 'geoespacial').slice(0, 8)
  // Ponto de partida ao acaso entre esses candidatos: sem isto, todo F5 reiniciava a página no
  // mesmo dataset (o mais visto), e a rotação só se notava se a pessoa ficasse minutos com a aba
  // aberta — mudar o dataset inicial a cada carregamento é o que dá a sensação de "estar sempre a
  // mudar" mesmo para quem só passa pela home rapidamente.
  const indiceInicial =
    heroGeoDatasetsOrdenados.length > 0 ? Math.floor(Math.random() * heroGeoDatasetsOrdenados.length) : 0
  const heroGeoDatasets =
    indiceInicial > 0
      ? [...heroGeoDatasetsOrdenados.slice(indiceInicial), ...heroGeoDatasetsOrdenados.slice(0, indiceInicial)]
      : heroGeoDatasetsOrdenados
  const destaqueTopo = mostViewed.find((d) => Number(d.id) === heroGeoDatasets[0]?.id)
  let destaquePreview: { geojson: any; bbox: [number, number, number, number] | null } | null = null
  if (destaqueTopo?.filePath) {
    try {
      const preview = await getDatasetPreview(destaqueTopo, { maxFeatures: 200 })
      if ('type' in preview && preview.type === 'geo') {
        destaquePreview = { geojson: preview.geojson, bbox: preview.bbox }
      }
    } catch {
      destaquePreview = null
    }
  }

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
        geoDatasets={heroGeoDatasets}
        destaquePreview={destaquePreview}
      />
      <FeaturedCatalogSection
        datasets={featuredDatasets}
        totalReal={Number(stats.datasets || 0)}
        contagensReaisPorCategoria={contagensPorCategoria}
      />
      <AboutSection
        totalDatasets={Number(stats.datasets || 0)}
        geoespaciais={contagens.geoespaciais}
        alfanumericos={contagens.alfanumericos}
        dashboards={contagens.dashboards}
        mapas={MAP_CATALOG.length}
        relatorios={contagens.relatorios}
      />
      <FeaturesSection />
      <PartnersCarouselSection />
      <FAQSection />
      <Suspense fallback={null}>
        <ContactsSection />
      </Suspense>
    </div>
  )
}