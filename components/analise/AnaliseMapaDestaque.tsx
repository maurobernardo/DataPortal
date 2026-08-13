'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'

type Destaque = {
  passo_id: string
  titulo: string
  nome: string
  valor: number
  metrica: string
  geometry: any
}

const CAMADAS = {
  rua: {
    rotulo: 'Rua',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    atribuicao: '&copy; OpenStreetMap, &copy; CARTO',
  },
  satelite: {
    rotulo: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    atribuicao: 'Esri, Maxar, Earthstar Geographics',
  },
} as const

function formatarValor(v: number): string {
  const casas = Number.isInteger(v) ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2
  return v.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/**
 * Mapa de UMA unidade em destaque: "qual é o maior X" pede para MOSTRAR essa unidade, isolada e
 * bem delimitada, não um coroplético com todo o país por cima. Usa a geometria original da linha
 * vencedora (já carregada do ficheiro do dataset), não uma unidade administrativa.
 */
export function AnaliseMapaDestaque({ destaque }: { destaque: Destaque }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const camadaRef = useRef<any>(null)
  const [camada, setCamada] = useState<keyof typeof CAMADAS>('rua')

  useEffect(() => {
    if (!containerRef.current || !destaque.geometry) return
    let cancelado = false

    import('leaflet').then((L) => {
      if (cancelado || !containerRef.current) return

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { scrollWheelZoom: true }).setView([-18.5, 35], 5)
      }
      const cfg = CAMADAS[camada]
      if (camadaRef.current) mapRef.current.removeLayer(camadaRef.current)
      camadaRef.current = L.tileLayer(cfg.url, { attribution: cfg.atribuicao, maxZoom: 19 }).addTo(mapRef.current)

      mapRef.current.eachLayer((c) => {
        if ((c as any).feature) mapRef.current!.removeLayer(c)
      })

      const feature = { type: 'Feature' as const, properties: {}, geometry: destaque.geometry }
      const geoLayer = L.geoJSON(feature as any, {
        style: { color: '#B91C1C', weight: 3, fillColor: '#EF4444', fillOpacity: 0.35 },
        pointToLayer: (_f, latlng) =>
          L.circleMarker(latlng, { radius: 10, color: '#B91C1C', weight: 3, fillColor: '#EF4444', fillOpacity: 0.6 }),
      })
      geoLayer.bindTooltip(`<strong>${destaque.nome}</strong><br/>${formatarValor(destaque.valor)}`, {
        permanent: false,
        sticky: true,
      })
      geoLayer.addTo(mapRef.current)

      try {
        const bounds = geoLayer.getBounds()
        if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 })
        else mapRef.current.setView(bounds.getCenter?.() || [-18.5, 35], 10)
      } catch {
        /* geometria sem limites calculáveis (ex.: ponto único): mantém a vista por defeito */
      }
    })

    return () => {
      cancelado = true
    }
  }, [destaque, camada])

  useEffect(
    () => () => {
      mapRef.current?.remove()
      mapRef.current = null
    },
    []
  )

  if (!destaque.geometry) return null

  return (
    <div className="rounded-[14px] border border-[#E2E8E5] bg-white p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-bold text-[var(--pd-ink-900)]">{destaque.titulo}</h2>
          <p className="text-[13px] text-gray-500">
            <span className="font-bold text-[#B91C1C]">{destaque.nome}</span> · {formatarValor(destaque.valor)}{' '}
            {destaque.metrica}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-[#E2E8E5] p-0.5 shrink-0">
          {(Object.keys(CAMADAS) as (keyof typeof CAMADAS)[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setCamada(k)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] ${
                camada === k ? 'bg-[#064E2C] text-white' : 'text-[var(--pd-ink-700)] hover:bg-gray-50'
              }`}
            >
              {CAMADAS[k].rotulo}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[340px] rounded-xl overflow-hidden" />
    </div>
  )
}
