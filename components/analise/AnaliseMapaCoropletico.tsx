'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight as ChevronRightIcon, Crop, Download, Scale, Search, X } from 'lucide-react'
import type { Map as LeafletMap } from 'leaflet'
import {
  CLASSES_MUDANCA,
  CLASSES_TEMATICAS,
  calcularLimites,
  classeDeMudanca,
  classeParaValor,
  limitesMudanca,
  type EsquemaClassificacao,
} from '@/lib/analysis/simbologia'

const CAMADAS_BASE = {
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

type Unidade = { codigo: string; nome: string; valor: number; categoria?: string }
type FeatureColecao = {
  type: 'FeatureCollection'
  features: { type: 'Feature'; properties: { codigo: string; nome: string }; geometry: any }[]
}

// Cinzento neutro, não um tom da paleta: "sem dados" não é uma classe da escala, e um creme
// aqui deixava-se confundir com a classe mais baixa.
const COR_SEM_DADOS = '#dcd8cc'
/** Área de fundo quando o valor vai nos símbolos: presente, mas sem competir com os círculos. */
const COR_AREA_NEUTRA = '#eee8d6'
const COR_SIMBOLO = '#175a41'
/** Um círculo abaixo disto não se vê; acima disto os maiores tapam os vizinhos. */
const RAIO_MINIMO = 4
const RAIO_MAXIMO = 26

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
  forma = 'coropletico',
  unidadeDestacada = null,
  provincias,
}: {
  geojson: FeatureColecao
  unidades: Unidade[]
  metrica: string
  modo?: 'continuo' | 'categorico'
  /**
   * Como pintar o que foi medido.
   *
   * `coropletico` enche a área com a cor da classe. Só é honesto para taxas, percentagens e
   * densidades: uma CONTAGEM pintada assim faz uma província grande parecer melhor servida por
   * ser grande, e não por ter mais.
   *
   * `simbolos` deixa as áreas neutras e põe um círculo em cada uma, com a ÁREA do círculo
   * proporcional ao valor. O tamanho do polígono deixa de contar para nada, que é exactamente o
   * que se quer quando o valor é uma contagem.
   */
  forma?: 'coropletico' | 'simbolos' | 'mudanca'
  /** Nome de uma unidade a realçar (Parte 20-bis: clicar num gráfico destaca-a aqui). */
  unidadeDestacada?: string | null
  /** Nomes de província por código (2 primeiros dígitos do pcode) — quando presente, mostra o
   *  filtro por província mesmo que a série esteja a um nível mais fino (distrito/posto). */
  provincias?: { codigo: string; nome: string }[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const camadaBaseRef = useRef<any>(null)
  const [camadaBase, setCamadaBase] = useState<keyof typeof CAMADAS_BASE>('rua')
  const [provinciaFiltro, setProvinciaFiltro] = useState<string | null>(null)
  const [distritoFiltro, setDistritoFiltro] = useState<string | null>(null)
  const [esquema, setEsquema] = useState<EsquemaClassificacao>('quartis')
  const [seleccaoActiva, setSeleccaoActiva] = useState(false)
  const [estatisticasArea, setEstatisticasArea] = useState<{ unidades: Unidade[]; soma: number } | null>(null)
  const [pesquisa, setPesquisa] = useState('')
  const [compararActivo, setCompararActivo] = useState(false)
  const [comparar, setComparar] = useState<Unidade[]>([])
  const geoLayerRef = useRef<any>(null)
  const camadaSimbolosRef = useRef<any>(null)
  const porCodigoRef = useRef<Map<string, Unidade>>(new Map())
  const seleccaoActivaRef = useRef(seleccaoActiva)
  useEffect(() => {
    seleccaoActivaRef.current = seleccaoActiva
  }, [seleccaoActiva])
  const compararActivoRef = useRef(compararActivo)
  useEffect(() => {
    compararActivoRef.current = compararActivo
  }, [compararActivo])
  const rectanguloRef = useRef<any>(null)
  const inicioSeleccaoRef = useRef<any>(null)

  // Filtro por província (PLANO-DATAPROPROMAX.md): trunca o pcode aos 2 primeiros dígitos — é
  // sempre a província, seja a série de distrito ou de posto administrativo (códigos hierárquicos
  // por construção, mesma convenção já usada em agregarPorUnidade ao subir de nível).
  const provinciasPresentes = provincias?.length
    ? Array.from(new Set(unidades.map((u) => u.codigo.slice(0, 2))))
        .map((codigo) => provincias.find((p) => p.codigo === codigo))
        .filter((p): p is { codigo: string; nome: string } => !!p)
        .sort((a, b) => a.nome.localeCompare(b.nome))
    : []

  // Drill-down: assim que uma província fica seleccionada, oferece as suas unidades (distritos ou
  // postos, consoante o nível da série) como segundo filtro, para focar numa só.
  const distritosPresentes = provinciaFiltro
    ? unidades.filter((u) => u.codigo.startsWith(provinciaFiltro)).sort((a, b) => a.nome.localeCompare(b.nome))
    : []

  // useMemo (não recalculado a cada render): sem isto, geojsonFiltrado era um objecto NOVO em
  // cada tecla premida na pesquisa (que também vive neste componente) mesmo sem o filtro mudar —
  // o efeito do Leaflet via-o como uma dependência alterada e reconstruía o mapa inteiro a cada
  // letra, que é a causa real da lista de resultados a "piscar": o mapa a ser desmontado e
  // remontado por baixo competia com o clique no resultado antes de este chegar a registar-se.
  const geojsonFiltrado = useMemo(
    () =>
      distritoFiltro
        ? { ...geojson, features: geojson.features.filter((f) => f.properties.codigo === distritoFiltro) }
        : provinciaFiltro
          ? { ...geojson, features: geojson.features.filter((f) => f.properties.codigo.startsWith(provinciaFiltro)) }
          : geojson,
    [geojson, distritoFiltro, provinciaFiltro]
  )

  // Os limiares de classe usam sempre TODAS as unidades, não só as filtradas: trocar de província
  // não pode fazer a mesma cor passar a significar outra coisa — só muda o que está visível.
  const valores = useMemo(() => unidades.map((u) => u.valor), [unidades])
  const min = valores.length ? Math.min(...valores) : 0
  const max = valores.length ? Math.max(...valores) : 1
  const limites = useMemo(
    () =>
      modo !== 'continuo'
        ? []
        : forma === 'mudanca'
          ? // Uma variação nunca é classificada por quartis nem por intervalos iguais: os dois
            // ignoram o zero, e o zero é o único ponto da escala que significa alguma coisa aqui.
            limitesMudanca(valores)
          : calcularLimites(valores, CLASSES_TEMATICAS.length, esquema),
    [modo, valores, esquema, forma]
  )

  const categoriasPresentes =
    modo === 'categorico'
      ? Array.from(new Set(unidades.map((u) => u.categoria).filter((c): c is string => !!c)))
      : []

  /** Arrastar para seleccionar uma área e ver quantas unidades e qual a soma dos valores dentro
   *  dela — mesma mecânica já usada em AnaliseMapaPontos, adaptada a polígonos: uma unidade entra
   *  na selecção quando o seu centro geométrico cai dentro do rectângulo desenhado. */
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
        color: '#0f3d2e',
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
        if (bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 50) {
          map.removeLayer(rectanguloRef.current)
          rectanguloRef.current = null
          return
        }
        const unidadesNaArea: Unidade[] = []
        geoLayerRef.current?.eachLayer((camada: any) => {
          const centro = camada.getBounds?.().getCenter?.()
          if (!centro || !bounds.contains(centro)) return
          const codigo = camada.feature?.properties?.codigo
          const u = codigo ? porCodigoRef.current.get(codigo) : undefined
          if (u) unidadesNaArea.push(u)
        })
        setEstatisticasArea({ unidades: unidadesNaArea, soma: unidadesNaArea.reduce((s, u) => s + u.valor, 0) })
      })
    })
  }

  useEffect(() => {
    if (!containerRef.current || geojsonFiltrado.features.length === 0) return
    let cancelado = false

    const porCodigo = new Map(unidades.map((u) => [u.codigo, u]))
    porCodigoRef.current = porCodigo

    import('leaflet').then((L) => {
      if (cancelado || !containerRef.current) return

      const mapaNovo = !mapRef.current
      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false }).setView([-18.5, 35], 5)
      } else {
        mapRef.current.eachLayer((camada) => {
          if ((camada as any).feature) mapRef.current!.removeLayer(camada)
        })
      }

      if (camadaBaseRef.current) mapRef.current.removeLayer(camadaBaseRef.current)
      const cfgBase = CAMADAS_BASE[camadaBase]
      // crossOrigin: sem isto, o html2canvas usado na exportação para PDF não consegue ler os
      // pixeis dos tiles (ficam em branco/partidos no PDF) mesmo com useCORS activado do lado do
      // html2canvas — o pedido da imagem em si já tem de sair com modo CORS.
      camadaBaseRef.current = L.tileLayer(cfgBase.url, { attribution: cfgBase.atribuicao, maxZoom: 19, crossOrigin: true }).addTo(
        mapRef.current
      )

      const geoLayer = L.geoJSON(geojsonFiltrado as any, {
        style: (feature) => {
          const u = porCodigo.get(feature?.properties?.codigo)
          const destacada = !!unidadeDestacada && corresponde(feature?.properties?.nome || '', unidadeDestacada)
          // Unidade em comparação: contorno azul distinto do vermelho de "destacada", para nunca
          // se confundirem quando as duas coisas coincidem (comparar uma unidade que também é a
          // destacada pelo gráfico).
          const emComparacao = u !== undefined && comparar.some((c) => c.codigo === u.codigo)
          // Com uma unidade destacada, as restantes esbatem-se (tipo Power BI: o clique filtra a
          // atenção visual, não é só um contorno a competir por cima da cor cheia de todas).
          const esbatida = !!unidadeDestacada && !destacada && !emComparacao
          const corContorno = emComparacao ? '#2563EB' : destacada ? '#B91C1C' : '#ffffff'
          const espessura = emComparacao || destacada ? 3 : undefined
          if (u === undefined) {
            return {
              color: corContorno,
              weight: espessura ?? 1,
              fillColor: COR_SEM_DADOS,
              fillOpacity: esbatida ? 0.2 : 0.6,
            }
          }
          // Com símbolos, a área fica neutra de propósito: se a pintasse também, o leitor teria
          // duas codificações do mesmo número a competir, e voltava a ler tamanho de província
          // como se fosse quantidade.
          const cor =
            forma === 'simbolos' && modo !== 'categorico'
              ? COR_AREA_NEUTRA
              : modo === 'categorico'
                ? CORES_CATEGORIA[u.categoria || 'nao_significativo'] || COR_SEM_DADOS
                : forma === 'mudanca'
                  ? CLASSES_MUDANCA[classeDeMudanca(u.valor, limites)].cor
                  : CLASSES_TEMATICAS[classeParaValor(u.valor, limites)].cor
          return {
            color: corContorno,
            weight: espessura ?? 1.2,
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
          // Modo "comparar": clicar em até 2 unidades junta-as numa tabela lado a lado por baixo
          // do mapa — a segunda vez que se clica na mesma tira-a da comparação.
          layer.on('click', () => {
            if (!compararActivoRef.current || u === undefined) return
            setComparar((prev) => {
              if (prev.some((p) => p.codigo === u.codigo)) return prev.filter((p) => p.codigo !== u.codigo)
              if (prev.length >= 2) return [prev[1], u]
              return [...prev, u]
            })
          })
        },
      })
      geoLayer.addTo(mapRef.current)
      geoLayerRef.current = geoLayer

      // Símbolos proporcionais: um círculo por unidade, no centro do seu polígono.
      if (camadaSimbolosRef.current) {
        mapRef.current.removeLayer(camadaSimbolosRef.current)
        camadaSimbolosRef.current = null
      }
      if (forma === 'simbolos' && modo !== 'categorico') {
        const positivos = valores.filter((v) => Number.isFinite(v) && v > 0)
        const maior = positivos.length ? Math.max(...positivos) : 0
        if (maior > 0) {
          const grupo = L.layerGroup()
          geoLayer.eachLayer((camada: any) => {
            const u = porCodigo.get(camada.feature?.properties?.codigo)
            if (!u || !Number.isFinite(u.valor) || u.valor <= 0) return
            const centro = camada.getBounds?.()?.getCenter?.()
            if (!centro) return
            const destacada = !!unidadeDestacada && corresponde(camada.feature?.properties?.nome || '', unidadeDestacada)
            // Raio pela RAIZ do valor: o olho compara áreas, e dar o valor ao raio faria um
            // círculo com o dobro do valor ocupar quatro vezes mais espaço.
            const raio = RAIO_MINIMO + (RAIO_MAXIMO - RAIO_MINIMO) * Math.sqrt(u.valor / maior)
            const circulo = L.circleMarker(centro, {
              radius: raio,
              fillColor: COR_SIMBOLO,
              fillOpacity: 0.72,
              color: destacada ? '#B91C1C' : '#faf6ec',
              weight: destacada ? 3 : 1.5,
            })
            circulo.bindTooltip(`<strong>${camada.feature?.properties?.nome || ''}</strong><br/>${formatarValor(u.valor)}`, {
              sticky: true,
            })
            grupo.addLayer(circulo)
          })
          grupo.addTo(mapRef.current)
          camadaSimbolosRef.current = grupo
        }
      }

      if (mapaNovo) configurarSeleccaoArea(L, mapRef.current)

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
          // Clicar numa barra do gráfico (unidadeDestacada) faz o mapa aproximar SÓ a essa
          // unidade, com a mesma sensação de "encontrei-a" que a pesquisa já dava — antes disto
          // só mudava a cor do contorno, sem o mapa reagir, e era fácil não perceber que algo
          // tinha mudado numa vista com 160+ polígonos pequenos.
          let bounds: any = null
          if (unidadeDestacada) {
            geoLayer.eachLayer((camada: any) => {
              if (bounds) return
              const nome = camada.feature?.properties?.nome
              if (nome && corresponde(nome, unidadeDestacada)) bounds = camada.getBounds?.()
            })
          }
          if (!bounds || !bounds.isValid?.()) bounds = geoLayer.getBounds()
          if (bounds.isValid()) {
            // Sem tecto de zoom, tal como o filtro de distrito já fazia: um tecto baixo (10)
            // deixava distritos pequenos por aproximar o suficiente, e o contorno de 3px a
            // dominar visualmente um polígono ainda minúsculo no ecrã — parecia "tudo vermelho"
            // quando na verdade era só a borda grossa a tapar a cor real por baixo.
            mapRef.current?.fitBounds(bounds, {
              padding: unidadeDestacada ? [40, 40] : [16, 16],
              animate: true,
            })
          }
        } catch {
          /* limites inválidos: mantém a vista por defeito */
        }
      }
      requestAnimationFrame(() => ajustarEnquadramento())
    })

    return () => {
      cancelado = true
    }
  }, [geojsonFiltrado, unidades, limites, modo, camadaBase, unidadeDestacada, comparar])

  useEffect(
    () => () => {
      mapRef.current?.remove()
      mapRef.current = null
    },
    []
  )

  const resultadosPesquisa = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase()
    if (termo.length < 2) return []
    return unidades.filter((u) => u.nome.toLowerCase().includes(termo)).slice(0, 8)
  }, [pesquisa, unidades])

  function irParaUnidade(u: Unidade) {
    setProvinciaFiltro(u.codigo.slice(0, 2))
    setDistritoFiltro(u.codigo)
    setPesquisa('')
  }

  if (geojson.features.length === 0) {
    return (
      <p className="text-[13px] py-8 text-center" style={{ color: 'var(--ink-faint)' }}>
        Sem geometria disponível para desenhar o mapa a este nível.
      </p>
    )
  }

  const nomeProvinciaFiltro = provinciaFiltro ? provincias?.find((p) => p.codigo === provinciaFiltro)?.nome : null
  const nomeDistritoFiltro = distritoFiltro ? unidades.find((u) => u.codigo === distritoFiltro)?.nome : null

  return (
    <div>
      {(provinciaFiltro || distritoFiltro) && (
        <nav className="pdx-migalhas" aria-label="Filtro geográfico activo">
          <button
            type="button"
            onClick={() => {
              setProvinciaFiltro(null)
              setDistritoFiltro(null)
            }}
          >
            Moçambique
          </button>
          {nomeProvinciaFiltro && (
            <>
              <ChevronRightIcon className="size-3" aria-hidden />
              <button type="button" onClick={() => setDistritoFiltro(null)}>
                {nomeProvinciaFiltro}
              </button>
            </>
          )}
          {nomeDistritoFiltro && (
            <>
              <ChevronRightIcon className="size-3" aria-hidden />
              <span className="actual">{nomeDistritoFiltro}</span>
            </>
          )}
        </nav>
      )}
      {/* relative + z-20: sem isto, o dropdown de pesquisa (absolute, z-10) ainda ficava por
          baixo do mapa Leaflet visualmente — as camadas internas do Leaflet (tiles, marcadores,
          tooltips) sobem até z-index 650+ dentro do seu próprio contentor, e sem uma barreira de
          empilhamento própria aqui, o resultado prático era o dropdown parecer "atrás" do mapa
          mesmo com um z-index à partida mais alto. */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          {provinciasPresentes.length > 1 && (
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setProvinciaFiltro(null)
                  setDistritoFiltro(null)
                }}
                aria-pressed={provinciaFiltro === null}
                className="pdx-chip"
              >
                Todas as províncias
              </button>
              {provinciasPresentes.map((p) => (
                <button
                  key={p.codigo}
                  type="button"
                  onClick={() => {
                    setProvinciaFiltro((v) => (v === p.codigo ? null : p.codigo))
                    setDistritoFiltro(null)
                  }}
                  aria-pressed={provinciaFiltro === p.codigo}
                  className="pdx-chip"
                >
                  {p.nome}
                </button>
              ))}
            </div>
          )}
          {distritosPresentes.length > 1 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="pdx-rotulo-filtro">Focar:</span>
              {distritosPresentes.map((d) => (
                <button
                  key={d.codigo}
                  type="button"
                  onClick={() => setDistritoFiltro((v) => (v === d.codigo ? null : d.codigo))}
                  aria-pressed={distritoFiltro === d.codigo}
                  className="pdx-chip"
                >
                  {d.nome}
                </button>
              ))}
            </div>
          )}
          {modo === 'continuo' && (
            <div className="pdx-abas" role="group" aria-label="Como as classes de cor são calculadas">
              <button
                type="button"
                onClick={() => setEsquema('quartis')}
                aria-pressed={esquema === 'quartis'}
              >
                Quartis
              </button>
              <button
                type="button"
                onClick={() => setEsquema('intervalos_iguais')}
                aria-pressed={esquema === 'intervalos_iguais'}
              >
                Intervalos iguais
              </button>
            </div>
          )}
        </div>
        <div className="pdx-abas" role="group" aria-label="Mapa base">
          {(Object.keys(CAMADAS_BASE) as (keyof typeof CAMADAS_BASE)[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setCamadaBase(k)}
              aria-pressed={camadaBase === k}
            >
              {CAMADAS_BASE[k].rotulo}
            </button>
          ))}
        </div>
        <div className="relative">
          <div className="pdx-pesquisa">
            <Search className="size-3.5" aria-hidden />
            <input
              type="text"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar unidade..."
              aria-label="Pesquisar unidade no mapa"
            />
          </div>
          {resultadosPesquisa.length > 0 && (
            <ul className="pdx-resultados">
              {resultadosPesquisa.map((u) => (
                <li key={u.codigo}>
                  <button type="button" onClick={() => irParaUnidade(u)}>
                    {u.nome}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setCompararActivo((v) => !v)
            if (compararActivo) setComparar([])
          }}
          title="Comparar 2 unidades"
          aria-pressed={compararActivo}
          className="pdx-chip"
        >
          <Scale className="size-3.5" aria-hidden />
          Comparar
        </button>
        <button
          type="button"
          onClick={() => {
            setSeleccaoActiva((v) => !v)
            if (seleccaoActiva) setEstatisticasArea(null)
          }}
          title="Seleccionar área no mapa"
          aria-pressed={seleccaoActiva}
          className="pdx-chip"
        >
          <Crop className="size-3.5" aria-hidden />
          Área
        </button>
      </div>
      {compararActivo && (
        <p className="text-[11.5px] mb-2" style={{ color: 'var(--ink-faint)' }}>
          Clique em até 2 unidades no mapa para comparar{' '}
          {comparar.length > 0 ? `(${comparar.length}/2 seleccionadas)` : ''}
        </p>
      )}
      {/* Legenda ao lado do mapa, não por baixo: quem está a olhar para uma cor no mapa vê o
          significado sem ter de desviar o olhar para uma barra estreita lá em baixo. */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div
          ref={containerRef}
          className="pdx-mapa w-full lg:flex-1 h-[380px]"
          style={seleccaoActiva ? { cursor: 'crosshair' } : undefined}
        />
        <div className="pdx-legenda-caixa lg:w-48 shrink-0">
          <p>Legenda: {metrica}</p>
          {forma === 'simbolos' && modo !== 'categorico' ? (
            // Com símbolos, a escala de cor deixou de estar no mapa: mostrá-la aqui descreveria
            // um desenho que não existe. A legenda passa a ser de TAMANHO, com três círculos
            // desenhados na mesma proporção que os do mapa.
            <div className="pdx-legenda-tamanhos">
              {[max, (max + min) / 2, min].map((v, i) => {
                const raio = RAIO_MINIMO + (RAIO_MAXIMO - RAIO_MINIMO) * Math.sqrt(Math.max(v, 0) / (max || 1))
                return (
                  <div key={i} className="linha">
                    <span className="disco" style={{ width: raio * 2, height: raio * 2 }} aria-hidden />
                    <span className="valor pdx-num">{formatarValor(v)}</span>
                  </div>
                )
              })}
            </div>
          ) : modo === 'categorico' ? (
            <div>
              {categoriasPresentes.map((c) => (
                <div key={c} className="pdx-legenda-linha">
                  <span className="chave" style={{ background: CORES_CATEGORIA[c] || COR_SEM_DADOS }} aria-hidden />
                  {ROTULO_CATEGORIA[c] || c}
                </div>
              ))}
              <div className="pdx-legenda-linha pdx-legenda-vazio">
                <span className="chave" style={{ background: COR_SEM_DADOS }} aria-hidden />
                Sem dados
              </div>
            </div>
          ) : (
            <div>
              {/*
                Numa escala divergente o rótulo faz mais falta do que na sequencial, e não é
                cosmética: as duas pontas de uma divergente são escuras por construção, e a preto e
                branco ficam indistinguíveis. O sinal escrito é o que salva a leitura, por isso o
                intervalo leva o "+" explícito nas classes positivas.
              */}
              {(forma === 'mudanca' ? CLASSES_MUDANCA : CLASSES_TEMATICAS).map((classe, i) => {
                const sinal = (v: number) => (forma === 'mudanca' && v > 0 ? '+' : '')
                const marcar = (v: number) => `${sinal(v)}${formatarValor(v)}`
                /*
                 * Nas classes das PONTAS o intervalo é aberto, e tem de se ler como aberto.
                 *
                 * A versão anterior punha o mínimo dos dados como bordo inferior da primeira classe.
                 * Numa escala divergente, cujos limites saem da distribuição e não dos extremos, a
                 * classe mais baixa fica muitas vezes vazia, e então o mínimo dos dados é MAIOR do
                 * que o topo da classe: a legenda imprimia "-100 a -576", um intervalo ao contrário,
                 * que não descreve nada. Visto ao vivo num mapa de produção de milho.
                 */
                const texto =
                  i === 0
                    ? `≤ ${marcar(limites[0])}`
                    : i === limites.length
                      ? `≥ ${marcar(limites[limites.length - 1])}`
                      : `${marcar(limites[i - 1])} a ${marcar(limites[i])}`
                return (
                  <div key={classe.rotulo} className="pdx-legenda-linha">
                    <span className="chave" style={{ background: classe.cor }} aria-hidden />
                    <span className="font-semibold">{classe.rotulo}</span>
                    <span className="intervalo">{texto}</span>
                  </div>
                )
              })}
              <div className="pdx-legenda-linha pdx-legenda-vazio">
                <span className="chave" style={{ background: COR_SEM_DADOS }} aria-hidden />
                Sem dados
              </div>
            </div>
          )}
        </div>
      </div>
      {estatisticasArea && (
        <div className="pdx-mapa-barra">
          <p className="font-bold m-0">
            <span className="pdx-num">{estatisticasArea.unidades.length}</span>{' '}
            {estatisticasArea.unidades.length === 1 ? 'unidade' : 'unidades'} na área seleccionada, total{' '}
            <span className="pdx-num">{formatarValor(estatisticasArea.soma)}</span>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => exportarCsv(estatisticasArea.unidades, metrica)}
              className="pdx-ligacao"
            >
              <Download className="size-3.5" aria-hidden />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => setEstatisticasArea(null)}
              aria-label="Fechar estatísticas da área"
              style={{ color: 'var(--ink-faint)', background: 'transparent', border: 0, cursor: 'pointer' }}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}
      {comparar.length === 2 && (
        <div className="pdx-comparacao">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="pdx-comparacao-titulo">
              <Scale className="size-3.5" aria-hidden />
              Comparação
            </p>
            <button type="button" onClick={() => setComparar([])} className="pdx-ligacao">
              Limpar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            {comparar.map((u) => (
              <div key={u.codigo} className="pdx-comparacao-cartao">
                <p className="nome truncate" title={u.nome}>
                  {u.nome}
                </p>
                <p className="valor">{formatarValor(u.valor)}</p>
                <p className="metrica">{metrica}</p>
              </div>
            ))}
          </div>
          <div className="pdx-comparacao-cartao linha">
            <span className="rotulo">Diferença</span>
            <span className="valor">
              {formatarValor(Math.abs(comparar[0].valor - comparar[1].valor))}
              {comparar[1].valor !== 0 && (
                <span className="face">
                  ({formatarValor((Math.abs(comparar[0].valor - comparar[1].valor) / Math.abs(comparar[1].valor)) * 100)}%)
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function exportarCsv(unidades: Unidade[], metrica: string) {
  const cabecalho = `nome;${metrica.replace(/;/g, ',')}\n`
  const linhas = unidades.map((u) => `${u.nome};${u.valor}`).join('\n')
  const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${metrica.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
