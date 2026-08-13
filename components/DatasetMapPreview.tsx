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
  showToggle = true,
}: {
  geojson: any
  bbox?: [number, number, number, number] | null
  className?: string
  /** false em contextos onde o mapa fica dentro de outro elemento interactivo (ex.: card
   *  clicável) — dois <button> aninhados são HTML inválido e quebram a hidratação. */
  showToggle?: boolean
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
          // Sem isto, pontos (ex.: unidades sanitárias) usam o marcador azul por omissão do
          // Leaflet — "style" só afecta linhas/polígonos. Com centenas de pontos sobrepostos a
          // um zoom afastado, isso aparecia como uma mancha azul sólida em vez do país.
          pointToLayer: (_feature, latlng) =>
            L.circleMarker(latlng, {
              radius: 3,
              color: GEOJSON_STYLE.map.color,
              fillColor: GEOJSON_STYLE.map.fillColor,
              fillOpacity: 0.7,
              weight: 1,
            }),
        }).addTo(map)
      }

      // O container pode ainda não ter as dimensões finais no primeiro paint (comum dentro de
      // cards pequenos com layout flex/absolute) — sem invalidateSize antes do fitBounds, o
      // Leaflet calcula o zoom com base numa caixa errada e mostra o continente inteiro em vez
      // de aproximar a Moçambique.
      function ajustarEnquadramento(tentativas = 0) {
        const largura = containerRef.current?.offsetWidth || 0
        // Dentro de um card pequeno (flex/absolute), o container pode continuar com 0px de
        // largura por vários frames enquanto o layout ainda está a assentar — um só
        // requestAnimationFrame não chega. Insiste até haver tamanho real ou desistir.
        if (largura === 0 && tentativas < 20) {
          requestAnimationFrame(() => ajustarEnquadramento(tentativas + 1))
          return
        }
        map.invalidateSize()
        if (bbox) {
          map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: [16, 16], animate: false })
        } else if (geojsonRef.current) {
          // Sem bbox explícito na resposta da API: a camada já carregada sabe os seus próprios
          // limites reais (Leaflet calcula-os a partir da geometria) — usar isso em vez de ficar
          // preso ao enquadramento inicial do mundo inteiro, que não mostra nada de útil.
          const limites = geojsonRef.current.getBounds()
          if (limites.isValid()) {
            map.fitBounds(limites, { padding: [16, 16], animate: false })
          }
        }
      }
      requestAnimationFrame(() => ajustarEnquadramento())

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
      {showToggle && (
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
      )}
    </div>
  )
}

export default DatasetMapPreview