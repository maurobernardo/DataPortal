'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map, TileLayer, GeoJSON } from 'leaflet'

type BaseMap = 'map' | 'satellite'

const TILES = {
  map: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
}

const GEOJSON_STYLE = {
  map: {
    color: '#064E2C',
    weight: 1.5,
    fillColor: '#064E2C',
    fillOpacity: 0.14,
  },
  satellite: {
    color: '#E7F3EB',
    weight: 2,
    fillColor: '#064E2C',
    fillOpacity: 0.28,
  },
}

export function DatasetMapPreview({
  geojson,
  bbox,
  className,
}: {
  geojson: any
  bbox?: [number, number, number, number] | null
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const tileRef = useRef<TileLayer | null>(null)
  const geojsonRef = useRef<GeoJSON | null>(null)
  const [baseMap, setBaseMap] = useState<BaseMap>('map')

  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current || !containerRef.current) return

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return

      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      }).setView([0, 0], 2)

      tileRef.current = L.tileLayer(TILES.map.url, {
        attribution: TILES.map.attribution,
        maxZoom: 19,
      }).addTo(map)

      if (geojson) {
        geojsonRef.current = L.geoJSON(geojson, {
          style: GEOJSON_STYLE.map,
        }).addTo(map)
      }

      if (bbox) {
        map.fitBounds(
          [[bbox[1], bbox[0]], [bbox[3], bbox[2]]],
          { padding: [24, 24] }
        )
      }

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        tileRef.current = null
        geojsonRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapRef.current || !tileRef.current) return

    import('leaflet').then((L) => {
      if (!mapRef.current || !tileRef.current) return

      mapRef.current.removeLayer(tileRef.current)

      tileRef.current = L.tileLayer(TILES[baseMap].url, {
        attribution: TILES[baseMap].attribution,
        maxZoom: 19,
      }).addTo(mapRef.current)

      if (geojsonRef.current) {
        geojsonRef.current.setStyle(GEOJSON_STYLE[baseMap])
      }
    })
  }, [baseMap])

  const rootClass =
    className?.trim() ??
    'w-full h-[380px] rounded-2xl overflow-hidden border border-slate-200 relative'

  return (
    <div className={rootClass}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* Toggle Mapa / Satélite */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex">
          {(['map', 'satellite'] as BaseMap[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setBaseMap(mode)}
              className={`px-3 py-2 text-xs font-bold transition ${
                baseMap === mode
                  ? 'bg-green-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {mode === 'map' ? 'Mapa' : 'Satélite'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DatasetMapPreview