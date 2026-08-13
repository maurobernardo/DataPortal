'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'

const CAMADAS_BASE = {
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

type Unidade = { codigo: string; nome: string; valor: number; categoria?: string }
type FeatureColecao = {
  type: 'FeatureCollection'
  features: { type: 'Feature'; properties: { codigo: string; nome: string }; geometry: any }[]
}

const COR_SEM_DADOS = '#E2E8E5'

// Escala em degraus (não gradiente contínuo): mais fácil de distinguir uma unidade da vizinha a
// olho nu, que é o que "mapa nítido" pede — um gradiente suave esconde exactamente a fronteira
// entre unidades parecidas que um mapa devia mostrar.
const DEGRAUS_CONTINUO = ['#E7F3EB', '#B8DBC8', '#7BB596', '#3D8B5F', '#0a6339', '#064E2C']

// Convenção cartográfica standard para hotspot/coldspot (LISA, Gi*): vermelho = concentração
// alta, azul = concentração baixa, cinza = não significativo. Manter isto em vez de variações de
// verde porque aqui a cor tem de codificar DIRECÇÃO (alto vs baixo), não só magnitude.
const CORES_CATEGORIA: Record<string, string> = {
  hotspot_99: '#7F1D1D', hotspot_95: '#B91C1C', hotspot_90: '#EF4444',
  'alto-alto': '#B91C1C', 'alto-baixo': '#F59E0B',
  coldspot_90: '#93C5FD', coldspot_95: '#3B82F6', coldspot_99: '#1E40AF',
  'baixo-alto': '#60A5FA', 'baixo-baixo': '#1E40AF',
  nao_significativo: '#D1D5DB', ns: '#D1D5DB',
}
const ROTULO_CATEGORIA: Record<string, string> = {
  hotspot_99: 'Hotspot (99%)', hotspot_95: 'Hotspot (95%)', hotspot_90: 'Hotspot (90%)',
  coldspot_90: 'Coldspot (90%)', coldspot_95: 'Coldspot (95%)', coldspot_99: 'Coldspot (99%)',
  'alto-alto': 'Alto-alto', 'alto-baixo': 'Alto-baixo', 'baixo-alto': 'Baixo-alto', 'baixo-baixo': 'Baixo-baixo',
  nao_significativo: 'Não significativo', ns: 'Não significativo',
}

function corPorDegrau(t: number): string {
  const i = t >= 1 ? DEGRAUS_CONTINUO.length - 1 : Math.max(0, Math.floor(t * DEGRAUS_CONTINUO.length))
  return DEGRAUS_CONTINUO[i]
}

function formatarValor(v: number): string {
  const casas = Number.isInteger(v) ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2
  return v.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

/** Um gráfico usa nomes abreviados no eixo ("Maputo C."), o mapa usa o nome completo da unidade
 *  ("Maputo Cidade"): compara por prefixo em vez de igualdade exacta. */
function corresponde(nomeUnidade: string, alvo: string): boolean {
  const a = normalizar(nomeUnidade)
  const b = normalizar(alvo).replace(/\.$/, '')
  return a === b || a.startsWith(b) || b.startsWith(a)
}

/**
 * Coroplético (Parte 10 do documento).
 *
 * O casamento entre geometria e valor é por código, não por nome: as séries do motor já vêm
 * ligadas a geo_unidades por código exacto, o que evita a ambiguidade de nomes que apareceu no
 * motor de análise (Maputo Cidade vs Maputo Província normalizavam ao mesmo nome).
 *
 * R10: unidades sem valor aparecem a cinzento explícito com entrada própria na legenda, nunca
 * brancas nem omitidas do mapa.
 *
 * `modo='categorico'` troca a escala contínua por cores fixas por categoria (hotspot/coldspot,
 * quadrante LISA): aqui a cor tem de codificar uma classe discreta, não uma posição numa escala.
 */
export function AnaliseMapaCoropletico({
  geojson,
  unidades,
  metrica,
  modo = 'continuo',
  unidadeDestacada = null,
}: {
  geojson: FeatureColecao
  unidades: Unidade[]
  metrica: string
  modo?: 'continuo' | 'categorico'
  /** Nome de uma unidade a realçar (Parte 20-bis: clicar num gráfico destaca-a aqui). */
  unidadeDestacada?: string | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const camadaBaseRef = useRef<any>(null)
  const [camadaBase, setCamadaBase] = useState<keyof typeof CAMADAS_BASE>('rua')

  const valores = unidades.map((u) => u.valor)
  const min = valores.length ? Math.min(...valores) : 0
  const max = valores.length ? Math.max(...valores) : 1

  const categoriasPresentes =
    modo === 'categorico'
      ? Array.from(new Set(unidades.map((u) => u.categoria).filter((c): c is string => !!c)))
      : []

  useEffect(() => {
    if (!containerRef.current || geojson.features.length === 0) return
    let cancelado = false

    const porCodigo = new Map(unidades.map((u) => [u.codigo, u]))

    import('leaflet').then((L) => {
      if (cancelado || !containerRef.current) return

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false }).setView([-18.5, 35], 5)
      } else {
        mapRef.current.eachLayer((camada) => {
          if ((camada as any).feature) mapRef.current!.removeLayer(camada)
        })
      }

      if (camadaBaseRef.current) mapRef.current.removeLayer(camadaBaseRef.current)
      const cfgBase = CAMADAS_BASE[camadaBase]
      camadaBaseRef.current = L.tileLayer(cfgBase.url, { attribution: cfgBase.atribuicao, maxZoom: 19 }).addTo(
        mapRef.current
      )

      const geoLayer = L.geoJSON(geojson as any, {
        style: (feature) => {
          const u = porCodigo.get(feature?.properties?.codigo)
          const destacada = !!unidadeDestacada && corresponde(feature?.properties?.nome || '', unidadeDestacada)
          // Com uma unidade destacada, as restantes esbatem-se (tipo Power BI: o clique filtra a
          // atenção visual, não é só um contorno a competir por cima da cor cheia de todas).
          const esbatida = !!unidadeDestacada && !destacada
          if (u === undefined) {
            return {
              color: destacada ? '#B91C1C' : '#ffffff',
              weight: destacada ? 4 : 1,
              fillColor: COR_SEM_DADOS,
              fillOpacity: esbatida ? 0.2 : 0.6,
            }
          }
          const cor =
            modo === 'categorico'
              ? CORES_CATEGORIA[u.categoria || 'nao_significativo'] || COR_SEM_DADOS
              : corPorDegrau(max === min ? 0 : (u.valor - min) / (max - min))
          return {
            color: destacada ? '#B91C1C' : '#ffffff',
            weight: destacada ? 4 : 1.2,
            fillColor: cor,
            fillOpacity: esbatida ? 0.22 : 0.88,
          }
        },
        onEachFeature: (feature, layer) => {
          const nome = feature?.properties?.nome || ''
          const u = porCodigo.get(feature?.properties?.codigo)
          const linha2 =
            u === undefined
              ? 'Sem dados'
              : modo === 'categorico'
                ? ROTULO_CATEGORIA[u.categoria || 'nao_significativo'] || u.categoria
                : formatarValor(u.valor)
          layer.bindTooltip(`<strong>${nome}</strong><br/>${linha2}`, { sticky: true })
          // Só traz para a frente (o contorno vermelho não pode ficar tapado pela vizinha) — NÃO
          // muda o zoom/vista: destacar uma unidade esconder as outras do ecrã seria pior do que
          // não destacar nada, já que o hover deixa de funcionar em tudo o resto.
          if (unidadeDestacada && corresponde(nome, unidadeDestacada)) (layer as any).bringToFront?.()
        },
      })
      geoLayer.addTo(mapRef.current)

      // O container pode ainda não ter as dimensões finais no primeiro paint — sem
      // invalidateSize antes do fitBounds, o Leaflet calcula o zoom com base numa caixa errada e
      // mostra a África Austral inteira em vez de aproximar à(s) unidade(s) em causa (mesma causa
      // já corrigida em DatasetMapPreview.tsx).
      function ajustarEnquadramento(tentativas = 0) {
        const largura = containerRef.current?.offsetWidth || 0
        if (largura === 0 && tentativas < 20) {
          requestAnimationFrame(() => ajustarEnquadramento(tentativas + 1))
          return
        }
        mapRef.current?.invalidateSize()
        try {
          const bounds = geoLayer.getBounds()
          if (bounds.isValid()) mapRef.current?.fitBounds(bounds, { padding: [16, 16], animate: false })
        } catch {
          /* limites inválidos: mantém a vista por defeito */
        }
      }
      requestAnimationFrame(() => ajustarEnquadramento())
    })

    return () => {
      cancelado = true
    }
  }, [geojson, unidades, min, max, modo, camadaBase, unidadeDestacada])

  useEffect(
    () => () => {
      mapRef.current?.remove()
      mapRef.current = null
    },
    []
  )

  if (geojson.features.length === 0) {
    return (
      <p className="text-[13px] text-gray-400 py-8 text-center">
        Sem geometria disponível para desenhar o mapa a este nível.
      </p>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <div className="inline-flex rounded-lg border border-[#E2E8E5] p-0.5">
          {(Object.keys(CAMADAS_BASE) as (keyof typeof CAMADAS_BASE)[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setCamadaBase(k)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] ${
                camadaBase === k ? 'bg-[#064E2C] text-white' : 'text-[var(--pd-ink-700)] hover:bg-gray-50'
              }`}
            >
              {CAMADAS_BASE[k].rotulo}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[380px] rounded-xl overflow-hidden" />
      {modo === 'categorico' ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 px-1">
          {categoriasPresentes.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="size-2.5 rounded-sm" style={{ background: CORES_CATEGORIA[c] || COR_SEM_DADOS }} aria-hidden />
              {ROTULO_CATEGORIA[c] || c}
            </span>
          ))}
          <span className="text-[11px] text-gray-500 ml-auto">{metrica}</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 mt-3 px-1">
          <span className="text-[11px] text-gray-500">{formatarValor(min)}</span>
          <div className="h-2.5 flex-1 rounded-full overflow-hidden flex" aria-hidden>
            {DEGRAUS_CONTINUO.map((cor) => (
              <span key={cor} className="flex-1 h-full" style={{ background: cor }} />
            ))}
          </div>
          <span className="text-[11px] text-gray-500">{formatarValor(max)}</span>
          <span className="text-[11px] text-gray-500 ml-2">{metrica}</span>
          <span className="inline-flex items-center gap-1.5 ml-auto text-[11px] text-gray-500">
            <span className="size-2.5 rounded-sm" style={{ background: COR_SEM_DADOS }} aria-hidden />
            Sem dados
          </span>
        </div>
      )}
    </div>
  )
}
