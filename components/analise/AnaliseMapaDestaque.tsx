'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { MapPin } from 'lucide-react'

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
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribuicao: '&copy; OpenStreetMap',
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
      // crossOrigin: sem isto, a exportação para PDF (html2canvas) captura o mapa em branco.
      camadaRef.current = L.tileLayer(cfg.url, { attribution: cfg.atribuicao, maxZoom: 19, crossOrigin: true }).addTo(mapRef.current)

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
    <div className="pdx-panel">
      <div className="pdx-panel-head">
        <span className="pdx-panel-icone" aria-hidden>
          <MapPin className="size-3.5" />
        </span>
        <h2>{destaque.titulo}</h2>
        <div className="pdx-abas ml-auto shrink-0" role="tablist" aria-label="Mapa base">
          {(Object.keys(CAMADAS) as (keyof typeof CAMADAS)[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={camada === k}
              onClick={() => setCamada(k)}
            >
              {CAMADAS[k].rotulo}
            </button>
          ))}
        </div>
      </div>
      <div className="pdx-panel-body">
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-soft)' }}>
          <span className="font-bold" style={{ color: 'var(--forest-800)' }}>
            {destaque.nome}
          </span>{' '}
          · <span className="pdx-num">{formatarValor(destaque.valor)}</span> {destaque.metrica}
        </p>
        <div ref={containerRef} className="pdx-mapa w-full h-[340px]" />
      </div>
    </div>
  )
}
