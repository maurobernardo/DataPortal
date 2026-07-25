import { DashboardCardPreview } from '@/components/dashboards/DashboardCardPreview'
import { DashboardVisitLink } from '@/components/dashboards/DashboardVisitLink'
import type { PublicDashboard } from '@/components/dashboards/DashboardGallery'

const FEATURED_COUNT = 2

export function DashboardFeatured({
  dashboards,
  totalCount,
}: {
  dashboards: PublicDashboard[]
  totalCount: number
}) {
  const items = dashboards.slice(0, FEATURED_COUNT)
  if (items.length === 0) return null

  return (
    <section className="db-featured">
      <div className="db-section-inner">
        <div className="db-featured-row">
          <div>
            <div className="db-section-eyebrow">Em destaque</div>
            <h2 className="db-section-title">Dashboards mais visitados</h2>
            <p className="db-featured-lede">Explore os dashboards mais visitados no portal.
              
            </p>
          </div>
          {totalCount > FEATURED_COUNT && (
            <a href="#galeria-dashboards" className="db-featured-link">
              Ver todos ({totalCount}) →
            </a>
          )}
        </div>

        <div className="db-featured-grid db-featured-grid--stacked">
          {items.map((item) => (
            <article key={item.id} className="db-feat-card">
              <DashboardCardPreview
                title={item.name}
                url={item.dashboardUrl}
                previewImagePath={item.previewImagePath}
                large
              />
              <div className="db-feat-card-overlay">
                <span className="db-feat-card-tag">{item.category || 'Dashboard'}</span>
                <h3 className="db-feat-card-title">{item.name}</h3>
                {item.description && <p className="db-feat-card-desc">{item.description}</p>}
                {typeof item.views === 'number' && item.views > 0 && (
                  <p className="db-feat-card-views">
                    {item.views.toLocaleString('pt-PT')} clique{item.views !== 1 ? 's' : ''} em «Ver mais»
                  </p>
                )}
                <DashboardVisitLink id={item.id} href={item.dashboardUrl} className="db-feat-card-cta" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
