'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { CheckSquare, List, Map as MapIcon } from 'lucide-react'
import { CatalogFilters } from '@/components/CatalogFilters'
import { GeoCatalogToolbar } from '@/components/geo/GeoCatalogToolbar'
import { GeoActiveFilters } from '@/components/geo/GeoActiveFilters'
import { GeoInfiniteList, GeoEmptyState } from '@/components/geo/GeoInfiniteList'
import { GeoMapDetailPanel } from '@/components/geo/GeoMapDetailPanel'
import { BatchActionBar } from '@/components/geo/BatchActionBar'
import { pickMostPopular } from '@/components/geo/geo-utils'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { RecentlyViewedRail } from '@/components/RecentlyViewedRail'
import { EticaBadgeCatalogo } from '@/components/EticaBadgeCatalogo'
import type { GeoDataset } from '@/components/geo/types'

const GeoCatalogMapView = dynamic(
  () => import('@/components/geo/GeoCatalogMapView').then((m) => m.GeoCatalogMapView),
  { ssr: false }
)
const GeoCompareMap = dynamic(
  () => import('@/components/geo/GeoCompareMap').then((m) => m.GeoCompareMap),
  { ssr: false }
)

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
  coberturaGeografica,
}: {
  datasets: GeoDataset[]
  categories: Category[]
  totalCount: number
  stats: { _sum: { views: number; downloads: number }; _count: { id: number } }
  availableFormats: string[]
  availableSources: string[]
  availableYears: number[]
  searchParams: Record<string, string | string[] | undefined>
  coberturaGeografica?: {
    porProvincia: { provincia: string; total: number }[]
    datasetsSemCoberturaIdentificada: number
  } | null
}) {
  const defaultSelected = useMemo(() => pickMostPopular(datasets), [datasets])
  const [selected, setSelected] = useState<GeoDataset | null>(defaultSelected)
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [mapDatasets, setMapDatasets] = useState<GeoDataset[]>([])
  const [mapLoading, setMapLoading] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedForBatch, setSelectedForBatch] = useState<Set<number>>(new Set())
  const [knownDatasets, setKnownDatasets] = useState<Map<number, GeoDataset>>(
    () => new Map(datasets.map((d) => [d.id, d]))
  )
  const [compareOpen, setCompareOpen] = useState(false)

  useEffect(() => {
    setSelected((prev) => {
      if (prev && datasets.some((d) => d.id === prev.id)) return prev
      return pickMostPopular(datasets)
    })
  }, [datasets])

  useEffect(() => {
    let alive = true
    fetch('/api/favorites/ids')
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return
        setFavoriteIds(new Set(Array.isArray(data?.ids) ? data.ids : []))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const sp = searchParams
  const search = typeof sp.search === 'string' ? sp.search : undefined
  const category = typeof sp.category === 'string' ? sp.category : undefined
  const source = typeof sp.source === 'string' ? sp.source : undefined
  const format = typeof sp.format === 'string' ? sp.format : undefined
  const year = typeof sp.year === 'string' ? sp.year : undefined
  const yearFrom = typeof sp.yearFrom === 'string' ? sp.yearFrom : undefined
  const yearTo = typeof sp.yearTo === 'string' ? sp.yearTo : undefined
  const sortOrder = typeof sp.sortOrder === 'string' ? sp.sortOrder : undefined

  useEffect(() => {
    if (viewMode !== 'map') return
    let alive = true
    setMapLoading(true)
    const params = new URLSearchParams()
    params.append('dataType', 'geoespacial')
    if (category) params.append('category', category)
    if (search) params.append('search', search)
    if (source) params.append('source', source)
    if (format) params.append('format', format)
    if (year) params.append('year', year)
    if (yearFrom) params.append('yearFrom', yearFrom)
    if (yearTo) params.append('yearTo', yearTo)
    params.append('offset', '0')
    params.append('take', '500')
    fetch(`/api/datasets?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return
        const list = Array.isArray(data) ? data : []
        setMapDatasets(list)
        setKnownDatasets((prev) => {
          const next = new Map(prev)
          list.forEach((d: GeoDataset) => next.set(d.id, d))
          return next
        })
      })
      .catch(() => {
        if (alive) setMapDatasets([])
      })
      .finally(() => {
        if (alive) setMapLoading(false)
      })
    return () => {
      alive = false
    }
  }, [viewMode, category, search, source, format, year, yearFrom, yearTo])

  const orgCount = availableSources.length
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const activeCategory = category ? categories.find((c) => String(c.id) === category) : undefined

  function toggleBatch(id: number) {
    setSelectedForBatch((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDatasetsChange(list: GeoDataset[]) {
    setKnownDatasets((prev) => {
      const next = new Map(prev)
      list.forEach((d) => next.set(d.id, d))
      return next
    })
  }

  const compareDatasets = Array.from(selectedForBatch)
    .map((id) => knownDatasets.get(id))
    .filter((d): d is GeoDataset => !!d)
    .map((d) => ({ id: d.id, title: d.title }))

  return (
  <>
    <section className="geo-catalog-header pd-photo-hero">
      <div className="pd-photo-hero-bg" style={{ backgroundImage: "url('/images/fundo2.webp')" }} aria-hidden />
      <div className="pd-photo-hero-scrim" aria-hidden />
      <div className="geo-ch-inner">
        <Breadcrumbs
          items={[
            { label: 'Dados Geoespaciais', href: activeCategory ? '/dados-espaciais' : undefined },
            ...(activeCategory ? [{ label: activeCategory.name }] : []),
          ]}
        />
        <div className="geo-ch-row">
          <div>
            <div className="geo-ch-eyebrow-row">
              <div className="geo-ch-eyebrow">Camadas geoespaciais</div>
              <EticaBadgeCatalogo />
            </div>
            <h1 className="geo-ch-title">Dados Geoespaciais</h1>
            <p className="geo-ch-lede">
              Explore e descarregue camadas oficiais: fronteiras administrativas, hidrografia,
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

        <RecentlyViewedRail dataType="geoespacial" />

        <div className="geo-results-meta">
          <div>
            <strong>{totalCount.toLocaleString('pt-BR')} camada{totalCount !== 1 ? 's' : ''}</strong>
            {search ? ' correspondem à pesquisa' : ' no catálogo'}
          </div>
          <div className="geo-results-meta-actions">
            {totalCount > 0 && viewMode === 'list' && <span>Página 1 de {totalPages}</span>}
            <div className="geo-view-toggle" role="tablist" aria-label="Modo de visualização">
              <button
                type="button"
                className={`geo-view-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List className="size-3.5" aria-hidden />
                Lista
              </button>
              <button
                type="button"
                className={`geo-view-toggle-btn${viewMode === 'map' ? ' active' : ''}`}
                onClick={() => setViewMode('map')}
              >
                <MapIcon className="size-3.5" aria-hidden />
                Mapa
              </button>
            </div>
            <button
              type="button"
              className={`geo-view-toggle-btn geo-selection-toggle-btn${selectionMode ? ' active' : ''}`}
              onClick={() => {
                setSelectionMode((v) => !v)
                if (selectionMode) setSelectedForBatch(new Set())
              }}
            >
              <CheckSquare className="size-3.5" aria-hidden />
              Selecionar
            </button>
          </div>
        </div>

        <div className="geo-split">
          <div>
            {viewMode === 'map' ? (
              mapLoading ? (
                <div className="geo-catalog-map-view geo-catalog-map-view--loading">A carregar camadas…</div>
              ) : (
                <GeoCatalogMapView
                  datasets={mapDatasets}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelected}
                />
              )
            ) : datasets.length > 0 ? (
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
                favoriteIds={favoriteIds}
                selectionMode={selectionMode}
                selectedForBatch={selectedForBatch}
                onToggleBatch={toggleBatch}
                onDatasetsChange={handleDatasetsChange}
              />
            ) : (
              <GeoEmptyState />
            )}

            {selectionMode && (
              <BatchActionBar
                selectedIds={Array.from(selectedForBatch)}
                onClear={() => setSelectedForBatch(new Set())}
                onCompare={() => setCompareOpen(true)}
              />
            )}
          </div>

          <div className="geo-preview-rail">
            <GeoMapDetailPanel dataset={selected} />
          </div>
        </div>
      </main>
    </div>

    {compareOpen && compareDatasets.length >= 2 && (
      <GeoCompareMap datasets={compareDatasets} onClose={() => setCompareOpen(false)} />
    )}
  </>
  )
}
