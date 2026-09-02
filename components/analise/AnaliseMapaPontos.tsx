'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapIcon, List, Flame, Crop, MapPin, X, Search } from 'lucide-react'
import type { Map as LeafletMap } from 'leaflet'
import { escolherMapa, normalizarGeometria } from '@/lib/analysis/forma-do-mapa'
import {
  rotularColuna as rotularColunaFixo,
  gerarPaletaCategorica,
  traduzirValorCategoria as traduzirValorCategoriaFixo,
} from '@/lib/analysis/rotulos-cliente'

function normalizarTexto(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

type Camada = {
  dataset_id: number
  titulo: string
  tipoGeometria: string
  colunasCategoricas: string[]
  features: { nome: string; categorias: Record<string, string>; geometry: any }[]
  truncado: boolean
  /** Traduções aprendidas em segundo plano pelo servidor (ver lib/analysis/rotulos-aprendidos.ts)
   *  para nomes de coluna e valores que o dicionário fixo (rotularColuna/traduzirValorCategoria)
   *  não cobria — este componente corre no browser e não tem acesso nenhum à base de dados onde
   *  isso é aprendido, por isso a tradução chega embutida nos dados em vez de ser consultada aqui. */
  rotulosAprendidos?: { colunas: Record<string, string>; valores: Record<string, string> }
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
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribuicao: '&copy; OpenStreetMap',
    maxNativeZoom: 19,
  },
  satelite: {
    rotulo: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    atribuicao: 'Esri, Maxar, Earthstar Geographics',
    // O satélite da Esri não tem imagem de alta resolução acima do zoom 17 em grande parte de
    // Moçambique: sem isto o Leaflet pedia tiles que não existem e mostrava quadrados cinzentos
    // "Map data not yet available" ao aproximar (mesmo bug já corrigido em VisorRuas360.tsx).
    maxNativeZoom: 17,
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

/** Todos os vértices de QUALQUER geometria (ponto, linha ou polígono, incluindo multi-), para
 *  calcular o enquadramento (fitBounds) de uma feição destacada — ao contrário de
 *  pontosDaFeature() acima (só pontos, de propósito: serve o calor e a contagem por área, onde um
 *  vértice de polígono nunca devia entrar), aqui QUALQUER vértice conta, porque o objectivo é só
 *  "que rectângulo cobre esta feição toda", não uma localização pontual. */
function todosOsVertices(geometry: any): [number, number][] {
  if (!geometry?.type || !geometry?.coordinates) return []
  const coords = geometry.coordinates
  const achatar = (c: any): [number, number][] => {
    if (typeof c[0] === 'number') return [[c[1], c[0]]]
    return c.flatMap(achatar)
  }
  try {
    return achatar(coords)
  } catch {
    return []
  }
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
  unidadeDestacada,
}: {
  camada: Camada
  /** [oeste, sul, leste, norte] — quando a pergunta ficou restrita a uma unidade (filtro_unidade),
   *  aproximar a essa área é mais útil do que mostrar sempre o dataset inteiro; sem isto, uma
   *  pergunta sobre um distrito específico continuava a mostrar 1500+ pontos do país inteiro. */
  bboxFoco?: [number, number, number, number] | null
  /** Nome vindo de fora (clique num KPI ou numa barra do gráfico) — dá zoom e destaca o ponto
   *  correspondente, exactamente como o coroplético já faz. Antes, este mapa não recebia esta
   *  prop nenhuma: clicar num gráfico nunca tinha efeito aqui, só no coroplético ao lado. */
  unidadeDestacada?: string | null
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

  // Consulta primeiro a tradução aprendida pelo servidor (embutida na própria camada — este
  // componente corre no browser, sem acesso nenhum à base de dados onde isso é aprendido, ver
  // rotulos-aprendidos.ts) antes de cair no dicionário fixo. Sem isto, "REASON"/"PC to PC" ficam
  // em inglês para sempre neste mapa mesmo depois de a tradução já existir noutros sítios da
  // análise (séries/destaques), porque só estes são calculados no servidor.
  const rotular = (coluna: string) => camada.rotulosAprendidos?.colunas[coluna.trim().toLowerCase()] || rotularColunaFixo(coluna)
  const traduzir = (valor: string) => camada.rotulosAprendidos?.valores[valor.trim().toLowerCase()] || traduzirValorCategoriaFixo(valor)

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const camadaBaseRef = useRef<any>(null)
  const [camadaBase, setCamadaBase] = useState<keyof typeof CAMADAS_BASE>('rua')
  const [vista, setVista] = useState<'mapa' | 'lista'>('mapa')
  const [expandido, setExpandido] = useState(false)
  /*
   * A densidade decide, e não um botão que ninguém carregava.
   *
   * Com 9 535 escolas ou 11 349 aldeias, marcadores individuais desenham uma mancha de alfinetes
   * que não mostra onde as coisas estão. O modo de partida sai por isso da própria camada: acima
   * de alguns milhares de pontos abre em calor, e o selector continua lá para quem quiser trocar.
   */
  // A geometria vem da camada, e não fixa: este componente desenha as camadas brutas, que tanto
  // são pontos como linhas ou polígonos. Com 'ponto' fixo, uma rede de estradas com milhares de
  // troços passava o limiar de densidade e abria em mapa de calor.
  const escolhaDoMapa = useMemo(
    () =>
      escolherMapa({
        geometria: normalizarGeometria(camada.tipoGeometria),
        nFeicoes: camada.features.length,
      }),
    [camada.tipoGeometria, camada.features.length]
  )
  const [modoVisual, setModoVisual] = useState<'marcadores' | 'calor'>(
    escolhaDoMapa.tipo === 'calor' ? 'calor' : 'marcadores'
  )
  const [seleccaoActiva, setSeleccaoActiva] = useState(false)
  const [estatisticasArea, setEstatisticasArea] = useState<{ total: number; porCategoria: [string, number][] } | null>(
    null
  )
  // Pesquisa por nome (paridade com o coroplético, AnaliseMapaCoropletico): salta directamente
  // para uma unidade em vez de obrigar a percorrer 1500+ pontos visualmente.
  const [pesquisa, setPesquisa] = useState('')
  const [dropdownAberto, setDropdownAberto] = useState(false)
  // Comparar 2 unidades (mesma funcionalidade do coroplético, adaptada: pontos não têm um único
  // "valor" numérico, por isso compara-se pelas categorias/atributos de cada um).
  const [compararActivo, setCompararActivo] = useState(false)
  const [comparadas, setComparadas] = useState<{ nome: string; categorias: Record<string, string> }[]>([])

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
  // Antes era selecção múltipla (tudo ligado por omissão, clicar desligava um a um) — para
  // isolar UMA categoria era preciso desligar todas as outras à mão. Passa a selecção única, como
  // o filtro de província ao lado e como clicar numa barra do gráfico: clicar filtra a essa
  // categoria e destaca-a no mapa; clicar outra vez (ou na mesma) volta a mostrar todas.
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null)
  useEffect(() => {
    setCategoriaFiltro(null)
  }, [categorias])

  const corPorCategoria = useMemo(() => {
    const mapa = new Map<string, string>()
    const paleta = gerarPaletaCategorica(categorias.length)
    categorias.forEach((c, i) => mapa.set(c, paleta[i]))
    return mapa
  }, [categorias])

  // Filtro por província (paridade com o coroplético: "Todas as províncias / X / Y / ..."), à
  // parte de "Colorir por" — este é de selecção única e restringe SEMPRE os pontos, mesmo que a
  // cor activa neste momento seja outra coluna (ex.: "Tipo"). A coluna de província pode não ser
  // a mesma que está a colorir o mapa, por isso procura-se por nome, não usa-se colunaActiva.
  // Não basta testar /provinc/i no nome bruto: datasets geoespaciais deste portal usam muitas
  // vezes nomes de coluna abreviados ("Admin1", "ADM1_PT") que rotularColuna já sabe traduzir
  // para "Província" mas que não contêm essa palavra — usa-se exactamente a mesma tradução que a
  // UI mostra, para o filtro aparecer sempre que a etiqueta "Colorir por: Província" também
  // aparece (antes, com uma coluna chamada "Admin1", a etiqueta mostrava "Província" mas o
  // filtro nunca aparecia, porque o detector procurava a substring errada).
  const colunaProvincia = useMemo(
    () => camada.colunasCategoricas.find((c) => rotular(c) === 'Província') ?? null,
    [camada]
  )
  const provinciasDisponiveis = useMemo(() => {
    if (!colunaProvincia) return []
    return Array.from(new Set(camada.features.map((f) => f.categorias[colunaProvincia]).filter((c): c is string => !!c))).sort()
  }, [camada, colunaProvincia])
  const [provinciaFiltro, setProvinciaFiltro] = useState<string | null>(null)
  useEffect(() => {
    setProvinciaFiltro(null)
  }, [camada])

  // Drill-down: distrito só aparece DEPOIS de escolher uma província (paridade com o
  // coroplético) — mostrar todos os 150+ distritos do país de uma vez, antes de restringir por
  // província, seria uma lista enorme e a maioria fora de contexto para a pergunta.
  const colunaDistrito = useMemo(
    () => camada.colunasCategoricas.find((c) => rotular(c) === 'Distrito') ?? null,
    [camada]
  )
  const distritosDisponiveis = useMemo(() => {
    if (!colunaDistrito || !provinciaFiltro || !colunaProvincia) return []
    return Array.from(
      new Set(
        camada.features
          .filter((f) => f.categorias[colunaProvincia] === provinciaFiltro)
          .map((f) => f.categorias[colunaDistrito])
          .filter((c): c is string => !!c)
      )
    ).sort()
  }, [camada, colunaDistrito, colunaProvincia, provinciaFiltro])
  const [distritoFiltro, setDistritoFiltro] = useState<string | null>(null)
  useEffect(() => {
    setDistritoFiltro(null)
  }, [provinciaFiltro])

  const featuresVisiveis = useMemo(() => {
    let out = camada.features
    if (categoriaFiltro && colunaActiva) {
      out = out.filter((f) => f.categorias[colunaActiva] === categoriaFiltro)
    }
    if (provinciaFiltro && colunaProvincia) {
      out = out.filter((f) => f.categorias[colunaProvincia] === provinciaFiltro)
    }
    if (distritoFiltro && colunaDistrito) {
      out = out.filter((f) => f.categorias[colunaDistrito] === distritoFiltro)
    }
    // Destaque vindo de fora (KPI/gráfico) também restringe o que se vê, não só a cor — pedido
    // explícito: destacar já não é só "pintar de vermelho no meio de 428 polígonos", é mostrar só
    // aquele. Tenta primeiro por nome exacto (uma única feição); se não houver nenhuma, tenta por
    // categoria (ex.: todas as unidades de uma província). Se nada corresponder, não filtra nada
    // — mais vale mostrar tudo do que uma tela vazia por causa de um nome que não bate certo.
    if (unidadeDestacada) {
      const alvo = normalizarTexto(unidadeDestacada)
      const porNome = out.filter((f) => normalizarTexto(f.nome) === alvo)
      if (porNome.length > 0) return porNome
      const porCategoria = out.filter((f) => Object.values(f.categorias).some((v) => v && normalizarTexto(v) === alvo))
      if (porCategoria.length > 0) return porCategoria
    }
    return out
  }, [camada, categoriaFiltro, colunaActiva, provinciaFiltro, colunaProvincia, distritoFiltro, colunaDistrito, unidadeDestacada])

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
  const grupoRef = useRef<any>(null)
  const marcadoresPorNomeRef = useRef<Map<string, any>>(new Map())
  const compararActivoRef = useRef(compararActivo)
  useEffect(() => {
    compararActivoRef.current = compararActivo
  }, [compararActivo])
  const comparadasRef = useRef(comparadas)
  useEffect(() => {
    comparadasRef.current = comparadas
  }, [comparadas])

  const resultadosPesquisa = useMemo(() => {
    const alvo = normalizarTexto(pesquisa)
    if (alvo.length < 2) return []
    return featuresVisiveis.filter((f) => normalizarTexto(f.nome).includes(alvo)).slice(0, 8)
  }, [pesquisa, featuresVisiveis])

  /** Salta para uma unidade: zoom directo se não estiver dentro de um agrupamento, ou usa
   *  zoomToShowLayer do markercluster para abrir o agrupamento certo primeiro quando estiver. */
  function irParaUnidade(nome: string) {
    const marcador = marcadoresPorNomeRef.current.get(nome)
    const map = mapRef.current
    if (!marcador || !map) return
    const grupo = grupoRef.current
    if (grupo?.zoomToShowLayer) {
      grupo.zoomToShowLayer(marcador, () => marcador.openTooltip())
    } else if (typeof marcador.getLatLng === 'function') {
      // Só marcadores de ponto têm getLatLng — linhas e polígonos (Polyline/Polygon do Leaflet)
      // não têm um único ponto, têm getBounds(). Chamar getLatLng() num deles rebentava sempre
      // que a pesquisa ou o zoom automático apontava a uma feição de linha/polígono.
      map.setView(marcador.getLatLng(), 14)
      marcador.openTooltip()
    } else if (typeof marcador.getBounds === 'function') {
      map.fitBounds(marcador.getBounds(), { padding: [24, 24] })
      marcador.openTooltip()
    } else {
      // Última rede de segurança: nem getLatLng nem getBounds (camada Leaflet de forma
      // inesperada) — calcula o enquadramento directamente a partir da geometria da feição em
      // vez de depender de um método específico do objecto Leaflet guardado.
      const L = (globalThis as any).L
      const feature = camada.features.find((f) => f.nome === nome)
      const vertices = feature ? todosOsVertices(feature.geometry) : []
      if (L && vertices.length > 0) {
        try {
          map.fitBounds(L.latLngBounds(vertices), { padding: [24, 24] })
        } catch {
          /* geometria inválida: mantém a vista actual */
        }
      }
      if (typeof marcador.openTooltip === 'function') marcador.openTooltip()
    }
    setPesquisa('')
    setDropdownAberto(false)
  }

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
      // crossOrigin: sem isto, a exportação para PDF (html2canvas) captura o mapa em branco.
      camadaBaseRef.current = L.tileLayer(cfgBase.url, {
        attribution: cfgBase.atribuicao,
        maxZoom: 19,
        maxNativeZoom: cfgBase.maxNativeZoom,
        crossOrigin: true,
      }).addTo(map)

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
        marcadoresPorNomeRef.current = new Map()
        grupoRef.current = null
        const colecao = {
          type: 'FeatureCollection' as const,
          features: featuresVisiveis.map((f) => ({
            type: 'Feature' as const,
            // `categoria` é só a coluna activa em "Colorir por" (define a COR); `categoriasTodas`
            // leva TODAS as dimensões da feição (província, distrito, tipo, país...) — sem isto, um
            // KPI/gráfico que destaca por distrito nunca acertava aqui quando "Colorir por"
            // estava em Província (ou tipo, ou país): só se comparava contra a dimensão activa no
            // momento, nunca contra as outras que a feição também tem.
            properties: { nome: f.nome, categoria: colunaActiva ? f.categorias[colunaActiva] : undefined, categoriasTodas: f.categorias },
            geometry: f.geometry,
          })),
        }

        const nomesComparados = new Set(comparadas.map((c) => c.nome))
        // Contorno vermelho (mesma cor usada no coroplético para o clique-a-partir-do-gráfico) tem
        // prioridade visual sobre o azul da comparação — são dois sinais distintos, nunca ao
        // mesmo tempo no mesmo ponto na prática, mas se acontecer o destaque externo é o que a
        // pessoa acabou de pedir (clicou agora), por isso vence.
        // O nome destacado pode ser o de UM ponto (clique num KPI que nomeia uma unidade) ou o de
        // uma CATEGORIA inteira (clique numa barra "por província" — não há um único ponto
        // chamado "Nampula", há 30 pontos cuja categoria é "Nampula"): testa os dois, porque o
        // gráfico mais comum para um dataset de pontos é uma contagem por categoria, não por
        // ponto individual.
        // Comparação exacta (===) falhava sempre que a etiqueta vinda do KPI/gráfico e o valor
        // guardado no dataset diferiam só em maiúsculas/acentos (ex.: "GAZA" na tabela de origem
        // vs "Gaza" no nome oficial da província usado no coroplético) — normalizado evita isso,
        // sem risco de falso positivo (nomes reais diferentes continuam a normalizar diferente).
        const alvoDestacado = unidadeDestacada ? normalizarTexto(unidadeDestacada) : null
        const corDestaque = (propriedades: { nome?: string; categoria?: string; categoriasTodas?: Record<string, string> } | undefined) => {
          if (!alvoDestacado || !propriedades) return null
          const bateNalgumaDimensao =
            (propriedades.nome && normalizarTexto(propriedades.nome) === alvoDestacado) ||
            Object.values(propriedades.categoriasTodas || {}).some((v) => v && normalizarTexto(v) === alvoDestacado)
          if (bateNalgumaDimensao) return '#B91C1C'
          return propriedades.nome && nomesComparados.has(propriedades.nome) ? '#2563EB' : null
        }
        const geoLayer = L.geoJSON(colecao as any, {
          pointToLayer: (f: any, latlng: any) => {
            const cor = (f.properties?.categoria && corPorCategoria.get(f.properties.categoria)) || COR_PONTO
            const destaque = corDestaque(f.properties)
            // Selecção/destaque só por CONTORNO, a cor de categoria fica sempre no preenchimento —
            // mesmo princípio já usado no coroplético: nunca substituir a cor real, só acrescentar
            // um sinal por cima.
            return L.circleMarker(latlng, {
              radius: destaque ? 8 : 4,
              color: destaque || cor,
              weight: destaque ? 3 : 1,
              fillColor: cor,
              fillOpacity: 0.75,
            })
          },
          style: (f: any) => {
            const cor = (f?.properties?.categoria && corPorCategoria.get(f.properties.categoria)) || COR_PONTO
            const destaque = corDestaque(f?.properties)
            return {
              color: destaque || cor,
              weight: destaque ? 4 : camada.tipoGeometria.includes('Polygon') ? 1.5 : 2.5,
              fillColor: cor,
              fillOpacity: 0.25,
            }
          },
          onEachFeature: (feature: any, layer: any) => {
            const nome = feature?.properties?.nome || camada.titulo
            const linha2 = feature?.properties?.categoria
              ? `<br/>${rotular(colunaActiva || '')}: ${traduzir(feature.properties.categoria)}`
              : ''
            layer.bindTooltip(`<strong>${nome}</strong>${linha2}`, { sticky: true })
            marcadoresPorNomeRef.current.set(nome, layer)
            // Modo "Comparar": clicar num marcador selecciona-o em vez do comportamento normal
            // (tooltip/zoom); ref porque o listener é registado uma vez por camada, não por render.
            layer.on('click', () => {
              if (!compararActivoRef.current) return
              const feat = featuresVisiveis.find((f) => f.nome === nome)
              if (!feat) return
              setComparadas((prev) => {
                if (prev.some((c) => c.nome === nome)) return prev.filter((c) => c.nome !== nome)
                const seguinte = [...prev, { nome: feat.nome, categorias: feat.categorias }]
                return seguinte.length > 2 ? seguinte.slice(1) : seguinte
              })
            })
          },
        })

        // Um dataset de pontos com centenas/milhares de registos (ex.: 1577 unidades sanitárias)
        // vira uma mancha azul indistinguível a zoom de país inteiro sem agrupamento. Pontos
        // agrupam-se; linhas e polígonos não têm essa noção, vão directos para o mapa.
        if (ehPontos && (L as any).markerClusterGroup) {
          const grupo = (L as any).markerClusterGroup({
            maxClusterRadius: 45,
            disableClusteringAtZoom: 12,
            // A zoom de país inteiro, TODOS os pontos estão agrupados: o clique num marcador
            // individual (o listener em onEachFeature acima) nunca dispara, porque o agrupamento
            // intercepta o clique para dar zoom — "Comparar" ficava sem forma de seleccionar nada
            // a esse nível. Desliga-se o zoom-por-clique do agrupamento só enquanto se compara, e
            // o clique passa a seleccionar o agrupamento inteiro (ver clusterclick abaixo).
            zoomToBoundsOnClick: !compararActivo,
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
          // Clicar num agrupamento em modo "Comparar" selecciona-o como um todo (categoria
          // dominante + quantas unidades tem), já que a esse nível de zoom não dá para escolher
          // uma unidade individual — é o equivalente, para pontos, a seleccionar uma província no
          // coroplético.
          grupo.on('clusterclick', (e: any) => {
            if (!compararActivoRef.current) return
            const filhos = e.layer.getAllChildMarkers()
            const contagemPorCategoria = new Map<string, number>()
            for (const m of filhos) {
              const cat = m.feature?.properties?.categoria
              if (cat) contagemPorCategoria.set(cat, (contagemPorCategoria.get(cat) || 0) + 1)
            }
            let dominante = ''
            let maiorContagem = 0
            contagemPorCategoria.forEach((n, cat) => {
              if (n > maiorContagem) {
                maiorContagem = n
                dominante = cat
              }
            })
            const nomeGrupo = dominante ? `${dominante} (agrupamento)` : `Agrupamento de ${filhos.length}`
            const categoriasGrupo: Record<string, string> = { 'Unidades no agrupamento': String(filhos.length) }
            if (dominante && colunaActiva) categoriasGrupo[rotular(colunaActiva)] = dominante
            setComparadas((prev) => {
              if (prev.some((c) => c.nome === nomeGrupo)) return prev.filter((c) => c.nome !== nomeGrupo)
              const seguinte = [...prev, { nome: nomeGrupo, categorias: categoriasGrupo }]
              return seguinte.length > 2 ? seguinte.slice(1) : seguinte
            })
          })
          grupo.addLayer(geoLayer)
          grupo.addTo(map)
          camadaDadosRef.current = grupo
          grupoRef.current = grupo
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
  }, [camada, camadaBase, featuresVisiveis, corPorCategoria, modoVisual, bboxFoco, comparadas, unidadeDestacada, compararActivo])

  // Zoom automático ao destaque vindo de fora (clique num KPI/gráfico) — sem "maxZoom" a limitar,
  // como o coroplético já faz: um tecto de zoom combinado com o contorno grosso do destaque acima
  // fazia um ponto pequeno parecer sólido vermelho em vez de mostrar o ponto real. Se o nome
  // corresponder a UM ponto, salta a esse ponto; se corresponder a uma CATEGORIA (ex.: nome de
  // província clicado numa barra "por província"), enquadra todos os pontos dessa categoria.
  useEffect(() => {
    if (!unidadeDestacada) return
    const map = mapRef.current
    if (!map) return
    // O efeito de desenho acima já correu e populou marcadoresPorNomeRef antes deste, porque
    // ambos dependem de unidadeDestacada e React corre efeitos pela ordem em que aparecem no
    // componente — não precisa de esperar mais um tick. Normalizado pela mesma razão do
    // corDestaque acima: maiúsculas/acentos não podem ser o motivo de o zoom nunca acontecer.
    const alvo = normalizarTexto(unidadeDestacada)
    const nomeExacto = Array.from(marcadoresPorNomeRef.current.keys()).find((n) => normalizarTexto(n) === alvo)
    if (nomeExacto) {
      irParaUnidade(nomeExacto)
      return
    }
    const L = (globalThis as any).L
    if (!L) return
    // Testa todas as dimensões categóricas da feição, não só a que está activa em "Colorir por"
    // neste momento — um KPI que destaca por distrito não pode depender de a pessoa estar a
    // colorir o mapa por distrito nessa altura, senão o zoom só funciona por coincidência.
    const pontosCategoria = featuresVisiveis
      .filter((f) => Object.values(f.categorias).some((v) => v && normalizarTexto(v) === alvo))
      .flatMap((f) => todosOsVertices(f.geometry))
    if (pontosCategoria.length === 0) return
    try {
      map.fitBounds(L.latLngBounds(pontosCategoria), { padding: [24, 24] })
    } catch {
      /* limites inválidos: mantém a vista actual */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeDestacada])

  // Zoom automático ao escolher uma província no filtro abaixo — enquadra só os pontos dessa
  // província; ao voltar a "Todas as províncias" (provinciaFiltro null) não mexe na vista, porque
  // "tudo" não tem um enquadramento óbvio melhor do que o que a pessoa já estava a ver.
  useEffect(() => {
    if (!provinciaFiltro || !colunaProvincia) return
    const map = mapRef.current
    const L = (globalThis as any).L
    if (!map || !L) return
    const pontos = camada.features
      .filter((f) => f.categorias[colunaProvincia] === provinciaFiltro)
      .flatMap((f) => todosOsVertices(f.geometry))
    if (pontos.length === 0) return
    try {
      map.fitBounds(L.latLngBounds(pontos), { padding: [24, 24] })
    } catch {
      /* limites inválidos: mantém a vista actual */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinciaFiltro])

  // Mesmo zoom, um nível mais fundo: ao escolher um distrito dentro da província já seleccionada.
  useEffect(() => {
    if (!distritoFiltro || !colunaDistrito) return
    const map = mapRef.current
    const L = (globalThis as any).L
    if (!map || !L) return
    const pontos = camada.features
      .filter((f) => f.categorias[colunaDistrito] === distritoFiltro)
      .flatMap((f) => todosOsVertices(f.geometry))
    if (pontos.length === 0) return
    try {
      map.fitBounds(L.latLngBounds(pontos), { padding: [24, 24] })
    } catch {
      /* limites inválidos: mantém a vista actual */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distritoFiltro])

  // Mesmo comportamento para a legenda (agora selecção única): escolher uma categoria dá zoom aos
  // pontos dessa categoria, igual ao que já acontece ao clicar numa barra do gráfico.
  useEffect(() => {
    if (!categoriaFiltro || !colunaActiva) return
    const map = mapRef.current
    const L = (globalThis as any).L
    if (!map || !L) return
    const pontos = camada.features
      .filter((f) => f.categorias[colunaActiva] === categoriaFiltro)
      .flatMap((f) => todosOsVertices(f.geometry))
    if (pontos.length === 0) return
    try {
      map.fitBounds(L.latLngBounds(pontos), { padding: [24, 24] })
    } catch {
      /* limites inválidos: mantém a vista actual */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaFiltro])

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
    <div className="pdx-panel">
      <div className="pdx-panel-head">
        <span className="pdx-panel-icone" aria-hidden>
          <MapPin className="size-3.5" />
        </span>
        <h2>{camada.titulo}: localização real</h2>
        <span className="pdx-panel-sub pdx-num">
          {featuresVisiveis.length} de {camada.features.length} {rotuloTipo}
          {camada.truncado ? ' (amostra)' : ''}
        </span>
      </div>
      <div className="pdx-panel-body">

      {camada.colunasCategoricas.length > 1 && (
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="pdx-rotulo-filtro">Colorir por:</span>
          <div className="pdx-abas" role="group" aria-label="Coluna que define a cor">
            {camada.colunasCategoricas.map((c) => (
              <button key={c} type="button" onClick={() => setColunaActiva(c)} aria-pressed={colunaActiva === c}>
                {rotular(c)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtro por província (paridade com o coroplético) — selecção única, restringe SEMPRE os
          pontos visíveis e dá zoom à área, independentemente de qual coluna estiver a colorir o
          mapa neste momento ("Colorir por" acima é sobre COR, isto é sobre ÂMBITO). */}
      {colunaProvincia && provinciasDisponiveis.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          <button
            type="button"
            onClick={() => setProvinciaFiltro(null)}
            aria-pressed={provinciaFiltro === null}
            className="pdx-chip"
          >
            Todas as províncias
          </button>
          {provinciasDisponiveis.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProvinciaFiltro((v) => (v === p ? null : p))}
              aria-pressed={provinciaFiltro === p}
              className="pdx-chip"
            >
              {traduzir(p)}
            </button>
          ))}
        </div>
      )}

      {/* Distrito só aparece depois de escolher uma província — drill-down, não uma segunda
          lista independente (mesmo padrão do coroplético: província → distritos dela). */}
      {provinciaFiltro && colunaDistrito && distritosDisponiveis.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-2 pl-3" style={{ borderLeft: '2px solid var(--line)' }}>
          <button
            type="button"
            onClick={() => setDistritoFiltro(null)}
            aria-pressed={distritoFiltro === null}
            className="pdx-chip"
          >
            Todos os distritos de {traduzir(provinciaFiltro)}
          </button>
          {distritosDisponiveis.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDistritoFiltro((v) => (v === d ? null : d))}
              aria-pressed={distritoFiltro === d}
              className="pdx-chip"
            >
              {traduzir(d)}
            </button>
          ))}
        </div>
      )}

      <div className="relative z-20 flex flex-wrap items-center gap-2 mb-2">
        <div className="relative w-full sm:w-56">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 z-10"
            style={{ color: 'var(--ink-faint)' }}
            aria-hidden
          />
          <input
            type="text"
            value={pesquisa}
            onChange={(e) => {
              setPesquisa(e.target.value)
              setDropdownAberto(true)
            }}
            onFocus={() => setDropdownAberto(true)}
            onBlur={() => setTimeout(() => setDropdownAberto(false), 150)}
            placeholder="Pesquisar unidade..."
            aria-label="Pesquisar unidade no mapa"
            className="pdx-campo pdx-campo-com-icone w-full"
          />
          {dropdownAberto && resultadosPesquisa.length > 0 && (
            <div className="pdx-resultados" style={{ width: '100%' }}>
              {resultadosPesquisa.map((f) => (
                <button key={f.nome} type="button" onMouseDown={() => irParaUnidade(f.nome)}>
                  {f.nome}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Botão "Comparar" removido só deste mapa (geometria real/localização real): a
            comparação aqui não tem um valor numérico único por feição (muitas vezes atributos
            NaN/vazios), o que continuava a produzir comparações sem sentido mesmo depois da
            correcção do bug dos nomes repetidos. Nos outros mapas (coroplético) "Comparar"
            continua a funcionar normalmente e não foi tocado. */}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 mb-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="pdx-abas" role="tablist" aria-label="Como ver os dados">
            <button type="button" role="tab" aria-selected={vista === 'mapa'} onClick={() => setVista('mapa')}>
              <MapIcon className="size-3.5 inline-block mr-1 align-[-2px]" aria-hidden />
              Mapa
            </button>
            <button type="button" role="tab" aria-selected={vista === 'lista'} onClick={() => setVista('lista')}>
              <List className="size-3.5 inline-block mr-1 align-[-2px]" aria-hidden />
              Lista
            </button>
          </div>
          {vista === 'mapa' && (
            <div className="pdx-abas" role="group" aria-label="Mapa base">
              {(Object.keys(CAMADAS_BASE) as (keyof typeof CAMADAS_BASE)[]).map((k) => (
                <button key={k} type="button" onClick={() => setCamadaBase(k)} aria-pressed={camadaBase === k}>
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
              aria-pressed={modoVisual === 'calor'}
              className="pdx-chip"
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
              aria-pressed={seleccaoActiva}
              className="pdx-chip"
            >
              <Crop className="size-3.5" aria-hidden />
              Área
            </button>
          )}
        </div>
      </div>

      {/* Legenda ao lado do mapa, não por cima dele — mesmo layout do coroplético (paridade de
          funcionalidades entre os dois mapas): quem olha para uma cor no mapa vê o significado
          sem desviar o olhar para uma faixa lá em cima. Continua clicável (mostra/esconde), não
          é só decorativa como a legenda do coroplético — aqui cada categoria é também um filtro.
          Leaflet acrescenta as suas próprias classes (leaflet-container, etc.) directamente ao
          contentor via manipulação de DOM fora do React — só o className do WRAPPER pode mudar
          com `vista`; o do contentor do Leaflet (containerRef) tem de ficar sempre igual, senão o
          React apaga "leaflet-container" a cada troca Lista/Mapa e os tiles colapsam para 0px
          (confirmado em runtime). */}
      <div className={vista === 'mapa' ? 'flex flex-col lg:flex-row gap-3' : 'hidden'}>
        <div className="pdx-mapa w-full lg:flex-1 h-[380px]">
          <div ref={containerRef} className="w-full h-full" style={seleccaoActiva ? { cursor: 'crosshair' } : undefined} />
        </div>
        {categorias.length > 0 && (
          <div className="pdx-legenda-caixa lg:w-48 shrink-0">
            <p>Legenda{colunaActiva ? `: ${rotular(colunaActiva)}` : ''}</p>
            <div>
              {categorias.map((c) => {
                const activa = categoriaFiltro === null || categoriaFiltro === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoriaFiltro((v) => (v === c ? null : c))}
                    aria-pressed={categoriaFiltro === c}
                    className={`pdx-legenda-linha pdx-legenda-filtro${activa ? '' : ' apagada'}`}
                  >
                    <span
                      className="chave"
                      style={{ background: activa ? corPorCategoria.get(c) : 'var(--line)' }}
                      aria-hidden
                    />
                    {traduzir(c)}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {vista === 'mapa' && estatisticasArea && (
        <div className="pdx-mapa-barra items-start">
          <div>
            <p className="font-bold m-0">
              <span className="pdx-num">{estatisticasArea.total}</span> {rotuloTipo} na área seleccionada
            </p>
            {estatisticasArea.porCategoria.length > 0 && (
              <ul className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 list-none p-0">
                {estatisticasArea.porCategoria.map(([cat, n]) => (
                  <li key={cat} className="text-[11px]" style={{ color: 'var(--ink-soft)' }}>
                    <span className="font-semibold" style={{ color: corPorCategoria.get(cat) || COR_PONTO }}>
                      {traduzir(cat)}
                    </span>
                    : <span className="pdx-num">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEstatisticasArea(null)}
            aria-label="Fechar estatísticas da área"
            className="shrink-0"
            style={{ color: 'var(--ink-faint)', background: 'transparent', border: 0, cursor: 'pointer' }}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      )}

      {vista === 'lista' && (
        <div className="pdx-tabela-scroll" style={{ maxHeight: 380 }}>
          <ul className="pdx-lista-pontos">
            {listaVisivel.map((f, i) => {
              const cat = colunaActiva ? f.categorias[colunaActiva] : undefined
              return (
                <li key={i}>
                  <span className="truncate">{f.nome}</span>
                  {cat && (
                    <span
                      className="etiqueta"
                      style={{ background: corPorCategoria.get(cat) || COR_PONTO }}
                    >
                      {traduzir(cat)}
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
              className="pdx-ligacao w-full justify-center py-2"
            >
              {expandido ? 'Mostrar menos' : `Ver as ${listaOrdenada.length} unidades`}
            </button>
          )}
        </div>
      )}

      {categorias.length === 0 && vista === 'mapa' && (
        <div className="flex items-center gap-1.5 mt-3 text-[11px]" style={{ color: 'var(--ink-soft)' }}>
          <span className="size-2.5 rounded-full" style={{ background: COR_PONTO }} aria-hidden />
          {camada.titulo} ({rotuloTipo})
        </div>
      )}
      </div>
    </div>
  )
}
