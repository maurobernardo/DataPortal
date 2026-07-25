'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { CatalogFilters } from '@/components/CatalogFilters'
import { GeoCatalogToolbar } from '@/components/geo/GeoCatalogToolbar'
import { GeoActiveFilters } from '@/components/geo/GeoActiveFilters'
import { GeoInfiniteList, GeoEmptyState } from '@/components/geo/GeoInfiniteList'
import { GeoMapDetailPanel } from '@/components/geo/GeoMapDetailPanel'
import { pickMostPopular } from '@/components/geo/geo-utils'
import type { GeoDataset } from '@/components/geo/types'

type Category = {
  id: number
  name: string
  _count: { datasets: number }
}

export function GeoCatalogClient({
  datasets,
  categories,
  totalCount,
  stats,
  availableFormats,
  availableSources,
  availableYears,
  searchParams,
}: {
  datasets: GeoDataset[]
  categories: Category[]
  totalCount: number
  stats: { _sum: { views: number; downloads: number }; _count: { id: number } }
  availableFormats: string[]
  availableSources: string[]
  availableYears: number[]
  searchParams: Record<string, string | string[] | undefined>
}) {
  const defaultSelected = useMemo(() => pickMostPopular(datasets), [datasets])
  const [selected, setSelected] = useState<GeoDataset | null>(defaultSelected)

  useEffect(() => {
    setSelected((prev) => {
      if (prev && datasets.some((d) => d.id === prev.id)) return prev
      return pickMostPopular(datasets)
    })
  }, [datasets])

  const sp = searchParams
  const search = typeof sp.search === 'string' ? sp.search : undefined
  const category = typeof sp.category === 'string' ? sp.category : undefined
  const source = typeof sp.source === 'string' ? sp.source : undefined
  const format = typeof sp.format === 'string' ? sp.format : undefined
  const year = typeof sp.year === 'string' ? sp.year : undefined
  const yearFrom = typeof sp.yearFrom === 'string' ? sp.yearFrom : undefined
  const yearTo = typeof sp.yearTo === 'string' ? sp.yearTo : undefined
  const sortOrder = typeof sp.sortOrder === 'string' ? sp.sortOrder : undefined

  const orgCount = availableSources.length
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
  <>
    <section className="geo-catalog-header">
      <div className="geo-ch-inner">
        <div className="geo-ch-row">
          <div>
            <div className="geo-ch-eyebrow">Camadas geoespaciais</div>
            <h1 className="geo-ch-title">Dados Geoespaciais</h1>
            <p className="geo-ch-lede">
              Explore e descarregue camadas oficiais — fronteiras administrativas, hidrografia,
              infraestrutura, uso do solo e outros dados georreferenciados do portal nacional.
            </p>
          </div>
          <div className="geo-ch-stats">
            <div className="geo-ch-stat">
              <strong>{totalCount.toLocaleString('pt-BR')}</strong>
              <span>Camadas</span>
            </div>
            <div className="geo-ch-stat">
              <strong>{orgCount.toLocaleString('pt-BR')}</strong>
              <span>Fontes</span>
            </div>
            <div className="geo-ch-stat">
              <strong>{(stats._sum.views || 0).toLocaleString('pt-BR')}</strong>
              <span>Visualizações</span>
            </div>
            <div className="geo-ch-stat">
              <strong>{categories.length}</strong>
              <span>Categorias</span>
            </div>
          </div>
        </div>

        <Suspense fallback={null}>
          <GeoCatalogToolbar initialSearch={search} sortOrder={sortOrder} />
        </Suspense>
      </div>
    </section>

    <div className="geo-catalog-body">
      <div className="geo-facet-rail-wrap">
        <CatalogFilters
          variant="geo"
          categories={categories}
          activeCategory={category}
          activeFormat={format}
          availableFormats={availableFormats}
          availableSources={availableSources}
          availableYears={availableYears}
          activeYear={year}
          activeSortOrder={sortOrder}
        />
      </div>

      <main className="geo-results-area">
        <Suspense fallback={null}>
          <GeoActiveFilters categories={categories} />
        </Suspense>

        <div className="geo-results-meta">
          <div>
            <strong>{totalCount.toLocaleString('pt-BR')} camada{totalCount !== 1 ? 's' : ''}</strong>
            {search ? ' correspondem à pesquisa' : ' no catálogo'}
          </div>
          {totalCount > 0 && <div>Página 1 de {totalPages}</div>}
        </div>

        <div className="geo-split">
          <div>
            {datasets.length > 0 ? (
              <GeoInfiniteList
                initialDatasets={datasets}
                totalCount={totalCount}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
                category={category}
                search={search}
                source={source}
                format={format}
                year={year}
                yearFrom={yearFrom}
                yearTo={yearTo}
                sortOrder={sortOrder}
              />
            ) : (
              <GeoEmptyState />
            )}
          </div>

          <div className="geo-preview-rail">
            <GeoMapDetailPanel dataset={selected} />
          </div>
        </div>
      </main>
    </div>
  </>
  )
}
