'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, LayerGroup, Marker } from 'leaflet'
import type { Viewer as MapillaryViewer } from 'mapillary-js'
import {
  Loader2,
  MapPin,
  TrafficCone,
  Satellite,
  Map as MapIcon,
  Images,
  ArrowLeftRight,
  SlidersHorizontal,
  Maximize2,
} from 'lucide-react'
import 'mapillary-js/dist/mapillary.css'

/**
 * O visor de ruas 360° do portal: as capturas próprias do Mapillary (Maputo, Chimoio), navegáveis
 * sem sair do site.
 *
 * Um visor do `mapillary-js` a ocupar o ecrã e um mapa de cobertura (Leaflet simples, o mesmo
 * espírito de `MapaGeografiaRelatorio.tsx`) num canto, com um ponto por imagem capturada dentro da
 * zona visível. Os pontos vêm da API do Mapillary (`graph.mapillary.com/images`, filtrada por
 * bbox), não de vector tiles: é o caminho mais simples e directo para "um ponto por imagem
 * clicável", sem precisar de uma biblioteca de vector tiles só para isto.
 *
 * `moveTo` é chamado directamente a seguir a construir o `Viewer`, sem esperar por nenhum evento
 * de "pronto": é o próprio padrão documentado pela biblioteca, e o evento `load` só dispara depois
 * de uma imagem já ter carregado (não pode ser usado para decidir quando é seguro chamar `moveTo`
 * pela primeira vez, ou nunca dispararia).
 */

const VERDE = '#064E2C'
const AZUL = '#1D4ED8'

// O painel do Leaflet onde vive só o marcador do carro. Os painéis normais vão até 600 (marcadores)
// e 650 (tooltips); 690 põe o carro acima de tudo o resto sem tapar as janelas de informação.
const PAINEL_CARRO = 'ruas360-painel-carro'
const Z_PAINEL_CARRO = 690

// O cone mostra para onde a câmara está virada e roda com a bússola de cada imagem; o círculo é a
// posição em si. Deliberadamente grande: o pedido foi para o carro se ver bem por cima dos pontos.
const SVG_CARRO = `<svg viewBox="0 0 48 48" width="48" height="48">
  <g class="ruas360-carro-cone" style="transform-origin:24px 24px">
    <path d="M24 3 L37 25 A15 15 0 0 0 11 25 Z" fill="rgba(29,78,216,0.35)" stroke="rgba(29,78,216,0.55)" stroke-width="1"/>
  </g>
  <circle cx="24" cy="24" r="9" fill="#1D4ED8" stroke="#fff" stroke-width="3.5"/>
</svg>`

// As duas cidades com cobertura própria no Mapillary. Maputo tem a maior parte (~17,5 mil imagens,
// 43 km); Chimoio é a segunda. Cobrir as duas ao mesmo tempo num único mapa exigia ou um zoom
// nacional (pontos invisíveis a essa escala) ou este selector: escolhida a segunda opção.
const CIDADES = [
  { id: 'maputo', nome: 'Maputo', centro: [-25.9432, 32.542] as [number, number], zoom: 15 },
  { id: 'chimoio', nome: 'Chimoio', centro: [-19.1164, 33.4833] as [number, number], zoom: 14 },
]

// `maxNativeZoom` é o detalhe que importa aqui: o satélite da Esri não tem imagem de alta resolução
// para grande parte de Moçambique acima do zoom 17, e sem este limite o Leaflet pedia tiles que não
// existem e o mapa enchia-se de quadrados cinzentos "Map data not yet available". Com ele, o
// Leaflet estica o último tile que existe em vez de pedir um que nunca vai chegar.
const ESTILOS_MAPA = [
  {
    id: 'padrao',
    nome: 'Mapa',
    icone: MapIcon,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribuicao: '&copy; OpenStreetMap',
    maxNativeZoom: 19,
  },
  {
    id: 'satelite',
    nome: 'Satélite',
    icone: Satellite,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    atribuicao: 'Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 17,
  },
]

// Os prefixos da própria taxonomia de detecções do Mapillary (regulatory--, warning--, etc.): é
// como se distingue "isto é um sinal de trânsito" dos outros tipos de objecto que o endpoint
// `map_features` também devolve (bocas de incêndio, postes, etc.), sem precisar de pedir um
// `object_type` exacto por cada um dos muitos sub-tipos de sinal que existem.
const PREFIXOS_SINAIS = ['regulatory--', 'warning--', 'complementary--', 'information--']

// Máximo de sequências ("capturas") listadas de uma vez, por zona visível.
const MAX_SEQUENCIAS_LISTADAS = 25

// Área visível máxima (em graus quadrados) para pedir sinais. Acima disto o pedido traz dezenas de
// milhares de detecções e nunca chega a responder: medido ao vivo, 0,0009 graus² demora ~6s.
const AREA_MAXIMA_SINAIS = 0.0035

// Os filtros de imagem que a API do Mapillary aceita mesmo, confirmados contra a API real: pedir
// um parâmetro que ela ignora em silêncio (`usernames`, `camera_type`) daria um filtro que parece
// aplicado mas não filtra nada, que é pior do que não o ter.
const TIPOS_IMAGEM = [
  { id: 'todas', nome: 'Todas' },
  { id: 'pano', nome: '360°' },
  { id: 'normal', nome: 'Normais' },
]

const ANO_ACTUAL = new Date().getFullYear()
const ANOS = Array.from({ length: ANO_ACTUAL - 2012 }, (_, i) => ANO_ACTUAL - i)

type PontoImagem = {
  id: string
  lng: number
  lat: number
  sequencia: string | null
  data: number | null
  miniatura: string | null
}

type Captura = {
  id: string
  primeiraImagem: string
  miniatura: string | null
  data: number | null
  total: number
}

/**
 * O desenho do sinal em SVG, a partir do `object_value` do Mapillary (ex.: "regulatory--stop--g1").
 *
 * Desenhado à mão de propósito, em vez de ir buscar os ícones oficiais do Mapillary: esses vivem
 * num sprite servido por um domínio que o CSP do portal não autoriza, e abrir o CSP a mais um
 * domínio externo só para ícones não compensa. Cobre as famílias que aparecem de facto nas ruas
 * captadas; o resto cai no genérico da sua categoria, que continua a dizer ao utilizador que tipo
 * de sinal é (proibição, perigo, informação).
 */
const ANEL_VERMELHO = '<circle cx="12" cy="12" r="10.5" fill="#fff" stroke="#C1272D" stroke-width="3"/>'
const CIRCULO_AZUL = '<circle cx="12" cy="12" r="10.5" fill="#1D4ED8" stroke="#fff" stroke-width="1.5"/>'
const TRIANGULO = '<polygon points="12,1.8 22.8,21 1.2,21" fill="#fff" stroke="#C1272D" stroke-width="2.5" stroke-linejoin="round"/>'
const RISCO = '<line x1="4.8" y1="19.2" x2="19.2" y2="4.8" stroke="#C1272D" stroke-width="2.5"/>'
const SETA_BRANCA = '<path d="M12 5.5 L17 13.5 H14 V18.5 H10 V13.5 H7 Z" fill="#fff"/>'
const SETA_PRETA = '<path d="M12 6 L16.5 13 H14 V17.5 H10 V13 H7.5 Z" fill="#111"/>'

function envolver(conteudo: string): string {
  return `<svg viewBox="0 0 24 24" width="28" height="28">${conteudo}</svg>`
}

function svgDoSinal(tipo: string): string {
  const velocidade = tipo.match(/maximum-speed-limit-(\d+)/)
  if (velocidade) {
    return envolver(
      `${ANEL_VERMELHO}<text x="12" y="16" font-size="10" font-weight="700" fill="#111" text-anchor="middle" font-family="system-ui,sans-serif">${velocidade[1]}</text>`
    )
  }
  if (tipo.includes('--stop')) {
    return envolver(
      '<polygon points="8.2,1 15.8,1 23,8.2 23,15.8 15.8,23 8.2,23 1,15.8 1,8.2" fill="#C1272D" stroke="#fff" stroke-width="1.5"/><text x="12" y="14.8" font-size="5.6" font-weight="700" fill="#fff" text-anchor="middle" font-family="system-ui,sans-serif" letter-spacing="-0.3">STOP</text>'
    )
  }
  if (tipo.includes('yield') || tipo.includes('give-way')) {
    return envolver('<polygon points="12,22.5 1,3.5 23,3.5" fill="#fff" stroke="#C1272D" stroke-width="3"/>')
  }
  if (tipo.includes('no-entry') || tipo.includes('do-not-enter')) {
    return envolver(
      '<circle cx="12" cy="12" r="10.5" fill="#C1272D" stroke="#fff" stroke-width="1.5"/><rect x="5" y="10" width="14" height="4" rx="0.5" fill="#fff"/>'
    )
  }
  if (tipo.includes('no-parking') || tipo.includes('no-stopping')) {
    return envolver(
      `<circle cx="12" cy="12" r="10.5" fill="#1D4ED8" stroke="#C1272D" stroke-width="2.5"/><text x="12" y="16" font-size="10" font-weight="700" fill="#fff" text-anchor="middle" font-family="system-ui,sans-serif">P</text>${RISCO}`
    )
  }
  if (tipo.includes('height-limit') || tipo.includes('width-limit') || tipo.includes('weight-limit')) {
    return envolver(
      `${ANEL_VERMELHO}<path d="M12 7.5 V16.5 M9.5 9 L12 6.6 L14.5 9 M9.5 15 L12 17.4 L14.5 15" fill="none" stroke="#111" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
    )
  }
  // Proibições de manobra: o mesmo anel vermelho, mas com a manobra desenhada e riscada, que é o
  // que as distingue umas das outras à vista (e das obrigações, a azul).
  if (tipo.includes('no-left-turn') || tipo.includes('no-right-turn') || tipo.includes('no-u-turn')) {
    const rodar = tipo.includes('no-right-turn') ? 90 : -90
    return envolver(
      `${ANEL_VERMELHO}<g transform="rotate(${rodar} 12 12)">${SETA_PRETA}</g>${RISCO}`
    )
  }
  if (tipo.includes('no-overtaking')) {
    return envolver(`${ANEL_VERMELHO}<rect x="6" y="9" width="5" height="7" rx="1" fill="#111"/><rect x="13" y="9" width="5" height="7" rx="1" fill="#C1272D"/>`)
  }
  if (tipo.startsWith('regulatory--roundabout')) {
    return envolver(
      `${CIRCULO_AZUL}<path d="M12 7.5 a4.5 4.5 0 1 1-3.9 2.3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M11.4 5 L14.6 7.6 L11.2 9.8 Z" fill="#fff"/>`
    )
  }
  if (tipo.includes('turn-left') || tipo.includes('keep-left')) {
    return envolver(`${CIRCULO_AZUL}<g transform="rotate(-90 12 12)">${SETA_BRANCA}</g>`)
  }
  if (tipo.includes('turn-right') || tipo.includes('keep-right')) {
    return envolver(`${CIRCULO_AZUL}<g transform="rotate(90 12 12)">${SETA_BRANCA}</g>`)
  }
  if (tipo.includes('go-straight') || tipo.includes('ahead')) {
    return envolver(`${CIRCULO_AZUL}${SETA_BRANCA}`)
  }
  if (tipo.startsWith('warning--roundabout')) {
    return envolver(
      `${TRIANGULO}<path d="M12 10 a3.4 3.4 0 1 1-2.9 1.7" fill="none" stroke="#111" stroke-width="1.8" stroke-linecap="round"/><path d="M11.5 7.8 L14 10 L11.3 11.8 Z" fill="#111"/>`
    )
  }
  if (tipo.includes('pedestrians-crossing') || tipo.includes('pedestrian')) {
    return envolver(
      `${TRIANGULO}<circle cx="12" cy="9" r="1.5" fill="#111"/><path d="M12 10.6 L12 15 M12 15 L10 19 M12 15 L14 19 M9.4 12.2 L14.6 12.2" stroke="#111" stroke-width="1.5" stroke-linecap="round"/>`
    )
  }
  if (tipo.includes('road-bump') || tipo.includes('speed-bump')) {
    return envolver(`${TRIANGULO}<path d="M6 18 q6-8 12 0" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"/>`)
  }
  if (tipo.includes('roadworks') || tipo.includes('construction')) {
    return envolver(
      `${TRIANGULO}<path d="M12 8.5 L12 13 M12 13 L9 18.5 L15 18.5 Z" fill="#111" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/>`
    )
  }
  if (tipo.includes('traffic-signals')) {
    return envolver(
      `${TRIANGULO}<rect x="9.8" y="8.2" width="4.4" height="10.4" rx="1.2" fill="#111"/><circle cx="12" cy="10.4" r="1.1" fill="#fff"/><circle cx="12" cy="13.4" r="1.1" fill="#fff"/><circle cx="12" cy="16.4" r="1.1" fill="#fff"/>`
    )
  }
  if (tipo.includes('curve') || tipo.includes('bend') || tipo.includes('ascent') || tipo.includes('descent')) {
    return envolver(
      `${TRIANGULO}<path d="M9.5 19 q0-6 5.2-8" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"/><path d="M13.4 8.6 L17 10.4 L13.6 12.6 Z" fill="#111"/>`
    )
  }
  if (tipo.includes('junction') || tipo.includes('side-road') || tipo.includes('crossroad')) {
    return envolver(
      `${TRIANGULO}<path d="M12 19.2 V9 M12 12.4 H17" stroke="#111" stroke-width="2" stroke-linecap="round"/>`
    )
  }
  if (tipo.startsWith('warning--')) {
    return envolver(
      `${TRIANGULO}<text x="12" y="18.6" font-size="9.5" font-weight="700" fill="#111" text-anchor="middle" font-family="system-ui,sans-serif">!</text>`
    )
  }
  if (tipo.includes('--parking')) {
    return envolver(
      '<rect x="1.5" y="1.5" width="21" height="21" rx="2.5" fill="#1D4ED8" stroke="#fff" stroke-width="1.5"/><text x="12" y="17" font-size="12" font-weight="700" fill="#fff" text-anchor="middle" font-family="system-ui,sans-serif">P</text>'
    )
  }
  if (tipo.startsWith('information--')) {
    return envolver(
      '<rect x="1.5" y="1.5" width="21" height="21" rx="2.5" fill="#1D4ED8" stroke="#fff" stroke-width="1.5"/><text x="12" y="17" font-size="12" font-weight="700" fill="#fff" text-anchor="middle" font-family="Georgia,serif">i</text>'
    )
  }
  if (tipo.startsWith('complementary--')) {
    return envolver('<rect x="2" y="6" width="20" height="12" rx="1.5" fill="#fff" stroke="#111" stroke-width="2"/>')
  }
  // Regulamentação genérica: o anel vermelho é o que qualquer condutor lê como "proibido/obrigatório".
  return envolver(ANEL_VERMELHO)
}

function nomeLegivelDoSinal(tipo: string): string {
  return tipo
    .replace(/--g\d+$/, '')
    .replace(/--/g, ' · ')
    .replace(/-/g, ' ')
}

function formatarData(ms: number | null): string {
  if (!ms) return 'Data desconhecida'
  return new Date(ms).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function VisorRuas360() {
  const mapaRef = useRef<HTMLDivElement>(null)
  const visorRef = useRef<HTMLDivElement>(null)
  const mapaInstanciaRef = useRef<LeafletMap | null>(null)
  const visorInstanciaRef = useRef<MapillaryViewer | null>(null)
  const visorProntoRef = useRef(false)
  const camadaBaseRef = useRef<any>(null)
  const camadaSinaisRef = useRef<LayerGroup | null>(null)
  const marcadorPosicaoRef = useRef<Marker | null>(null)
  const pontosActuaisRef = useRef<PontoImagem[]>([])
  const carregarSinaisRef = useRef<(() => void) | null>(null)
  const desenharPontosRef = useRef<((pontos: PontoImagem[]) => void) | null>(null)
  const irParaImagemRef = useRef<((id: string) => void) | null>(null)
  const mostrarSinaisRef = useRef(false)
  const sequenciaActivaRef = useRef<string | null>(null)
  const carregarPontosRef = useRef<(() => void) | null>(null)
  const inicioDoCliqueRef = useRef<{ x: number; y: number } | null>(null)
  const corrigirTamanhoRef = useRef<(() => void) | null>(null)
  const filtrosRef = useRef({
    tipo: 'todas',
    anoDe: null as number | null,
    anoAte: null as number | null,
    autor: null as string | null,
  })
  const precisaImagemInicialRef = useRef(true)

  const [estado, setEstado] = useState<'a_carregar' | 'pronto' | 'sem_token' | 'erro'>('a_carregar')
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)
  const [imagemActual, setImagemActual] = useState<string | null>(null)
  const [cidadeActiva, setCidadeActiva] = useState(CIDADES[0].id)
  const [estiloMapa, setEstiloMapa] = useState(ESTILOS_MAPA[0].id)
  const [mostrarSinais, setMostrarSinais] = useState(false)
  const [sinaisACarregar, setSinaisACarregar] = useState(false)
  const [sinaisPrecisamZoom, setSinaisPrecisamZoom] = useState(false)
  const [vistaPrincipal, setVistaPrincipal] = useState<'rua' | 'mapa'>('rua')
  const [capturas, setCapturas] = useState<Captura[]>([])
  const [painelCapturasAberto, setPainelCapturasAberto] = useState(false)
  const [sequenciaActiva, setSequenciaActivaState] = useState<string | null>(null)
  const [painelFiltrosAberto, setPainelFiltrosAberto] = useState(false)
  const [semResultados, setSemResultados] = useState(false)
  const [autoresDisponiveis, setAutoresDisponiveis] = useState<string[]>([])
  const [filtroTipo, setFiltroTipo] = useState('todas')
  const [filtroAnoDe, setFiltroAnoDe] = useState<number | null>(null)
  const [filtroAnoAte, setFiltroAnoAte] = useState<number | null>(null)
  const [filtroAutor, setFiltroAutor] = useState<string | null>(null)

  function setSequenciaActiva(id: string | null) {
    sequenciaActivaRef.current = id
    setSequenciaActivaState(id)
  }

  // Trocar de cidade: reposiciona o mapa já montado e marca que a próxima leva de pontos deve
  // escolher logo uma imagem inicial. Sem isto, trocar de cidade continuava a mostrar (e a tocar,
  // ao clicar em "play") a sequência da cidade anterior, porque o visor só muda quando alguém clica
  // manualmente num ponto novo.
  useEffect(() => {
    const cidade = CIDADES.find((c) => c.id === cidadeActiva)
    if (!cidade) return
    precisaImagemInicialRef.current = true
    setSequenciaActiva(null)
    mapaInstanciaRef.current?.setView(cidade.centro, cidade.zoom)
  }, [cidadeActiva])

  // Trocar o tipo de mapa: remove a camada de tiles anterior e põe a nova, sem reconstruir o mapa.
  useEffect(() => {
    const mapa = mapaInstanciaRef.current
    if (!mapa) return
    const estilo = ESTILOS_MAPA.find((e) => e.id === estiloMapa)
    if (!estilo) return
    import('leaflet').then((L) => {
      if (camadaBaseRef.current) mapa.removeLayer(camadaBaseRef.current)
      const nova = L.tileLayer(estilo.url, {
        maxZoom: 19,
        maxNativeZoom: estilo.maxNativeZoom,
        attribution: estilo.atribuicao,
      })
      nova.addTo(mapa)
      // A camada base fica sempre por baixo dos pontos capturados e dos sinais.
      nova.bringToBack()
      camadaBaseRef.current = nova
    })
  }, [estiloMapa])

  // Ligar/desligar a camada de sinais de trânsito, sem mexer na camada de imagens.
  useEffect(() => {
    mostrarSinaisRef.current = mostrarSinais
    if (mostrarSinais) {
      carregarSinaisRef.current?.()
    } else {
      camadaSinaisRef.current?.clearLayers()
      setSinaisACarregar(false)
      setSinaisPrecisamZoom(false)
    }
  }, [mostrarSinais])

  // Trocar qual dos dois ocupa o ecrã: as duas bibliotecas medem o contentor uma única vez, por
  // isso ambas precisam de ser avisadas depois de a caixa mudar de tamanho (senão fica a imagem
  // esticada e o mapa com tiles em falta até alguém arrastar). O atraso espera pela transição CSS.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      mapaInstanciaRef.current?.invalidateSize()
      visorInstanciaRef.current?.resize()
    }, 260)
    return () => clearTimeout(temporizador)
  }, [vistaPrincipal])

  // Mudar um filtro obriga a novo pedido (são filtros do lado do servidor) e a escolher uma imagem
  // inicial nova: a que estava a ser vista pode já não passar no filtro.
  useEffect(() => {
    filtrosRef.current = {
      tipo: filtroTipo,
      anoDe: filtroAnoDe,
      anoAte: filtroAnoAte,
      autor: filtroAutor,
    }
    if (!mapaInstanciaRef.current) return
    setSequenciaActiva(null)
    precisaImagemInicialRef.current = true
    carregarPontosRef.current?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroTipo, filtroAnoDe, filtroAnoAte, filtroAutor])

  // Filtrar por captura: redesenha os pontos já carregados (sem novo pedido à API) e salta logo
  // para a primeira imagem dessa captura, tal como escolher uma cidade.
  useEffect(() => {
    desenharPontosRef.current?.(pontosActuaisRef.current)
    if (sequenciaActiva) {
      const primeiro = pontosActuaisRef.current.find((p) => p.sequencia === sequenciaActiva)
      if (primeiro) irParaImagemRef.current?.(primeiro.id)
    }
  }, [sequenciaActiva])

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPILLARY_TOKEN
    if (!token) {
      setEstado('sem_token')
      return
    }

    let cancelado = false

    async function montar() {
      if (!mapaRef.current || !visorRef.current) return

      const [L, { Viewer }] = await Promise.all([import('leaflet'), import('mapillary-js')])
      if (cancelado) return

      const visor = new Viewer({ accessToken: token, container: visorRef.current })
      visorInstanciaRef.current = visor

      function irParaImagem(id: string) {
        visorInstanciaRef.current?.moveTo(id).catch(() => {})
      }
      irParaImagemRef.current = irParaImagem

      // A API do Mapillary por vezes devolve erro 500 ("Service temporarily unavailable") para uma
      // imagem específica, de forma intermitente: visto ao vivo na consola. Se a primeira imagem
      // escolhida automaticamente calhar numa dessas, tentar mais algumas em vez de desistir logo é
      // a diferença entre o ecrã ficar preto por acaso e mostrar sempre alguma coisa ao abrir.
      async function irParaPrimeiraDisponivel(pontos: PontoImagem[]) {
        for (const p of pontos.slice(0, 8)) {
          try {
            await visorInstanciaRef.current?.moveTo(p.id)
            return
          } catch {
            // tenta o próximo ponto
          }
        }
      }

      visor.on('load', () => {
        visorProntoRef.current = true
      })
      visor.on('image', (evento: any) => {
        const img = evento?.image
        if (img?.id) setImagemActual(img.id)
        const posicao = img?.lngLat || img?.originalLngLat
        if (!posicao || typeof posicao.lat !== 'number' || typeof posicao.lng !== 'number') return
        const mapaActual = mapaInstanciaRef.current
        if (!mapaActual) return

        const angulo = typeof img?.compassAngle === 'number' ? img.compassAngle : img?.originalCompassAngle
        if (!marcadorPosicaoRef.current) {
          marcadorPosicaoRef.current = L.marker([posicao.lat, posicao.lng], {
            // Painel próprio: os pontos verdes são redesenhados a cada movimento do mapa e ficavam
            // sempre por cima do carro, que assim desaparecia justamente onde há mais cobertura.
            // Um painel acima do dos marcadores resolve isto de vez, sem depender da ordem em que
            // as camadas foram adicionadas.
            pane: PAINEL_CARRO,
            icon: L.divIcon({
              className: 'ruas360-carro',
              html: SVG_CARRO,
              iconSize: [48, 48],
              iconAnchor: [24, 24],
            }),
            interactive: false,
            keyboard: false,
          }).addTo(mapaActual)
        } else {
          marcadorPosicaoRef.current.setLatLng([posicao.lat, posicao.lng])
        }

        const elemento = marcadorPosicaoRef.current.getElement()
        const cone = elemento?.querySelector<SVGGElement>('.ruas360-carro-cone')
        if (cone && typeof angulo === 'number') {
          cone.style.transform = `rotate(${angulo}deg)`
        }

        // Acompanhar o carro é o comportamento normal, sem botão para desligar: sem isto o mapa
        // ficava parado enquanto a sequência avançava e o carro saía do enquadramento em segundos.
        // Arrastar o mapa continua a funcionar (só volta a centrar quando muda de imagem, e com a
        // reprodução parada não muda nenhuma).
        mapaActual.panTo([posicao.lat, posicao.lng], { animate: true, duration: 0.4 })
      })

      const cidadeInicial = CIDADES.find((c) => c.id === cidadeActiva) || CIDADES[0]
      const mapa = L.map(mapaRef.current, { attributionControl: true }).setView(
        cidadeInicial.centro,
        cidadeInicial.zoom
      )
      mapaInstanciaRef.current = mapa

      // O Leaflet mede o tamanho do cartão só uma vez, ao construir o mapa. Se o layout mudar
      // ligeiramente depois disso (o tipo de letra do cabeçalho a acabar de carregar, por exemplo,
      // desloca a página uns pixels), o mapa fica com uma medida desactualizada e sobra uma faixa
      // branca sem mosaicos no fundo do cartão até alguém arrastar. Isto corrige-o sozinho: uma
      // vez pouco depois de montar, e sempre que a janela mudar de tamanho.
      const corrigirTamanho = () => mapaInstanciaRef.current?.invalidateSize()
      corrigirTamanhoRef.current = corrigirTamanho
      setTimeout(corrigirTamanho, 400)
      window.addEventListener('resize', corrigirTamanho)

      mapa.createPane(PAINEL_CARRO)
      const painelCarro = mapa.getPane(PAINEL_CARRO)
      if (painelCarro) painelCarro.style.zIndex = String(Z_PAINEL_CARRO)
      const estiloInicial = ESTILOS_MAPA.find((e) => e.id === estiloMapa) || ESTILOS_MAPA[0]
      camadaBaseRef.current = L.tileLayer(estiloInicial.url, {
        maxZoom: 19,
        maxNativeZoom: estiloInicial.maxNativeZoom,
        attribution: estiloInicial.atribuicao,
      }).addTo(mapa)

      const camadaPontos = L.layerGroup().addTo(mapa)
      const camadaSinais = L.layerGroup().addTo(mapa)
      camadaSinaisRef.current = camadaSinais

      function desenharPontos(pontos: PontoImagem[]) {
        camadaPontos.clearLayers()
        const filtro = sequenciaActivaRef.current
        const visiveis = filtro ? pontos.filter((p) => p.sequencia === filtro) : pontos
        for (const p of visiveis) {
          const marcador = L.circleMarker([p.lat, p.lng], {
            radius: 5,
            color: VERDE,
            weight: 1,
            fillColor: VERDE,
            fillOpacity: 0.75,
          }).addTo(camadaPontos)
          marcador.on('click', () => irParaImagem(p.id))
        }
      }
      desenharPontosRef.current = desenharPontos

      async function carregarPontosNaArea() {
        const bounds = mapa.getBounds()
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(',')
        const filtros = filtrosRef.current
        const parametros = new URLSearchParams({
          access_token: token!,
          fields: 'id,geometry,sequence,captured_at,thumb_256_url,creator,is_pano',
          bbox,
          limit: '300',
        })
        if (filtros.tipo === 'pano') parametros.set('is_pano', 'true')
        if (filtros.tipo === 'normal') parametros.set('is_pano', 'false')
        if (filtros.anoDe) parametros.set('start_captured_at', `${filtros.anoDe}-01-01T00:00:00Z`)
        if (filtros.anoAte) parametros.set('end_captured_at', `${filtros.anoAte}-12-31T23:59:59Z`)
        if (filtros.autor) parametros.set('creator_username', filtros.autor)
        try {
          const r = await fetch(`https://graph.mapillary.com/images?${parametros.toString()}`)
          if (!r.ok) throw new Error(`Mapillary respondeu ${r.status}`)
          const d = await r.json()
          if (cancelado) return
          const pontos: PontoImagem[] = (d?.data || [])
            .map((item: any) => {
              const coords = item?.geometry?.coordinates
              if (!Array.isArray(coords) || coords.length < 2) return null
              return {
                id: String(item.id),
                lng: coords[0],
                lat: coords[1],
                sequencia: item?.sequence ? String(item.sequence) : null,
                data: typeof item?.captured_at === 'number' ? item.captured_at : null,
                miniatura: item?.thumb_256_url ? String(item.thumb_256_url) : null,
              }
            })
            .filter(Boolean)

          pontosActuaisRef.current = pontos
          desenharPontos(pontos)
          setSemResultados(pontos.length === 0)

          // A lista de quem captou só é recolhida quando não há filtro de autor activo: caso
          // contrário passaria a ter só o nome escolhido, e deixaria de haver forma de voltar atrás
          // pelo próprio selector.
          if (!filtros.autor) {
            const autores = Array.from(
              new Set(
                (d?.data || [])
                  .map((item: any) => item?.creator?.username)
                  .filter((nome: unknown): nome is string => typeof nome === 'string' && nome.length > 0)
              )
            ).sort() as string[]
            setAutoresDisponiveis(autores)
          }

          // Uma "captura" é uma sequência do Mapillary. O Mapillary não lhes dá nome, só um id
          // opaco, por isso a identificação útil para quem vê é a miniatura e a data, tal como no
          // painel "All captures" do mapillary.com.
          const porSequencia = new Map<string, Captura>()
          for (const p of pontos) {
            if (!p.sequencia) continue
            const existente = porSequencia.get(p.sequencia)
            if (existente) {
              existente.total += 1
              if (!existente.miniatura && p.miniatura) existente.miniatura = p.miniatura
              if (!existente.data && p.data) existente.data = p.data
            } else {
              porSequencia.set(p.sequencia, {
                id: p.sequencia,
                primeiraImagem: p.id,
                miniatura: p.miniatura,
                data: p.data,
                total: 1,
              })
            }
          }
          const lista = Array.from(porSequencia.values())
            .sort((a, b) => (b.data || 0) - (a.data || 0))
            .slice(0, MAX_SEQUENCIAS_LISTADAS)
          setCapturas(lista)
          if (sequenciaActivaRef.current && !lista.some((c) => c.id === sequenciaActivaRef.current)) {
            setSequenciaActiva(null)
          }

          if (precisaImagemInicialRef.current && pontos.length > 0) {
            precisaImagemInicialRef.current = false
            void irParaPrimeiraDisponivel(pontos)
          }

          setEstado('pronto')
        } catch (erro: any) {
          if (!cancelado) {
            setMensagemErro(String(erro?.message || erro))
            setEstado('erro')
          }
        }
      }

      // Endpoint `map_features` do Mapillary: as detecções por visão computacional. Dois detalhes
      // que só se descobrem a testar contra a API real:
      //
      // 1. O campo chama-se `object_value`, não `value`. Pedir o campo errado devolvia sempre uma
      //    lista vazia depois do filtro, sem nenhum erro visível, porque o tipo ficava sempre "".
      // 2. A esmagadora maioria das detecções não são sinais de trânsito: são postes, candeeiros,
      //    montras. Numa zona de Maputo, 1894 detecções para 57 sinais. Com o limite em 300, os
      //    sinais ficavam quase todos de fora e o mapa aparecia vazio mesmo com o filtro ligado.
      //    Não há filtro do lado do servidor que funcione (`object_types=traffic_sign` é ignorado),
      //    por isso o jeito é pedir muitos e filtrar aqui: é o que torna este pedido lento (~6s) e
      //    a razão de o botão mostrar que está a carregar.
      let pedidoSinaisActual = 0
      async function carregarSinaisNaArea() {
        const bounds = mapa.getBounds()
        const largura = bounds.getEast() - bounds.getWest()
        const altura = bounds.getNorth() - bounds.getSouth()
        // Numa área grande o pedido nunca chega a responder (são dezenas de milhares de detecções
        // a filtrar para umas dezenas de sinais). Em vez de deixar o botão eternamente a carregar,
        // dizer que é preciso aproximar: é também o que o mapillary.com faz, só mostra sinais a
        // partir de certo zoom.
        if (largura * altura > AREA_MAXIMA_SINAIS) {
          camadaSinais.clearLayers()
          setSinaisACarregar(false)
          setSinaisPrecisamZoom(true)
          return
        }
        setSinaisPrecisamZoom(false)
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(',')
        const meuPedido = ++pedidoSinaisActual
        setSinaisACarregar(true)
        const cortarPorTempo = new AbortController()
        const temporizadorCorte = setTimeout(() => cortarPorTempo.abort(), 25000)
        try {
          const r = await fetch(
            `https://graph.mapillary.com/map_features?access_token=${encodeURIComponent(token!)}&fields=id,geometry,object_value&bbox=${bbox}&limit=2000`,
            { signal: cortarPorTempo.signal }
          )
          if (!r.ok) throw new Error(`Mapillary respondeu ${r.status}`)
          const d = await r.json()
          if (cancelado) return
          // Uma resposta antiga a chegar depois de o utilizador já ter arrastado o mapa não deve
          // sobrepor-se à mais recente: com pedidos de vários segundos, isto acontece de facto.
          if (meuPedido !== pedidoSinaisActual) return
          camadaSinais.clearLayers()
          const sinais = (d?.data || [])
            .map((item: any) => {
              const coords = item?.geometry?.coordinates
              const tipo = String(item?.object_value || '')
              if (!Array.isArray(coords) || coords.length < 2) return null
              if (!PREFIXOS_SINAIS.some((prefixo) => tipo.startsWith(prefixo))) return null
              return { id: String(item.id), lng: coords[0], lat: coords[1], tipo }
            })
            .filter(Boolean) as { id: string; lng: number; lat: number; tipo: string }[]

          for (const s of sinais) {
            L.marker([s.lat, s.lng], {
              icon: L.divIcon({
                className: 'ruas360-sinal',
                html: svgDoSinal(s.tipo),
                iconSize: [28, 28],
                iconAnchor: [14, 14],
              }),
            })
              .bindTooltip(`${nomeLegivelDoSinal(s.tipo)} · clique para ver na rua`, { direction: 'top' })
              .on('click', () => {
                // Leva o visor à imagem capturada mais perto do sinal, que é onde ele aparece de
                // facto na fotografia. Desenhar a caixa por cima do sinal dentro da imagem, como o
                // mapillary.com faz, exigiria descodificar a geometria das detecções (vem em
                // vector tile codificado em base64) e é um trabalho à parte.
                let maisPerto: PontoImagem | null = null
                let menorDistancia = Infinity
                const escalaLng = Math.cos((s.lat * Math.PI) / 180)
                for (const p of pontosActuaisRef.current) {
                  const dLat = p.lat - s.lat
                  const dLng = (p.lng - s.lng) * escalaLng
                  const distancia = dLat * dLat + dLng * dLng
                  if (distancia < menorDistancia) {
                    menorDistancia = distancia
                    maisPerto = p
                  }
                }
                if (maisPerto) irParaImagem(maisPerto.id)
              })
              .addTo(camadaSinais)
          }
        } catch {
          // Falha a carregar sinais não deve derrubar o visor todo: os pontos de imagem continuam a
          // funcionar normalmente mesmo que este filtro extra falhe.
        } finally {
          clearTimeout(temporizadorCorte)
          if (!cancelado && meuPedido === pedidoSinaisActual) setSinaisACarregar(false)
        }
      }

      carregarSinaisRef.current = () => void carregarSinaisNaArea()
      carregarPontosRef.current = () => void carregarPontosNaArea()

      // Com o mapa a acompanhar o carro, o 'moveend' passa a disparar a cada imagem da sequência.
      // Sem esta espera, cada segundo de reprodução gerava vários pedidos à API (e o de sinais
      // demora ~6s); assim só recarrega quando o movimento assenta.
      let temporizadorMovimento: ReturnType<typeof setTimeout> | null = null
      mapa.on('moveend', () => {
        if (temporizadorMovimento) clearTimeout(temporizadorMovimento)
        temporizadorMovimento = setTimeout(() => {
          carregarPontosNaArea()
          if (mostrarSinaisRef.current) carregarSinaisNaArea()
        }, 700)
      })
      await carregarPontosNaArea()
    }

    montar().catch((erro: any) => {
      if (!cancelado) {
        setMensagemErro(String(erro?.message || erro))
        setEstado('erro')
      }
    })

    return () => {
      cancelado = true
      if (corrigirTamanhoRef.current) window.removeEventListener('resize', corrigirTamanhoRef.current)
      corrigirTamanhoRef.current = null
      mapaInstanciaRef.current?.remove()
      mapaInstanciaRef.current = null
      visorInstanciaRef.current?.remove()
      visorInstanciaRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (estado === 'sem_token') {
    return (
      <div className="ruas360-aviso">
        <MapPin className="size-5" aria-hidden />
        <p>
          O visor de ruas 360° ainda não está configurado neste ambiente: falta o token de acesso
          do Mapillary.
        </p>
      </div>
    )
  }

  // Clicar no painel pequeno passa-o a grande. O cuidado todo está em não roubar os cliques que
  // eram para o conteúdo: arrastar o mapa ou rodar a imagem 360°, carregar num ponto verde, num
  // sinal, no zoom do Leaflet ou nos controlos de sequência do próprio visor.
  function registarInicioDoClique(evento: React.PointerEvent<HTMLDivElement>) {
    inicioDoCliqueRef.current = { x: evento.clientX, y: evento.clientY }
  }

  function trocarSeForCliqueSimples(
    evento: React.PointerEvent<HTMLDivElement>,
    novaVista: 'rua' | 'mapa'
  ) {
    const inicio = inicioDoCliqueRef.current
    inicioDoCliqueRef.current = null
    if (!inicio) return
    const distancia = Math.hypot(evento.clientX - inicio.x, evento.clientY - inicio.y)
    if (distancia > 5) return
    const alvo = evento.target as HTMLElement | null
    if (
      alvo?.closest(
        '.leaflet-interactive, .leaflet-marker-icon, .leaflet-control, [class*="mapillary-sequence"], [class*="mapillary-zoom"], [class*="mapillary-direction"], [class*="mapillary-attribution"], [class*="mapillary-bearing"]'
      )
    ) {
      return
    }
    setVistaPrincipal(novaVista)
  }

  const capturaActiva = capturas.find((c) => c.id === sequenciaActiva) || null
  const filtrosActivos =
    (filtroTipo !== 'todas' ? 1 : 0) +
    (filtroAnoDe ? 1 : 0) +
    (filtroAnoAte ? 1 : 0) +
    (filtroAutor ? 1 : 0)

  return (
    <div className={`ruas360-layout${vistaPrincipal === 'mapa' ? ' mapa-principal' : ''}`}>
      <div className="ruas360-controlos" role="toolbar" aria-label="Controlos do visor de ruas 360°">
        <div className="ruas360-controlo-grupo" role="group" aria-label="Cidade">
          {CIDADES.map((cidade) => (
            <button
              key={cidade.id}
              type="button"
              className={`ruas360-chip${cidadeActiva === cidade.id ? ' active' : ''}`}
              onClick={() => setCidadeActiva(cidade.id)}
              aria-pressed={cidadeActiva === cidade.id}
            >
              {cidade.nome}
            </button>
          ))}
        </div>
        <div className="ruas360-controlo-grupo" role="group" aria-label="Tipo de mapa">
          {ESTILOS_MAPA.map((opcao) => {
            const Icon = opcao.icone
            return (
              <button
                key={opcao.id}
                type="button"
                className={`ruas360-chip${estiloMapa === opcao.id ? ' active' : ''}`}
                onClick={() => setEstiloMapa(opcao.id)}
                aria-pressed={estiloMapa === opcao.id}
                title={opcao.nome}
              >
                <Icon className="size-3.5" aria-hidden />
                {opcao.nome}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className={`ruas360-chip ruas360-chip-solto${mostrarSinais ? ' active-sinais' : ''}`}
          onClick={() => setMostrarSinais((v) => !v)}
          aria-pressed={mostrarSinais}
          title="Mostrar sinais de trânsito detectados"
        >
          {sinaisACarregar ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <TrafficCone className="size-3.5" aria-hidden />
          )}
          {sinaisACarregar
            ? 'A procurar sinais…'
            : mostrarSinais && sinaisPrecisamZoom
              ? 'Aproxime para ver sinais'
              : 'Sinais de trânsito'}
        </button>
        <button
          type="button"
          className="ruas360-chip ruas360-chip-solto"
          onClick={() => setVistaPrincipal((v) => (v === 'rua' ? 'mapa' : 'rua'))}
          title="Trocar o que ocupa o ecrã"
        >
          <ArrowLeftRight className="size-3.5" aria-hidden />
          {vistaPrincipal === 'rua' ? 'Mapa em grande' : 'Rua em grande'}
        </button>
        <button
          type="button"
          className={`ruas360-chip ruas360-chip-solto${filtrosActivos > 0 || painelFiltrosAberto ? ' active' : ''}`}
          onClick={() => {
            setPainelFiltrosAberto((v) => !v)
            setPainelCapturasAberto(false)
          }}
          aria-expanded={painelFiltrosAberto}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          {filtrosActivos > 0 ? `Filtros (${filtrosActivos})` : 'Filtros'}
        </button>
        {painelFiltrosAberto && (
          <div className="ruas360-filtros">
            <div className="ruas360-filtro-grupo">
              <span className="ruas360-filtro-titulo">Tipo de imagem</span>
              <div className="ruas360-filtro-opcoes">
                {TIPOS_IMAGEM.map((tipo) => (
                  <button
                    key={tipo.id}
                    type="button"
                    className={`ruas360-filtro-opcao${filtroTipo === tipo.id ? ' active' : ''}`}
                    onClick={() => setFiltroTipo(tipo.id)}
                    aria-pressed={filtroTipo === tipo.id}
                  >
                    {tipo.nome}
                  </button>
                ))}
              </div>
            </div>
            <div className="ruas360-filtro-grupo">
              <span className="ruas360-filtro-titulo">Data da captura</span>
              <div className="ruas360-filtro-datas">
                <label>
                  De
                  <select
                    value={filtroAnoDe ?? ''}
                    onChange={(e) => setFiltroAnoDe(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Sempre</option>
                    {ANOS.map((ano) => (
                      <option key={ano} value={ano}>
                        {ano}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Até
                  <select
                    value={filtroAnoAte ?? ''}
                    onChange={(e) => setFiltroAnoAte(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Hoje</option>
                    {ANOS.map((ano) => (
                      <option key={ano} value={ano}>
                        {ano}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            {autoresDisponiveis.length > 0 && (
              <div className="ruas360-filtro-grupo">
                <span className="ruas360-filtro-titulo">Quem captou</span>
                <select
                  className="ruas360-filtro-autor"
                  value={filtroAutor ?? ''}
                  onChange={(e) => setFiltroAutor(e.target.value || null)}
                >
                  <option value="">Todos</option>
                  {autoresDisponiveis.map((autor) => (
                    <option key={autor} value={autor}>
                      {autor}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {filtrosActivos > 0 && (
              <button
                type="button"
                className="ruas360-filtro-limpar"
                onClick={() => {
                  setFiltroTipo('todas')
                  setFiltroAnoDe(null)
                  setFiltroAnoAte(null)
                  setFiltroAutor(null)
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
        {capturas.length > 0 && (
          <>
            <button
              type="button"
              className={`ruas360-chip ruas360-chip-solto${painelCapturasAberto ? ' active' : ''}`}
              onClick={() => {
                setPainelCapturasAberto((v) => !v)
                setPainelFiltrosAberto(false)
              }}
              aria-expanded={painelCapturasAberto}
            >
              <Images className="size-3.5" aria-hidden />
              {capturaActiva ? formatarData(capturaActiva.data) : `Capturas (${capturas.length})`}
            </button>
            {painelCapturasAberto && (
              <div className="ruas360-capturas" role="listbox" aria-label="Capturas nesta zona">
                <button
                  type="button"
                  className={`ruas360-captura-todas${sequenciaActiva ? '' : ' active'}`}
                  onClick={() => {
                    setSequenciaActiva(null)
                    setPainelCapturasAberto(false)
                  }}
                >
                  Todas as capturas
                </button>
                {capturas.map((captura) => (
                  <button
                    key={captura.id}
                    type="button"
                    className={`ruas360-captura${sequenciaActiva === captura.id ? ' active' : ''}`}
                    onClick={() => {
                      setSequenciaActiva(captura.id)
                      setPainelCapturasAberto(false)
                    }}
                    role="option"
                    aria-selected={sequenciaActiva === captura.id}
                  >
                    {captura.miniatura ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={captura.miniatura} alt="" className="ruas360-captura-imagem" loading="lazy" />
                    ) : (
                      <span className="ruas360-captura-imagem ruas360-captura-imagem-vazia" aria-hidden />
                    )}
                    <span className="ruas360-captura-info">
                      <span className="ruas360-captura-data">{formatarData(captura.data)}</span>
                      <span className="ruas360-captura-total">{captura.total} imagens aqui</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div
        className="ruas360-painel ruas360-painel-mapa"
        onPointerDown={vistaPrincipal === 'rua' ? registarInicioDoClique : undefined}
        onPointerUp={vistaPrincipal === 'rua' ? (e) => trocarSeForCliqueSimples(e, 'mapa') : undefined}
      >
        <div ref={mapaRef} className="ruas360-mapa-canvas" />
        {vistaPrincipal === 'rua' && (
          <span className="ruas360-ampliar-dica" aria-hidden>
            <Maximize2 className="size-3" />
            Clique para ampliar
          </span>
        )}
        {estado === 'a_carregar' && (
          <div className="ruas360-estado">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span>A carregar a cobertura…</span>
          </div>
        )}
        {estado === 'erro' && (
          <div className="ruas360-estado ruas360-estado-erro">
            <span>Não foi possível carregar os pontos capturados aqui.</span>
            {mensagemErro && <span className="ruas360-erro-tecnico">{mensagemErro}</span>}
          </div>
        )}
        {semResultados && estado === 'pronto' && (
          <div className="ruas360-dica ruas360-dica-vazia">
            {filtrosActivos > 0
              ? 'Nenhuma imagem com estes filtros nesta zona.'
              : 'Não há capturas nesta zona do mapa.'}
          </div>
        )}
        {!imagemActual && !semResultados && estado === 'pronto' && (
          <div className="ruas360-dica">Clique num ponto verde para navegar noutra rua.</div>
        )}
      </div>
      <div
        className="ruas360-painel ruas360-painel-visor"
        onPointerDown={vistaPrincipal === 'mapa' ? registarInicioDoClique : undefined}
        onPointerUp={vistaPrincipal === 'mapa' ? (e) => trocarSeForCliqueSimples(e, 'rua') : undefined}
      >
        <div ref={visorRef} className="ruas360-visor-canvas" />
        {vistaPrincipal === 'mapa' && (
          <span className="ruas360-ampliar-dica" aria-hidden>
            <Maximize2 className="size-3" />
            Clique para ampliar
          </span>
        )}
      </div>
    </div>
  )
}
