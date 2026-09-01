'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { colorForValue } from '@/lib/geo-preview-interactive'
import type { MapSpec } from '@/lib/ai-insights'

export type ChoroplethPayload = MapSpec & {
  geojson?: any
  nameProperty?: string
  boundaryDatasetTitle?: string
}

const DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g')

function normalizeName(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS_REGEX, '').trim().toLowerCase()
}

export function AIChoroplethMap({ map }: { map: ChoroplethPayload }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    if (!containerRef.current || !map.geojson || !map.nameProperty) return
    let cancelled = false
    const nameProperty = map.nameProperty

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false }).setView([-18.5, 35], 5)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 18,
        }).addTo(mapRef.current)
      }

      const valuesByName = new Map(map.values.map((v) => [normalizeName(v.name), v.value]))
      const nums = map.values.map((v) => v.value)
      const min = Math.min(...nums)
      const max = Math.max(...nums)

      const geoLayer = L.geoJSON(map.geojson, {
        style: (feature) => {
          const name = String(feature?.properties?.[nameProperty] || '')
          const value = valuesByName.get(normalizeName(name))
          const color = value === undefined ? '#e5e7eb' : colorForValue(value, { min, max, higherIsWorse: false })
          return {
            color: '#ffffff',
            weight: 1,
            fillColor: color,
            fillOpacity: value === undefined ? 0.25 : 0.82,
          }
        },
        onEachFeature: (feature, layer) => {
          const name = String(feature?.properties?.[nameProperty] || '')
          const value = valuesByName.get(normalizeName(name))
          layer.bindTooltip(
            `<strong>${name}</strong>${value !== undefined ? `<br/>${value.toLocaleString('pt-PT')}` : '<br/>Sem dados'}`,
            { sticky: true }
          )
        },
      })

      geoLayer.addTo(mapRef.current)

      try {
        const bounds = geoLayer.getBounds()
        if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [16, 16] })
      } catch {
        /* limites inválidos — mantém a vista por defeito */
      }
    })

    return () => {
      cancelled = true
    }
  }, [map])

  useEffect(
    () => () => {
      mapRef.current?.remove()
      mapRef.current = null
    },
    []
  )

  if (!map.geojson || !map.nameProperty) {
    const sorted = [...map.values].sort((a, b) => b.value - a.value)
    return (
      <div className="rounded-2xl border border-[#E2E8E5] bg-white p-4 md:p-5">
        <p className="text-xs text-gray-500 mb-3">
          Não foi possível cruzar automaticamente com os limites geográficos oficiais: a mostrar como
          lista ordenada por {map.unit_type}.
        </p>
        <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {sorted.map((v) => (
            <li key={v.name} className="flex items-center justify-between text-sm border-b border-gray-50 pb-1.5">
              <span className="text-gray-700">{v.name}</span>
              <span className="font-semibold text-gray-900">{v.value.toLocaleString('pt-PT')}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#E2E8E5] bg-white p-3 md:p-4">
      <div className="flex items-center justify-between px-1 mb-2">
        <p className="text-sm font-bold text-gray-800">Mapa por {map.unit_type}</p>
        {map.boundaryDatasetTitle && (
          <p className="text-[11px] text-gray-500">Limites: {map.boundaryDatasetTitle}</p>
        )}
      </div>
      <div ref={containerRef} className="w-full h-[320px] rounded-xl overflow-hidden" />
    </div>
  )
}
