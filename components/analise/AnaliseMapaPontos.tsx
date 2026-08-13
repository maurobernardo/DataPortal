'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapIcon, List, Flame, Crop, X } from 'lucide-react'
import type { Map as LeafletMap } from 'leaflet'
import { rotularColuna, gerarPaletaCategorica, traduzirValorCategoria } from '@/lib/analysis/rotulos-cliente'

type Camada = {
  dataset_id: number
  titulo: string
  tipoGeometria: string
  colunasCategoricas: string[]
  features: { nome: string; categorias: Record<string, string>; geometry: any }[]
  truncado: boolean
}

const COR_PONTO = '#B45309'

const ROTULO_TIPO: Record<string, string> = {
  Point: 'pontos',
  MultiPoint: 'pontos',
  LineString: 'linhas',
  MultiLineString: 'linhas',
  Polygon: 'polígonos',
  MultiPolygon: 'polígonos',
}

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

const promessasScript = new Map<string, Promise<void>>()

/**
 * leaflet.markercluster e leaflet.heat só se registam a si próprios (`L.markerClusterGroup`,
 * `L.heatLayer`) se `L` já existir como variável verdadeiramente global — nenhum dos dois é
 * ESM. Importá-los via `import()` do bundler (`webpack`) mostrou-se pouco fiável nesta app: a
 * mutação em `L` por vezes não ficava visível ao código que a lia a seguir, de forma
 * intermitente e difícil de reproduzir (confirmado em runtime, mais do que uma vez). Uma tag
 * <script> real, apontando para o ficheiro servido como asset estático, corre sempre no
 * contexto global verdadeiro do browser — sem ambiguidade de bundler/HMR — e é exactamente como
 * estes plugins foram desenhados para ser carregados.
 */
function carregarScriptGlobal(src: string, jaCarregado: () => boolean): Promise<void> {
  if (jaCarregado()) return Promise.resolve()
  const existente = promessasScript.get(src)
  if (existente) return existente
  const promessa = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      promessasScript.delete(src)
      reject(new Error(`Falha ao carregar ${src}`))
    }
    document.head.appendChild(script)
  })
  promessasScript.set(src, promessa)
  return promessa
}

/** Extrai [lat, lng] de cada vértice de ponto de uma feição — só Point/MultiPoint têm sentido
 *  para calor e para contagem por área; linhas/polígonos não entram nesta contagem. */
function pontosDaFeature(geometry: any): [number, number][] {
  if (!geometry?.type || !geometry?.coordinates) return []
  if (geometry.type === 'Point') return [[geometry.coordinates[1], geometry.coordinates[0]]]
  if (geometry.type === 'MultiPoint') return geometry.coordinates.map((c: number[]) => [c[1], c[0]])
  return []
}

/**
 * Desenha a geometria própria do dataset (Parte 10-ter): um coroplético agregado por província
 * responde "onde se concentra", mas para "quantas unidades sanitárias há e onde estão" a resposta
 * certa é a localização real de cada uma — pontos para dataset de pontos, linhas para dataset de
 * linhas, polígonos para dataset de polígonos. Nunca força tudo a virar coroplético.
 *
 * Quando o dataset tem uma coluna de poucas categorias (tipologia, propriedade, ...), cada uma
 * vira um filtro clicável: mostrar/esconder e colorir por categoria, tal como o coroplético já
 * deixa trocar entre Rua/Satélite — os dois mapas da mesma análise não podem ter controlos
 * diferentes um do outro.
 */
export function AnaliseMapaPontos({
  camada: camadaBruta,
  bboxFoco,
}: {
  camada: Camada
  /** [oeste, sul, leste, norte] — quando a pergunta ficou restrita a uma unidade (filtro_unidade),
   *  aproximar a essa área é mais útil do que mostrar sempre o dataset inteiro; sem isto, uma
   *  pergunta sobre um distrito específico continuava a mostrar 1500+ pontos do país inteiro. */
  bboxFoco?: [number, number, number, number] | null
}) {
  // Análises guardadas antes desta funcionalidade têm o formato antigo (uma só
  // `colunaCategoria`/`categoria` em vez de `colunasCategoricas`/`categorias`) — normaliza aqui
  // para essas análises continuarem a abrir sem rebentar, em vez de forçar a reprocessar tudo.
  const camada: Camada = useMemo(() => {
    const c: any = camadaBruta
    if (Array.isArray(c?.colunasCategoricas)) return c as Camada
    const coluna = c?.colunaCategoria
    return {
      ...c,
      colunasCategoricas: coluna ? [coluna] : [],
      features: (c?.features || []).map((f: any) => ({
        ...f,
        categorias: coluna && f.categoria ? { [coluna]: f.categoria } : {},
      })),
    }
  }, [camadaBruta])

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const camadaBaseRef = useRef<any>(null)
  const [camadaBase, setCamadaBase] = useState<keyof typeof CAMADAS_BASE>('rua')
  const [vista, setVista] = useState<'mapa' | 'lista'>('mapa')
  const [expandido, setExpandido] = useState(false)
  const [modoVisual, setModoVisual] = useState<'marcadores' | 'calor'>('marcadores')
  const [seleccaoActiva, setSeleccaoActiva] = useState(false)
  const [estatisticasArea, setEstatisticasArea] = useState<{ total: number; porCategoria: [string, number][] } | null>(
    null
  )

  // A mesma camada pode ter várias colunas com sentido para colorir/filtrar (ex.: tipo de
  // unidade E província) — o utilizador escolhe qual usar em vez de o mapa fixar uma só à força.
  const [colunaActiva, setColunaActiva] = useState<string | null>(camada.colunasCategoricas[0] ?? null)
  useEffect(() => {
    setColunaActiva(camada.colunasCategoricas[0] ?? null)
  }, [camada])

  const categorias = useMemo(() => {
    if (!colunaActiva) return []
    return Array.from(new Set(camada.features.map((f) => f.categorias[colunaActiva]).filter((c): c is string => !!c))).sort()
  }, [camada, colunaActiva])
  const [categoriasActivas, setCategoriasActivas] = useState<Set<string>>(new Set())

  useEffect(() => {
    setCategoriasActivas(new Set(categorias))
  }, [categorias])

  const corPorCategoria = useMemo(() => {
    const mapa = new Map<string, string>()
    const paleta = gerarPaletaCategorica(categorias.length)
    categorias.forEach((c, i) => mapa.set(c, paleta[i]))
    return mapa
  }, [categorias])

  function alternarCategoria(c: string) {
    setCategoriasActivas((prev) => {
      const seguinte = new Set(prev)
      if (seguinte.has(c)) seguinte.delete(c)
      else seguinte.add(c)
      return seguinte
    })
  }

  const featuresVisiveis = useMemo(
    () =>
      categorias.length === 0 || !colunaActiva
        ? camada.features
        : camada.features.filter((f) => !f.categorias[colunaActiva] || categoriasActivas.has(f.categorias[colunaActiva])),
    [camada, categorias, categoriasActivas, colunaActiva]
  )

  const camadaDadosRef = useRef<any>(null)
  const camadaCalorRef = useRef<any>(null)

  // Handlers de arrastar-para-seleccionar precisam do estado mais recente, mas são registados
  // uma única vez (na criação do mapa); refs evitam fecho sobre valores desactualizados de
  // seleccaoActiva/featuresVisiveis sem ter de recriar o mapa a cada mudança.
  const seleccaoActivaRef = useRef(seleccaoActiva)
  useEffect(() => {
    seleccaoActivaRef.current = seleccaoActiva
  }, [seleccaoActiva])
  const featuresVisiveisRef = useRef(featuresVisiveis)
  useEffect(() => {
    featuresVisiveisRef.current = featuresVisiveis
  }, [featuresVisiveis])
  const colunaActivaRef = useRef(colunaActiva)
  useEffect(() => {
    colunaActivaRef.current = colunaActiva
  }, [colunaActiva])
  const rectanguloRef = useRef<any>(null)
  const inicioSeleccaoRef = useRef<any>(null)

  function configurarSeleccaoArea(L: any, map: LeafletMap) {
    let aArrastar: any = null
    map.on('mousedown', (e: any) => {
      if (!seleccaoActivaRef.current) return
      map.dragging.disable()
      inicioSeleccaoRef.current = e.latlng
      if (rectanguloRef.current) {
        map.removeLayer(rectanguloRef.current)
        rectanguloRef.current = null
      }
      rectanguloRef.current = L.rectangle(L.latLngBounds(e.latlng, e.latlng), {
        color: '#064E2C',
        weight: 2,
        fillOpacity: 0.08,
        dashArray: '4',
      }).addTo(map)

      aArrastar = (ev: any) => {
        if (!inicioSeleccaoRef.current || !rectanguloRef.current) return
        rectanguloRef.current.setBounds(L.latLngBounds(inicioSeleccaoRef.current, ev.latlng))
      }
      map.on('mousemove', aArrastar)

      map.once('mouseup', (ev: any) => {
        map.off('mousemove', aArrastar)
        map.dragging.enable()
        if (!inicioSeleccaoRef.current || !rectanguloRef.current) return
        const bounds = L.latLngBounds(inicioSeleccaoRef.current, ev.latlng)
        inicioSeleccaoRef.current = null
        // Um clique sem arrastar não é uma área: descarta em vez de "seleccionar" um único ponto.
        if (bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 50) {
          map.removeLayer(rectanguloRef.current)
          rectanguloRef.current = null
          return
        }
        let total = 0
        const contagem = new Map<string, number>()
        const coluna = colunaActivaRef.current
        for (const f of featuresVisiveisRef.current) {
          for (const [lat, lng] of pontosDaFeature(f.geometry)) {
            if (bounds.contains([lat, lng])) {
              total++
              const cat = coluna ? f.categorias[coluna] : undefined
              if (cat) contagem.set(cat, (contagem.get(cat) || 0) + 1)
            }
          }
        }
        setEstatisticasArea({ total, porCategoria: Array.from(contagem).sort((a, b) => b[1] - a[1]) })
      })
    })
  }

  useEffect(() => {
    if (!containerRef.current || camada.features.length === 0) return
    let cancelado = false

    import('leaflet')
      .then(async (Limportado) => {
        // Este efeito pode correr mais do que uma vez em sobreposição (ex.: dupla invocação em
        // desenvolvimento, ou uma mudança de estado logo a seguir ao mount) — cada invocação
        // capturaria o seu próprio `L` da promessa de import(). Ler sempre de `window.L` (nunca
        // do `L` local desta closure) garante que todas as invocações vêem a MESMA mutação,
        // não importa qual delas tenha sido a que efectivamente carregou os scripts dos plugins.
        if (!(globalThis as any).L) (globalThis as any).L = Limportado
        const L = (globalThis as any).L
        await carregarScriptGlobal('/vendor/leaflet.markercluster.js', () => !!(globalThis as any).L?.markerClusterGroup)
        await carregarScriptGlobal('/vendor/leaflet-heat.js', () => !!(globalThis as any).L?.heatLayer)
        return L
      })
      .then((_L) => {
      const L = (globalThis as any).L
      if (cancelado || !containerRef.current) return

      const mapaNovo = !mapRef.current
      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false }).setView([-18.5, 35], 5)
      }
      const map = mapRef.current
      if (!map) return

      if (camadaDadosRef.current) map.removeLayer(camadaDadosRef.current)
      if (camadaCalorRef.current) map.removeLayer(camadaCalorRef.current)

      if (camadaBaseRef.current) map.removeLayer(camadaBaseRef.current)
      const cfgBase = CAMADAS_BASE[camadaBase]
      camadaBaseRef.current = L.tileLayer(cfgBase.url, { attribution: cfgBase.atribuicao, maxZoom: 19 }).addTo(map)

      const ehPontos = camada.tipoGeometria === 'Point' || camada.tipoGeometria === 'MultiPoint'

      if (ehPontos && modoVisual === 'calor' && (L as any).heatLayer) {
        const pontos = featuresVisiveis.flatMap((f) => pontosDaFeature(f.geometry))
        // Raio pequeno de propósito: com centenas/milhares de pontos espalhados pelo país inteiro
        // a zoom baixo, um raio grande (ex.: 22px) sobrepõe-se por completo e pinta um bloco azul
        // sólido que tapa o mapa base — não mostra concentração nenhuma. Um raio menor deixa as
        // zonas de facto mais densas destacarem-se (amarelo/vermelho) sobre as mais dispersas.
        camadaCalorRef.current = (L as any).heatLayer(pontos, { radius: 10, blur: 8, maxZoom: 14 }).addTo(map)
        camadaDadosRef.current = null
      } else {
        const colecao = {
          type: 'FeatureCollection' as const,
          features: featuresVisiveis.map((f) => ({
            type: 'Feature' as const,
            properties: { nome: f.nome, categoria: colunaActiva ? f.categorias[colunaActiva] : undefined },
            geometry: f.geometry,
          })),
        }

        const geoLayer = L.geoJSON(colecao as any, {
          pointToLayer: (f: any, latlng: any) => {
            const cor = (f.properties?.categoria && corPorCategoria.get(f.properties.categoria)) || COR_PONTO
            return L.circleMarker(latlng, { radius: 4, color: cor, weight: 1, fillColor: cor, fillOpacity: 0.75 })
          },
          style: (f: any) => {
            const cor = (f?.properties?.categoria && corPorCategoria.get(f.properties.categoria)) || COR_PONTO
            return { color: cor, weight: camada.tipoGeometria.includes('Polygon') ? 1.5 : 2.5, fillColor: cor, fillOpacity: 0.25 }
          },
          onEachFeature: (feature: any, layer: any) => {
            const linha2 = feature?.properties?.categoria
              ? `<br/>${rotularColuna(colunaActiva || '')}: ${traduzirValorCategoria(feature.properties.categoria)}`
              : ''
            layer.bindTooltip(`<strong>${feature?.properties?.nome || camada.titulo}</strong>${linha2}`, { sticky: true })
          },
        })

        // Um dataset de pontos com centenas/milhares de registos (ex.: 1577 unidades sanitárias)
        // vira uma mancha azul indistinguível a zoom de país inteiro sem agrupamento. Pontos
        // agrupam-se; linhas e polígonos não têm essa noção, vão directos para o mapa.
        if (ehPontos && (L as any).markerClusterGroup) {
          const grupo = (L as any).markerClusterGroup({
            maxClusterRadius: 45,
            disableClusteringAtZoom: 12,
            // Sem isto, o Leaflet colore os agrupamentos por tamanho (laranja/amarelo, sem
            // relação nenhuma com a legenda) — quem olha para o mapa zoomed-out não consegue
            // ligar a bolha ao tipo de unidade. Colorir pela categoria mais frequente dentro de
            // cada agrupamento mantém a cor com o mesmo significado em toda a escala de zoom.
            ...(colunaActiva && categorias.length > 0
              ? {
                  iconCreateFunction: (cluster: any) => {
                    const filhos = cluster.getAllChildMarkers()
                    const contagemPorCategoria = new Map<string, number>()
                    for (const m of filhos) {
                      const cat = m.feature?.properties?.categoria
                      if (cat) contagemPorCategoria.set(cat, (contagemPorCategoria.get(cat) || 0) + 1)
                    }
                    let corDominante = COR_PONTO
                    let maiorContagem = 0
                    contagemPorCategoria.forEach((n, cat) => {
                      if (n > maiorContagem) {
                        maiorContagem = n
                        corDominante = corPorCategoria.get(cat) || COR_PONTO
                      }
                    })
                    const total = filhos.length
                    const tamanho = total < 10 ? 32 : total < 100 ? 40 : 48
                    return L.divIcon({
                      html: `<div style="background:${corDominante};width:${tamanho}px;height:${tamanho}px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;border:2px solid rgba(255,255,255,0.85);box-shadow:0 1px 4px rgba(0,0,0,0.35);">${total}</div>`,
                      className: '',
                      iconSize: [tamanho, tamanho],
                    })
                  },
                }
              : {}),
          })
          grupo.addLayer(geoLayer)
          grupo.addTo(map)
          camadaDadosRef.current = grupo
        } else {
          geoLayer.addTo(map)
          camadaDadosRef.current = geoLayer
        }

        try {
          if (bboxFoco) {
            const [oeste, sul, leste, norte] = bboxFoco
            map.fitBounds([[sul, oeste], [norte, leste]], { padding: [24, 24] })
          } else {
            const bounds = geoLayer.getBounds()
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [16, 16] })
          }
        } catch {
          /* limites inválidos ou colecção vazia: mantém a vista actual */
        }
      }

      if (mapaNovo) configurarSeleccaoArea(L, map)
    })

    return () => {
      cancelado = true
    }
  }, [camada, camadaBase, featuresVisiveis, corPorCategoria, modoVisual, bboxFoco])

  useEffect(
    () => () => {
      mapRef.current?.remove()
      mapRef.current = null
    },
    []
  )

  // O contentor do mapa fica sempre montado (só com display:none em "Lista"): esconder e voltar
  // a mostrar deixa o Leaflet com o tamanho antigo em cache (0×0 enquanto escondido). Chamar
  // invalidateSize() imediatamente dentro do próprio callback do ResizeObserver, antes do browser
  // ter terminado de aplicar o novo layout, criava tiles com largura 0 presa (confirmado: as
  // imagens ficavam "loaded" mas com getBoundingClientRect().width = 0 para sempre, mesmo depois
  // do contentor voltar ao tamanho normal). Esperar pelo próximo frame garante que o layout já
  // assentou antes do Leaflet recalcular e voltar a pedir/posicionar os tiles.
  useEffect(() => {
    if (!containerRef.current) return
    const observador = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        mapRef.current?.invalidateSize()
      })
    })
    observador.observe(containerRef.current)
    return () => observador.disconnect()
  }, [])

  if (camada.features.length === 0) return null

  const ehPontos = camada.tipoGeometria === 'Point' || camada.tipoGeometria === 'MultiPoint'
  const rotuloTipo = ROTULO_TIPO[camada.tipoGeometria] || 'feições'
  const listaOrdenada = [...featuresVisiveis].sort((a, b) => a.nome.localeCompare(b.nome))
  const listaVisivel = expandido ? listaOrdenada : listaOrdenada.slice(0, 30)

  return (
    <div className="rounded-[14px] border border-[#E2E8E5] bg-white p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-base font-bold text-[var(--pd-ink-900)]">{camada.titulo}: localização real</h2>
        <span className="text-[11px] text-gray-500 shrink-0">
          {featuresVisiveis.length} de {camada.features.length} {rotuloTipo}
          {camada.truncado ? ' (amostra)' : ''}
        </span>
      </div>

      {camada.colunasCategoricas.length > 1 && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[11px] font-semibold text-gray-500">Colorir por:</span>
          <div className="inline-flex flex-wrap rounded-lg border border-[#E2E8E5] p-0.5">
            {camada.colunasCategoricas.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColunaActiva(c)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] ${
                  colunaActiva === c ? 'bg-[#064E2C] text-white' : 'text-[var(--pd-ink-700)] hover:bg-gray-50'
                }`}
              >
                {rotularColuna(c)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        {categorias.length > 0 ? (
          <div>
            {colunaActiva && (
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Legenda — {rotularColuna(colunaActiva)}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {categorias.map((c) => {
                const activa = categoriasActivas.has(c)
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => alternarCategoria(c)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] ${
                      activa ? 'border-transparent text-white' : 'border-[#E2E8E5] text-gray-400 bg-white'
                    }`}
                    style={activa ? { background: corPorCategoria.get(c) } : undefined}
                  >
                    {traduzirValorCategoria(c)}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="inline-flex rounded-lg border border-[#E2E8E5] p-0.5">
            <button
              type="button"
              onClick={() => setVista('mapa')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] ${
                vista === 'mapa' ? 'bg-[#064E2C] text-white' : 'text-[var(--pd-ink-700)] hover:bg-gray-50'
              }`}
            >
              <MapIcon className="size-3.5" aria-hidden />
              Mapa
            </button>
            <button
              type="button"
              onClick={() => setVista('lista')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] ${
                vista === 'lista' ? 'bg-[#064E2C] text-white' : 'text-[var(--pd-ink-700)] hover:bg-gray-50'
              }`}
            >
              <List className="size-3.5" aria-hidden />
              Lista
            </button>
          </div>
          {vista === 'mapa' && (
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
          )}
          {vista === 'mapa' && ehPontos && (
            <button
              type="button"
              onClick={() => setModoVisual((v) => (v === 'calor' ? 'marcadores' : 'calor'))}
              title="Mapa de calor"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] ${
                modoVisual === 'calor' ? 'bg-[#064E2C] text-white border-transparent' : 'border-[#E2E8E5] text-[var(--pd-ink-700)] hover:bg-gray-50'
              }`}
            >
              <Flame className="size-3.5" aria-hidden />
              Calor
            </button>
          )}
          {vista === 'mapa' && (
            <button
              type="button"
              onClick={() => {
                setSeleccaoActiva((v) => !v)
                if (seleccaoActiva) setEstatisticasArea(null)
              }}
              title="Seleccionar área no mapa"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] ${
                seleccaoActiva ? 'bg-[#064E2C] text-white border-transparent' : 'border-[#E2E8E5] text-[var(--pd-ink-700)] hover:bg-gray-50'
              }`}
            >
              <Crop className="size-3.5" aria-hidden />
              Área
            </button>
          )}
        </div>
      </div>

      {/* Leaflet acrescenta as suas próprias classes (leaflet-container, etc.) directamente ao
          contentor via manipulação de DOM fora do React. Se o className deste div fosse
          condicional a `vista`, cada troca Lista/Mapa fazia o React reescrever o atributo
          className por inteiro e apagava as classes do Leaflet — sem "leaflet-container", as
          regras de CSS do Leaflet para os tiles deixam de se aplicar e o reset do Tailwind
          (img{'{max-width:100%}'}) faz os tiles colapsar para largura 0 (confirmado em runtime).
          Por isso o wrapper (visível/escondido) e o contentor do Leaflet (className estático,
          nunca tocado outra vez pelo React) têm de ser dois elementos separados. */}
      <div className={vista === 'mapa' ? 'w-full h-[380px] rounded-xl overflow-hidden' : 'hidden'}>
        <div ref={containerRef} className="w-full h-full" style={seleccaoActiva ? { cursor: 'crosshair' } : undefined} />
      </div>

      {vista === 'mapa' && estatisticasArea && (
        <div className="mt-2 rounded-lg border border-[#E2E8E5] bg-[#F7F9F8] p-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[12.5px] font-bold text-[var(--pd-ink-900)]">
              {estatisticasArea.total} {rotuloTipo} na área seleccionada
            </p>
            {estatisticasArea.porCategoria.length > 0 && (
              <ul className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {estatisticasArea.porCategoria.map(([cat, n]) => (
                  <li key={cat} className="text-[11px] text-gray-600">
                    <span className="font-semibold" style={{ color: corPorCategoria.get(cat) || COR_PONTO }}>
                      {traduzirValorCategoria(cat)}
                    </span>
                    : {n}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEstatisticasArea(null)}
            className="text-gray-400 hover:text-gray-700 shrink-0"
            aria-label="Fechar estatísticas da área"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      )}

      {vista === 'lista' && (
        <div className="max-h-[380px] overflow-y-auto rounded-xl border border-[#E2E8E5]">
          <ul className="divide-y divide-[#E2E8E5]">
            {listaVisivel.map((f, i) => {
              const cat = colunaActiva ? f.categorias[colunaActiva] : undefined
              return (
                <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-[13px] text-[var(--pd-ink-800)] truncate">{f.nome}</span>
                  {cat && (
                    <span
                      className="shrink-0 text-[10.5px] font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ background: corPorCategoria.get(cat) || COR_PONTO }}
                    >
                      {traduzirValorCategoria(cat)}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          {listaOrdenada.length > 30 && (
            <button
              type="button"
              onClick={() => setExpandido((v) => !v)}
              className="w-full text-center py-2 text-[12px] font-semibold text-[#064E2C] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C]"
            >
              {expandido ? 'Mostrar menos' : `Ver as ${listaOrdenada.length} unidades`}
            </button>
          )}
        </div>
      )}

      {categorias.length === 0 && vista === 'mapa' && (
        <div className="flex items-center gap-1.5 mt-3 px-1 text-[11px] text-gray-500">
          <span className="size-2.5 rounded-full" style={{ background: COR_PONTO }} aria-hidden />
          {camada.titulo} ({rotuloTipo})
        </div>
      )}
    </div>
  )
}
