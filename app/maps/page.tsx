import { applyMapOverrides, MAP_CATALOG } from '@/lib/maps-catalog'
import { MapCatalogHeroVisual } from '@/components/maps/MapCatalogHeroVisual'
import { MapsCatalogGrid } from '@/components/maps/MapsCatalogGrid'
import { RecentlyViewedRail } from '@/components/RecentlyViewedRail'
import { getCurrentUser } from '@/lib/auth'
import { findAllMapOverrides, findEntityFavoriteIds, getMapViewCounts } from '@/lib/db'
import { obterPreviewParaMapa, type PreviewMapa } from '@/lib/maps-preview-data'
import '../maps-catalog.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mapas inteligentes | Portal de Dados',
  description:
    'Catálogo de mapas interactivos e dashboards analíticos do Portal de Dados: exploração territorial, KPIs e filtros em Moçambique.',
}

export default async function MapsCatalogPage() {
  const session = await getCurrentUser()
  const [favoriteIds, viewCounts, overrides] = await Promise.all([
    session ? findEntityFavoriteIds(session.userId, 'map') : Promise.resolve([]),
    getMapViewCounts(),
    findAllMapOverrides(),
  ])
  const favoriteIdSet = new Set(favoriteIds)
  const maps = applyMapOverrides(MAP_CATALOG, overrides)
  const heroMap = maps.find((m) => m.featured) ?? maps[0]
  const mapDashboardCount = maps.filter((m) => m.experienceType === 'map-dashboard').length

  // Prévia real (pontos reais projectados, coloridos por dados reais do próprio mapa) — para o
  // hero E para cada card do grid, nunca um ícone decorativo genérico. Uma função por tipo em
  // lib/maps-preview-data.ts; despachada aqui, no Server Component, porque MapsCatalogGrid e
  // MapCard são Client Components e não podem ler ficheiros do disco directamente.
  const previewsPorSlug: Record<string, PreviewMapa | null> = {}
  await Promise.all(
    maps.map(async (m) => {
      previewsPorSlug[m.slug] = await obterPreviewParaMapa(m.kind)
    })
  )
  const previewMapa = heroMap ? previewsPorSlug[heroMap.slug] ?? null : null

  return (
    <div className="mp-page">
      <section className="mp-hero">
        <div className="mp-hero-inner">
          <div>
            <div className="mp-eyebrow">Mapas inteligentes · Inteligência geográfica</div>
            <h1>
              Do território aos <span className="accent">indicadores.</span>
            </h1>
            <p className="mp-hero-lede">
              Não são apenas mapas: cada publicação combina exploração geográfica com painéis
              analíticos: KPIs, gráficos, filtros cruzados e detalhe por unidade territorial.
            </p>
            <div className="mp-hero-stats">
              <div>
                <strong>{maps.length}</strong>
                <span>Experiências publicadas</span>
              </div>
              <div>
                <strong>{mapDashboardCount}</strong>
                <span>Mapa + dashboard</span>
              </div>
              {heroMap?.heroStat && (
                <div>
                  <strong>{heroMap.heroStat.value}</strong>
                  <span>{heroMap.heroStat.label}</span>
                </div>
              )}
            </div>
          </div>

          {heroMap ? <MapCatalogHeroVisual map={heroMap} preview={previewMapa} /> : null}
        </div>
      </section>

      <section className="mp-gallery">
        <div className="mp-section-inner">
          <div className="mp-gallery-head">
            <h2>Mapas inteligentes disponíveis</h2>
            <p>
              Cada card indica o tipo de experiência (mapa interactivo, dashboard ou ambos)
              antes de abrir a exploração completa.
            </p>
          </div>
          <RecentlyViewedRail dataType="map" />
          <MapsCatalogGrid maps={maps} favoriteIds={favoriteIdSet} viewCounts={viewCounts} previews={previewsPorSlug} />
        </div>
      </section>
    </div>
  )
}
