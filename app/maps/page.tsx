import { MAP_CATALOG } from '@/lib/maps-catalog'
import { MapCard } from '@/components/maps/MapCard'
import { MapCatalogHeroVisual } from '@/components/maps/MapCatalogHeroVisual'
import '../maps-catalog.css'

export const metadata = {
  title: 'Mapas inteligentes | Portal de Dados',
  description:
    'Catálogo de mapas interactivos e dashboards analíticos do Portal de Dados — exploração territorial, KPIs e filtros em Moçambique.',
}

export default function MapsCatalogPage() {
  const maps = MAP_CATALOG
  const heroMap = maps.find((m) => m.featured) ?? maps[0]
  const mapDashboardCount = maps.filter((m) => m.experienceType === 'map-dashboard').length

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
              analíticos — KPIs, gráficos, filtros cruzados e detalhe por unidade territorial.
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
              {maps
                .map((m) => m.heroStat)
                .filter((s): s is NonNullable<typeof s> => Boolean(s))
                .slice(0, 1)
                .map((stat) => (
                  <div key={stat.label}>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
            </div>
          </div>

          {heroMap ? <MapCatalogHeroVisual map={heroMap} /> : null}
        </div>
      </section>

      <section className="mp-gallery">
        <div className="mp-section-inner">
          <div className="mp-gallery-head">
            <h2>Mapas inteligentes disponíveis</h2>
            <p>
              Cada card indica o tipo de experiência — mapa interactivo, dashboard ou ambos —
              antes de abrir a exploração completa.
            </p>
          </div>
          <div className="mp-gallery-grid">
            {maps.map((map) => (
              <MapCard key={map.slug} map={map} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
