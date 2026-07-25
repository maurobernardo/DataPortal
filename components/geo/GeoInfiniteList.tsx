'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Loader2, Database } from 'lucide-react'
import type { GeoDataset } from '@/components/geo/types'
import { GeoLayerCard } from '@/components/geo/GeoLayerCard'

interface GeoInfiniteListProps {
  initialDatasets: GeoDataset[]
  totalCount: number
  selectedId: number | null
  onSelect: (dataset: GeoDataset) => void
  category?: string
  search?: string
  source?: string
  format?: string
  year?: string
  yearFrom?: string
  yearTo?: string
  sortOrder?: string
}

export function GeoInfiniteList({
  initialDatasets,
  totalCount,
  selectedId,
  onSelect,
  category,
  search,
  source,
  format,
  year,
  yearFrom,
  yearTo,
  sortOrder,
}: GeoInfiniteListProps) {
  const [datasets, setDatasets] = useState<GeoDataset[]>(initialDatasets)
  const [loadedCount, setLoadedCount] = useState(() => Math.min(10, initialDatasets.length))
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(() => {
    const n = initialDatasets.length
    const show = Math.min(10, n)
    return show < n || n < totalCount
  })
  const loadTriggerRef = useRef<HTMLDivElement | null>(null)
  const listStateRef = useRef({ loadedCount: Math.min(10, initialDatasets.length), datasets: initialDatasets, totalCount })

  listStateRef.current = { loadedCount, datasets, totalCount }

  const loadDatasetsFromAPI = async (offset: number, take: number) => {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('dataType', 'geoespacial')
      if (category) queryParams.append('category', category)
      if (search) queryParams.append('search', search)
      if (source) queryParams.append('source', source)
      if (format) queryParams.append('format', format)
      if (year) queryParams.append('year', year)
      if (yearFrom) queryParams.append('yearFrom', yearFrom)
      if (yearTo) queryParams.append('yearTo', yearTo)
      if (sortOrder) queryParams.append('sortOrder', sortOrder)
      queryParams.append('offset', offset.toString())
      queryParams.append('take', take.toString())

      const response = await fetch(`/api/datasets?${queryParams.toString()}`)
      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }

  useEffect(() => {
    const nextShow = Math.min(10, initialDatasets.length)
    setDatasets(initialDatasets)
    setLoadedCount(nextShow)
  }, [category, search, source, format, year, yearFrom, yearTo, sortOrder, initialDatasets])

  useEffect(() => {
    setHasMore(loadedCount < datasets.length || datasets.length < totalCount)
  }, [loadedCount, datasets.length, totalCount])

  const loadMore = async () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)
    try {
      const { loadedCount: lc, datasets: ds, totalCount: tc } = listStateRef.current
      if (lc < ds.length) {
        setLoadedCount((c) => Math.min(c + 10, ds.length))
        return
      }
      if (ds.length < tc) {
        const newDatasets = await loadDatasetsFromAPI(ds.length, 10)
        if (newDatasets.length > 0) {
          setDatasets((prev) => [...prev, ...newDatasets])
          setLoadedCount((c) => c + newDatasets.length)
        } else {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const displayedDatasets = datasets.slice(0, loadedCount)

  useEffect(() => {
    const node = loadTriggerRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) loadMore()
      },
      { rootMargin: '300px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, isLoading, loadedCount, datasets.length, category, search, source, format, year, yearFrom, yearTo, sortOrder])

  return (
    <div>
      <div className="geo-layer-grid">
        {displayedDatasets.map((dataset, index) => (
          <GeoLayerCard
            key={dataset.id}
            dataset={dataset}
            index={index}
            selected={selectedId === dataset.id}
            onSelect={() => onSelect(dataset)}
            highlight={search}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-70"
            style={{ background: 'var(--pd-green-700)' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                Ver mais
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="geo-layer-grid mt-6">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="geo-layer-card animate-pulse pointer-events-none" aria-hidden>
              <div className="geo-layer-thumb bg-[var(--pd-surface-100)]" />
              <div className="geo-layer-body space-y-2 p-4">
                <div className="h-4 w-3/4 bg-[var(--pd-surface-100)] rounded" />
                <div className="h-3 w-full bg-[var(--pd-surface-100)] rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={loadTriggerRef} className="h-1" aria-hidden />
    </div>
  )
}

export function GeoEmptyState() {
  return (
    <div className="geo-empty-state">
      <Database className="w-10 h-10 mx-auto mb-4 text-[var(--pd-ink-300)]" />
      <h3 className="text-lg font-semibold text-[var(--pd-ink-900)] mb-2">Nenhum dataset encontrado</h3>
      <p className="text-sm text-[var(--pd-ink-500)] mb-6 max-w-md mx-auto">
        Não encontramos camadas que correspondam aos seus critérios. Ajuste os filtros ou limpe a pesquisa.
      </p>
      <a href="/dados-espaciais" className="geo-ldp-action-primary inline-flex">
        Limpar filtros
      </a>
    </div>
  )
}
