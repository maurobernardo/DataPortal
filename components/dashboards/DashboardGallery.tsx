'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { DASHBOARD_CATEGORIES } from '@/lib/dashboard-utils'
import { DashboardCardPreview } from '@/components/dashboards/DashboardCardPreview'
import { DashboardVisitLink } from '@/components/dashboards/DashboardVisitLink'

export type PublicDashboard = {
  id: number
  name: string
  dashboardUrl: string
  description?: string | null
  previewImagePath?: string | null
  category?: string | null
  views?: number
}

const GALLERY_PAGE_SIZE = 2

export function DashboardGallery({ dashboards }: { dashboards: PublicDashboard[] }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('Todos')
  const [visibleCount, setVisibleCount] = useState(GALLERY_PAGE_SIZE)

  const categoriesInUse = useMemo(() => {
    const fromData = new Set(
      dashboards.map((d) => d.category).filter((c): c is string => Boolean(c && c.trim()))
    )
    return ['Todos', ...DASHBOARD_CATEGORIES.filter((c) => fromData.has(c))]
  }, [dashboards])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return dashboards.filter((d) => {
      const matchCat = category === 'Todos' || d.category === category
      if (!matchCat) return false
      if (!q) return true
      const hay = [d.name, d.description || '', d.category || ''].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [dashboards, search, category])

  useEffect(() => {
    setVisibleCount(GALLERY_PAGE_SIZE)
  }, [search, category])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const loadMore = () => {
    setVisibleCount((n) => Math.min(n + GALLERY_PAGE_SIZE, filtered.length))
  }

  return (
    <section className="db-gallery">
      <div className="db-section-inner">
        <div className="db-section-header">
          <div className="db-section-eyebrow">Galeria de dashboards</div>
          <h2 className="db-section-title">Explore dashboards por sector</h2>
          <p className="db-section-lede">
            Pré-visualize cada painel e aceda ao site oficial para análise completa e interacção total.
          </p>
        </div>

        <div className="db-gallery-toolbar">
          <div className="db-gallery-search">
            <Search className="db-gallery-search-icon" size={18} aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar por nome ou descrição…"
              aria-label="Pesquisar dashboards"
            />
          </div>
          <div className="db-gallery-filters" role="tablist" aria-label="Filtrar por categoria">
            {categoriesInUse.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={category === cat}
                className={`db-gallery-chip${category === cat ? ' active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="db-gallery-empty">
            <p>Nenhum dashboard corresponde à pesquisa.</p>
          </div>
        ) : (
          <>
            <p className="db-gallery-meta">
              A mostrar <strong>{visible.length}</strong> de <strong>{filtered.length}</strong> dashboard
              {filtered.length !== 1 ? 's' : ''}
            </p>

            <div className="db-gallery-grid db-gallery-grid--paged">
              {visible.map((item) => (
                <article key={item.id} className="db-gallery-card">
                  <DashboardCardPreview
                    title={item.name}
                    url={item.dashboardUrl}
                    previewImagePath={item.previewImagePath}
                    large
                  />
                  <div className="db-gallery-card-body">
                    <div className="db-gallery-card-org">{item.category || 'Geral'}</div>
                    <h3 className="db-gallery-card-title">{item.name}</h3>
                    {item.description ? (
                      <p className="db-gallery-card-desc">{item.description}</p>
                    ) : null}
                    <div className="db-gallery-card-foot">
                      <DashboardVisitLink
                        id={item.id}
                        href={item.dashboardUrl}
                        className="db-gallery-card-cta"
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {hasMore && (
              <div className="db-gallery-more">
                <button type="button" className="db-gallery-more-btn" onClick={loadMore}>
                  Ver mais
                  <span className="db-gallery-more-sub">
                    (+{Math.min(GALLERY_PAGE_SIZE, filtered.length - visibleCount)} de{' '}
                    {filtered.length - visibleCount} restantes)
                  </span>
                  <ChevronDown className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
