import { ArrowRight } from 'lucide-react'
import { DashboardCardPreview } from '@/components/dashboards/DashboardCardPreview'
import { DashboardVisitLink } from '@/components/dashboards/DashboardVisitLink'
import { FavoriteButton } from '@/components/FavoriteButton'
import { DashboardLastUpdateBadge } from '@/components/dashboards/DashboardLastUpdateBadge'
import type { PublicDashboard } from '@/components/dashboards/DashboardGallery'

function ShowcaseCard({ item, tall, favoriteIds }: { item: PublicDashboard; tall?: boolean; favoriteIds?: Set<string> }) {
  return (
    <article className="db-showcase-card">
      <div className="db-gallery-card-thumb-wrap">
        <DashboardCardPreview
          title={item.name}
          url={item.dashboardUrl}
          previewImagePath={item.previewImagePath}
          featured={tall}
          large={!tall}
        />
        <FavoriteButton
          entityType="dashboard"
          entityId={item.id}
          initialFavorited={favoriteIds?.has(String(item.id)) ?? false}
          className="db-favorite-btn-overlay"
        />
      </div>
      <div className="db-showcase-card-body">
        <span className="db-showcase-card-tag">
          {item.category || 'Portal de Dados'}
          <DashboardLastUpdateBadge date={item.lastDataUpdate} />
        </span>
        <h3 className="db-showcase-card-title">{item.name}</h3>
        {item.description ? <p className="db-showcase-card-desc">{item.description}</p> : null}
        <DashboardVisitLink id={item.id} href={item.dashboardUrl} title={item.name} className="db-feat-card-cta">
          Ver mais
          <ArrowRight className="size-4" aria-hidden />
        </DashboardVisitLink>
      </div>
    </article>
  )
}

export function DashboardStaticSections({
  dashboards,
  favoriteIds,
}: {
  dashboards: PublicDashboard[]
  favoriteIds?: Set<string>
}) {
  if (dashboards.length === 0) return null

  const byViews = [...dashboards].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
  const catalogItem = byViews[0]
  const shareItem = byViews[1] ?? byViews[0]
  const liveItem = byViews[2] ?? byViews[0]

  return (
    <>
      <section className="db-showcase db-showcase-light">
        <div className="db-section-inner">
          <div className="db-showcase-grid">
            <div className="db-showcase-copy">
              <div className="db-section-eyebrow">Catálogo nacional</div>
              <h2 className="db-section-title">Dados alfanuméricos e geoespaciais num só portal.</h2>
              <p className="db-section-lede">
                Cada dashboard está ligado a datasets publicados no Data Portal: indicadores de saúde,
                educação, economia e território, com acesso directo à fonte oficial e metadados
                harmonizados.
              </p>
              <ul className="db-showcase-list">
                <li>Integração com o catálogo de datasets alfanuméricos e camadas geoespaciais</li>
                <li>Pré-visualização antes de abrir o painel completo no site da instituição</li>
                <li>Filtros por sector, organização e palavras-chave</li>
              </ul>
            </div>
            {catalogItem && <ShowcaseCard item={catalogItem} tall favoriteIds={favoriteIds} />}
          </div>
        </div>
      </section>

      <section className="db-showcase db-showcase-muted">
        <div className="db-section-inner">
          <div className="db-showcase-grid db-showcase-grid-reverse">
            {shareItem && <ShowcaseCard item={shareItem} tall favoriteIds={favoriteIds} />}
            <div className="db-showcase-copy">
              <div className="db-section-eyebrow">Partilha institucional</div>
              <h2 className="db-section-title">Dashboards oficiais, citados e actualizados.</h2>
              <p className="db-section-lede">
                Partilhe painéis em relatórios, reuniões e páginas institucionais. O link «Ver mais»
                abre sempre o dashboard no ambiente oficial (ArcGIS, Power BI, etc.) mantendo a
                credibilidade da fonte.
              </p>
              <ul className="db-showcase-list">
                <li>Links directos para o ambiente de publicação da entidade</li>
                <li>Destaque automático dos painéis mais consultados no portal</li>
                <li>Categorias alinhadas aos sectores do portal</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="db-showcase db-showcase-light">
        <div className="db-section-inner">
          <div className="db-showcase-grid">
            <div className="db-showcase-copy">
              <div className="db-section-eyebrow">Indicadores em foco</div>
              <h2 className="db-section-title">Os dashboards mais consultados pela comunidade.</h2>
              <p className="db-section-lede">
                A secção em destaque reflecte o interesse real dos utilizadores, ideal para
                acompanhar emprego juvenil, cobertura vacinal, produção agrícola e outros temas
                prioritários para Moçambique.
              </p>
            </div>
            {liveItem && <ShowcaseCard item={liveItem} tall favoriteIds={favoriteIds} />}
          </div>
        </div>
      </section>
    </>
  )
}
