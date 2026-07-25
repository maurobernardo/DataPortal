'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { CatalogFilters } from '@/components/CatalogFilters'
import { GeoActiveFilters } from '@/components/geo/GeoActiveFilters'
import { AlfCatalogToolbar } from '@/components/alf/AlfCatalogToolbar'
import { AlfInfiniteList, AlfEmptyState } from '@/components/alf/AlfInfiniteList'
import { AlfDataDetailPanel } from '@/components/alf/AlfDataDetailPanel'
import { pickMostPopular } from '@/components/geo/geo-utils'
import type { GeoDataset } from '@/components/geo/types'

type Category = {
  id: number
  name: string
  _count: { datasets: number }
}

export function AlfCatalogClient({
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

  const hasFilters = !!(search || category || source || format || year || yearFrom || yearTo)
  const orgCount = availableSources.length
  const initialVisible = Math.min(10, datasets.length)

  return (
    <>
      <section className="geo-catalog-header alf-catalog-header">
        <div className="geo-ch-inner">
          <div className="geo-ch-row">
            <div>
              <div className="geo-ch-eyebrow alf-ch-eyebrow">Conjuntos de dados tabulares</div>
              <h1 className="geo-ch-title">Dados Alfanuméricos</h1>
              <p className="geo-ch-lede">
                Explore séries temporais, indicadores sectoriais e registos administrativos em CSV, Excel,
                JSON e outros formatos — com esquema, tipos de coluna e amostra antes de descarregar.
              </p>
            </div>
            <div className="geo-ch-stats">
              <div className="geo-ch-stat">
                <strong>{totalCount.toLocaleString('pt-PT')}</strong>
                <span>Conjuntos</span>
              </div>
              <div className="geo-ch-stat">
                <strong>{orgCount.toLocaleString('pt-PT')}</strong>
                <span>Fontes</span>
              </div>
              <div className="geo-ch-stat">
                <strong>{(stats._sum.views || 0).toLocaleString('pt-PT')}</strong>
                <span>Visualizações</span>
              </div>
              <div className="geo-ch-stat">
                <strong>{categories.length}</strong>
                <span>Categorias</span>
              </div>
            </div>
          </div>

          <Suspense fallback={null}>
            <AlfCatalogToolbar initialSearch={search} sortOrder={sortOrder} />
          </Suspense>
        </div>
      </section>

      <div className="geo-catalog-body">
        <div className="geo-facet-rail-wrap">
          <CatalogFilters
            variant="alf"
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
              <strong>
                {totalCount.toLocaleString('pt-PT')} conjunto{totalCount !== 1 ? 's' : ''}
              </strong>
              {search ? ' correspondem à pesquisa' : ' no catálogo'}
            </div>
            {totalCount > 0 && (
              <div className="geo-results-meta-hint">
                A mostrar {initialVisible.toLocaleString('pt-PT')} de {totalCount.toLocaleString('pt-PT')} ·
                desça ou use «Ver mais»
              </div>
            )}
          </div>

          <div className="geo-split alf-split">
            <div>
              {datasets.length > 0 ? (
                <AlfInfiniteList
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
                <AlfEmptyState hasFilters={hasFilters} />
              )}
            </div>

            <div className="geo-preview-rail">
              <AlfDataDetailPanel dataset={selected} />
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
