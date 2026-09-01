'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, GeoJSON } from 'leaflet'
import { Loader2, MapPin } from 'lucide-react'

/**
 * O mapa das províncias que o relatório menciona.
 *
 * Deliberadamente leve: `AnaliseMapaCoropletico` (o mapa da análise de dados) tem filtro por
 * distrito, comparação entre unidades, selecção por arrasto, tudo isso construído para explorar
 * um dataset a fundo. Aqui o mapa é só uma ilustração ao lado do resumo, sem nada disso; um
 * Leaflet directo, no mesmo espírito de `DatasetMapPreview.tsx`, é mais simples do que reaproveitar
 * um componente pensado para outro contexto e depois esconder metade da sua interface.
 */

type ProvinciaMencionada = { codigo: string; nome: string; mencoes: number }
type Geojson = { type: 'FeatureCollection'; features: { properties: { codigo: string; nome: string }; geometry: any }[] }

const VERDE_ESCURO = '#064E2C'

export function MapaGeografiaRelatorio({ reportId }: { reportId: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const camadaRef = useRef<GeoJSON | null>(null)
  const [estado, setEstado] = useState<'a_carregar' | 'pronto' | 'vazio' | 'erro'>('a_carregar')
  const [unidades, setUnidades] = useState<ProvinciaMencionada[]>([])

  useEffect(() => {
    let vivo = true
    fetch(`/api/reports/${reportId}/geografia`)
      .then((r) => r.json())
      .then((d: { unidades: ProvinciaMencionada[]; geojson: Geojson }) => {
        if (!vivo) return
        if (!d.unidades || d.unidades.length === 0) {
          setEstado('vazio')
          return
        }
        setUnidades(d.unidades)
        desenhar(d.unidades, d.geojson)
      })
      .catch(() => vivo && setEstado('erro'))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId])

  async function desenhar(unidades: ProvinciaMencionada[], geojson: Geojson) {
    if (!containerRef.current || mapRef.current) return
    const L = await import('leaflet')
    if (!containerRef.current) return

    const maximo = Math.max(...unidades.map((u) => u.mencoes))
    const porCodigo = new Map(unidades.map((u) => [u.codigo, u]))

    const map = L.map(containerRef.current, { scrollWheelZoom: false, attributionControl: false }).setView([-18.5, 35], 5)
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12 }).addTo(map)

    const camada = L.geoJSON(geojson as any, {
      style: (feature: any) => {
        const u = porCodigo.get(feature.properties.codigo)
        const intensidade = u ? 0.25 + 0.55 * (u.mencoes / maximo) : 0.1
        return { color: VERDE_ESCURO, weight: 1.5, fillColor: VERDE_ESCURO, fillOpacity: intensidade }
      },
      onEachFeature: (feature: any, layer: any) => {
        const u = porCodigo.get(feature.properties.codigo)
        layer.bindTooltip(`${feature.properties.nome}${u ? `: ${u.mencoes} menção(ões)` : ''}`)
      },
    }).addTo(map)
    camadaRef.current = camada

    const limites = camada.getBounds()
    if (limites.isValid()) map.fitBounds(limites, { padding: [16, 16] })

    setEstado('pronto')
  }

  useEffect(
    () => () => {
      mapRef.current?.remove()
      mapRef.current = null
    },
    []
  )

  // O cabeçalho da secção vive AQUI, não em quem chama este componente: se vivesse lá fora, um
  // relatório sem províncias identificáveis (internacional, ou nomes que não batem) ficava com um
  // título "Onde este relatório se passa" por cima de nada, porque só o mapa sabe, depois de
  // perguntar à API, se há alguma coisa para mostrar.
  if (estado === 'vazio' || estado === 'erro') return null

  return (
    <section className="rpt-digesto-seccao">
      <h3>Onde este relatório se passa</h3>
      <div className="rpt-digesto-mapa">
        {estado === 'a_carregar' && (
          <div className="rpt-digesto-mapa-estado">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span>A localizar as províncias mencionadas…</span>
          </div>
        )}
        <div ref={containerRef} className="rpt-digesto-mapa-canvas" aria-label="Mapa das províncias mencionadas no relatório" />
        {estado === 'pronto' && (
          <p className="rpt-digesto-mapa-legenda">
            <MapPin className="size-3.5" aria-hidden />
            {unidades.length === 1
              ? `${unidades[0].nome} é a única província que este relatório menciona.`
              : `${unidades.length} províncias mencionadas; a cor mais forte é a mais citada no texto.`}
          </p>
        )}
      </div>
    </section>
  )
}
