'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Rectangle } from 'leaflet'
import type { GeoDataset } from '@/components/geo/types'

const COLOR_DEFAULT = '#064E2C'
const COLOR_SELECTED = '#1F6FB2'

export function GeoCatalogMapView({
  datasets,
  selectedId,
  onSelect,
}: {
  datasets: GeoDataset[]
  selectedId: number | null
  onSelect: (dataset: GeoDataset) => void
}) {
  const mapElRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const rectsRef = useRef<globalThis.Map<number, Rectangle>>(new globalThis.Map())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    import('leaflet').then((L) => {
      if (cancelled || !mapElRef.current || mapRef.current) return
      const map = L.map(mapElRef.current, {
        scrollWheelZoom: true,
        zoomControl: true,
        minZoom: 2,
        maxZoom: 18,
      })
      map.setView([-18.5, 35], 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map)
      mapRef.current = map
      setReady(true)
    })
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!ready || !mapRef.current) return
    let cancelled = false
    import('leaflet').then((L) => {
      if (cancelled || !mapRef.current) return
      rectsRef.current.forEach((r) => r.remove())
      rectsRef.current.clear()

      const boundsList: [[number, number], [number, number]][] = []
      for (const d of datasets) {
        const minX = d.bboxMinX
        const minY = d.bboxMinY
        const maxX = d.bboxMaxX
        const maxY = d.bboxMaxY
        if (![minX, minY, maxX, maxY].every((v) => typeof v === 'number' && Number.isFinite(v))) continue
        const sw: [number, number] = [minY as number, minX as number]
        const ne: [number, number] = [maxY as number, maxX as number]
        boundsList.push([sw, ne])

        const isSelected = selectedId === d.id
        const rect = L.rectangle([sw, ne], {
          color: isSelected ? COLOR_SELECTED : COLOR_DEFAULT,
          weight: isSelected ? 3 : 1.5,
          fillOpacity: isSelected ? 0.25 : 0.12,
        }).addTo(mapRef.current)

        rect.bindTooltip(d.title, { sticky: true })
        rect.on('click', () => onSelect(d))
        rectsRef.current.set(d.id, rect)
      }

      if (boundsList.length > 0) {
        try {
          const bounds = L.latLngBounds(boundsList.flat())
          if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 })
        } catch {
          /* ignora bounds inválidos */
        }
      }
    })
    return () => {
      cancelled = true
    }
  }, [ready, datasets, selectedId, onSelect])

  return (
    <div className="geo-catalog-map-view">
      <div ref={mapElRef} className="geo-catalog-map-view__canvas" />
      {datasets.length === 0 && (
        <div className="geo-catalog-map-view__empty">
          Nenhuma camada com localização calculada para os filtros atuais.
        </div>
      )}
    </div>
  )
}
