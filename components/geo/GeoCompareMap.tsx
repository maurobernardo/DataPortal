'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from 'leaflet'
import { getCachedPreview, setCachedPreview } from '@/lib/preview-cache'

const LAYER_COLORS = ['#064E2C', '#1F6FB2', '#B4530A']

type LayerState = {
  id: number
  title: string
  color: string
  geojson: unknown
  bbox: [number, number, number, number] | null
  visible: boolean
  loading: boolean
  error: string | null
}

export function GeoCompareMap({
  datasets,
  onClose,
}: {
  datasets: { id: number; title: string }[]
  onClose: () => void
}) {
  const mapElRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const leafletLayersRef = useRef<globalThis.Map<number, LeafletGeoJSON>>(new globalThis.Map())
  const [layers, setLayers] = useState<LayerState[]>(() =>
    datasets.map((d, i) => ({
      id: d.id,
      title: d.title,
      color: LAYER_COLORS[i % LAYER_COLORS.length],
      geojson: null,
      bbox: null,
      visible: true,
      loading: true,
      error: null,
    }))
  )
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    import('leaflet').then((L) => {
      if (cancelled || !mapElRef.current || mapRef.current) return
      const map = L.map(mapElRef.current, { scrollWheelZoom: true, minZoom: 2, maxZoom: 18 })
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
    let cancelled = false
    datasets.forEach((d) => {
      const cached = getCachedPreview<any>(d.id)
      const apply = (data: any) => {
        if (cancelled) return
        setLayers((prev) =>
          prev.map((l) =>
            l.id === d.id
              ? data?.type === 'geo'
                ? { ...l, geojson: data.geojson, bbox: data.bbox ?? null, loading: false }
                : { ...l, loading: false, error: data?.error || 'Sem geometria disponível' }
              : l
          )
        )
      }
      if (cached) {
        apply(cached)
        return
      }
      fetch(`/api/datasets/${d.id}/preview`)
        .then((r) => r.json())
        .then((data) => {
          setCachedPreview(d.id, data)
          apply(data)
        })
        .catch(() => apply({ error: 'Falha ao carregar' }))
    })
    return () => {
      cancelled = true
    }
  }, [datasets])

  useEffect(() => {
    if (!ready || !mapRef.current) return
    let cancelled = false
    import('leaflet').then((L) => {
      if (cancelled || !mapRef.current) return
      const allBounds: [number, number][] = []
      for (const layer of layers) {
        const existing = leafletLayersRef.current.get(layer.id)
        if (existing) {
          existing.remove()
          leafletLayersRef.current.delete(layer.id)
        }
        if (!layer.visible || !layer.geojson) continue
        const gj = L.geoJSON(layer.geojson as any, {
          style: { color: layer.color, weight: 2, fillOpacity: 0.15 },
          pointToLayer: (_feature, latlng) => L.circleMarker(latlng, { radius: 5, color: layer.color, fillOpacity: 0.6 }),
        }).addTo(mapRef.current)
        leafletLayersRef.current.set(layer.id, gj)
        if (layer.bbox) {
          allBounds.push([layer.bbox[1], layer.bbox[0]], [layer.bbox[3], layer.bbox[2]])
        }
      }
      if (allBounds.length > 0) {
        try {
          const bounds = L.latLngBounds(allBounds)
          if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 })
        } catch {
          /* ignora */
        }
      }
    })
    return () => {
      cancelled = true
    }
  }, [ready, layers])

  return (
    <div className="geo-compare-overlay" role="dialog" aria-modal="true">
      <div className="geo-compare-panel">
        <div className="geo-compare-header">
          <h2>Comparar camadas no mapa</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="geo-compare-close">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="geo-compare-body">
          <div ref={mapElRef} className="geo-compare-map" />
          <div className="geo-compare-legend">
            {layers.map((layer) => (
              <label key={layer.id} className="geo-compare-legend-item">
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() =>
                    setLayers((prev) => prev.map((l) => (l.id === layer.id ? { ...l, visible: !l.visible } : l)))
                  }
                />
                <span className="geo-compare-legend-swatch" style={{ background: layer.color }} />
                <span className="geo-compare-legend-title" title={layer.title}>
                  {layer.title}
                </span>
                {layer.loading && <span className="geo-compare-legend-status">a carregar…</span>}
                {layer.error && <span className="geo-compare-legend-status geo-compare-legend-status--error">{layer.error}</span>}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
