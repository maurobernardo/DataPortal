'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { MapCard } from '@/components/maps/MapCard'
import type { PublicMapDashboard } from '@/lib/maps-catalog'

export function MapsCatalogGrid({
  maps,
  favoriteIds,
  viewCounts,
}: {
  maps: PublicMapDashboard[]
  favoriteIds?: Set<string>
  viewCounts?: Record<string, number>
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(maps.map((m) => m.category)))], [maps])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return maps.filter((m) => {
      if (category !== 'Todos' && m.category !== category) return false
      if (!q) return true
      const hay = [m.title, m.subtitle, m.description, m.category].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [maps, search, category])

  return (
    <>
      {maps.length > 1 && (
        <div className="mp-catalog-toolbar">
          <div className="mp-catalog-search">
            <Search className="size-4" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar mapas e dashboards…"
              aria-label="Pesquisar mapas inteligentes"
            />
          </div>
          {categories.length > 2 && (
            <div className="mp-catalog-filters" role="tablist">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={category === cat}
                  className={`mp-catalog-chip${category === cat ? ' active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="mp-catalog-empty">Nenhum mapa corresponde à pesquisa.</p>
      ) : (
        <div className="mp-gallery-grid">
          {filtered.map((map) => (
            <MapCard
              key={map.slug}
              map={map}
              isFavorited={favoriteIds?.has(map.slug) ?? false}
              viewCount={viewCounts?.[map.slug]}
            />
          ))}
        </div>
      )}
    </>
  )
}
