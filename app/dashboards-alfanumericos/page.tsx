import { findAllAlphanumericDashboards, findTopAlphanumericDashboardsByViews } from '@/lib/db'
import { DashboardFeatured } from '@/components/dashboards/DashboardFeatured'
import { DashboardGallery } from '@/components/dashboards/DashboardGallery'
import { DashboardStaticSections } from '@/components/dashboards/DashboardStaticSections'
import { DashboardCardPreview } from '@/components/dashboards/DashboardCardPreview'
import '../dashboards-catalog.css'

export const dynamic = 'force-dynamic'

export default async function AlphanumericDashboardsPage() {
  const [dashboards, featured] = await Promise.all([
    findAllAlphanumericDashboards(),
    findTopAlphanumericDashboardsByViews(2),
  ])
  const heroItem = featured[0] ?? dashboards[0]

  const categoryCount = new Set(
    dashboards.map((d: { category?: string | null }) => d.category).filter(Boolean)
  ).size

  return (
    <div className="db-page">
      <section className="db-hero">
        <div className="db-hero-inner">
          <div>
            <div className="db-eyebrow">Dashboards · Dados tabulares</div>
            <h1>
              Dos dados oficiais às <span className="accent">decisões diárias.</span>
            </h1>
            <p className="db-hero-lede">
              Painéis publicados por instituições nacionais — indicadores actualizados, pré-visualização
              integrada e acesso directo ao site oficial de cada dashboard.
            </p>
            <div className="db-hero-stats">
              <div>
                <strong>{dashboards.length}</strong>
                <span>Dashboards</span>
              </div>
              <div>
                <strong>{categoryCount || '—'}</strong>
                <span>Sectores</span>
              </div>
              <div>
                <strong>Live</strong>
                <span>Pré-visualização</span>
              </div>
            </div>
          </div>

          <div className="db-hero-visual db-hero-visual-embed">
            {heroItem ? (
              <DashboardCardPreview
                title={heroItem.name}
                url={heroItem.dashboardUrl}
                previewImagePath={heroItem.previewImagePath}
                fill
                featured
                interactive
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[280px] p-8 text-center text-white/70 text-sm">
                Cadastre dashboards no painel de administração para aparecerem aqui.
              </div>
            )}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <DashboardFeatured dashboards={featured} totalCount={dashboards.length} />
      )}

      <div id="galeria-dashboards">
        <DashboardGallery dashboards={dashboards} />
      </div>

      <DashboardStaticSections dashboards={dashboards} />
    </div>
  )
}
