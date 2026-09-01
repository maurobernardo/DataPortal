'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bookmark, BookmarkCheck, Download, FileDown, GitCompareArrows, Lightbulb, Loader2, Sheet, Table2, TrendingUp } from 'lucide-react'
import { AnaliseSerieGeografica } from './AnaliseSerieGeografica'
import { escolherMapa } from '@/lib/analysis/forma-do-mapa'
import { somarFazSentido } from '@/lib/analysis/forma-do-grafico'
import { AnaliseMapaDestaque } from './AnaliseMapaDestaque'
import { AnaliseMapaPontos } from './AnaliseMapaPontos'
import { AnaliseGrafico } from './AnaliseGrafico'
import { MetadadosDataset } from './MetadadosDataset'
import { TabelaExploratoria } from './TabelaExploratoria'
import { FaixaKPIs } from './FaixaKPIs'
import { PerguntasSugeridas } from './PerguntasSugeridas'
import { PartilharBotao } from './PartilharBotao'
import { SelectorParceiro } from './SelectorParceiro'
import { SelectorIdioma } from './SelectorIdioma'
import { PainelAnotacoes } from './PainelAnotacoes'
import { PainelAnaliseViva } from './PainelAnaliseViva'
import { AnaliseMultiplosPequenos } from './AnaliseMultiplosPequenos'
import type { Parceiro } from '@/lib/parceiros'
import { SeloAutoria } from './SeloAutoria'
import { AnaliseListaRegistos } from './AnaliseListaRegistos'
import { getSuggestedQuestions } from '@/lib/ai-suggested-questions'
import { geometriaPrecisaDaSuaPropriaCamada } from '@/lib/analysis/rotulos-cliente'
import { computeGeoInsights } from '@/lib/geo-intelligence'
import { assentarTransformesLeaflet } from '@/lib/analysis/captura-leaflet'
import '@/app/ai-insights.css'

/** Formas que precisam da largura toda para se lerem. */
const FORMA_LARGA = new Set(['heatmap', 'sankey', 'cordas', 'caixa', 'funil'])

const ROTULO_GEOMETRIA: Record<string, string> = {
  Point: 'Ponto',
  MultiPoint: 'Multiponto',
  LineString: 'Linha',
  MultiLineString: 'Multilinha',
  Polygon: 'Polígono',
  MultiPolygon: 'Multipolígono',
}

function formatarNumeroInsight(n: number, unidade: string): string {
  return `${n.toLocaleString('pt-PT', { maximumFractionDigits: n >= 100 ? 0 : 1 })} ${unidade}`
}

/**
 * Que forma teria o mapa desta série, com a mesma regra que `AnaliseSerieGeografica` aplica ao
 * desenhá-lo. Existe aqui só para decidir se vale a pena mostrar o mapa agregado ao lado da camada
 * bruta; a decisão de como o pintar continua a ser tomada uma única vez, lá dentro.
 */
function formaDaSerie(serie: any): string {
  const aditivo = serie?.normalizacao === 'nenhuma' && somarFazSentido(serie?.metrica || '')
  return escolherMapa({
    geometria: 'poligono',
    nFeicoes: serie?.unidades?.length ?? 0,
    temValorPorUnidade: true,
    valorEAditivo: aditivo,
    nUnidadesComValor: (serie?.unidades || []).filter((u: any) => Number.isFinite(u?.valor)).length,
    categorico: serie?.modo === 'categorico',
  }).tipo
}

/**
 * Fixa o desenho de cada <canvas> como imagem antes de o clone sair do browser.
 *
 * `cloneNode` copia o ELEMENTO canvas, incluindo largura e altura, e nao copia um unico pixel: o
 * bitmap vive no contexto de desenho, nao no DOM. Um mapa de calor e desenhado exactamente assim
 * (leaflet.heat pinta num canvas por cima dos tiles), e por isso o HTML exportado saia com os
 * tiles, com a legenda, com o painel todo, e com o calor em falta: um mapa a dizer que nao ha
 * concentracao nenhuma. O PDF nunca teve o problema porque o html2canvas rasteriza o ecra vivo.
 *
 * Percorre os dois lados em paralelo. `querySelectorAll` devolve os nos na mesma ordem de documento
 * no original e no clone, que e o que permite emparelha-los por indice sem lhes por marcas.
 */
function congelarTelas(original: HTMLElement, clone: HTMLElement) {
  const origens = Array.from(original.querySelectorAll('canvas'))
  const destinos = Array.from(clone.querySelectorAll('canvas'))
  if (origens.length !== destinos.length) return
  origens.forEach((tela, i) => {
    const destino = destinos[i]
    if (!destino?.parentNode) return
    // Uma tela sem area nunca chegou a desenhar nada, e `toDataURL` sobre ela lanca.
    if (!tela.width || !tela.height) return
    let dados: string
    try {
      dados = tela.toDataURL('image/png')
    } catch {
      // Tela contaminada por um tile de outra origem sem CORS: sem imagem e melhor do que sem
      // ficheiro, e o resto da exportacao continua igual.
      return
    }
    const img = document.createElement('img')
    img.src = dados
    img.alt = ''
    img.className = destino.className
    /*
     * O tamanho vai INLINE, e com `max-width: none`.
     *
     * Sem isto a imagem sai do ficheiro com zero pixeis de largura, e o mapa de calor aparece
     * vazio. A culpa e de duas coisas que so se encontram no ficheiro exportado: o preflight do
     * Tailwind declara `img { max-width: 100%; height: auto }`, e os panes do Leaflet tem largura
     * ZERO por construcao (sao ancoras posicionadas, nao caixas). Cem por cento de zero e zero.
     *
     * O canvas nunca sofreu disto porque a regra do preflight apanha `img` e `video`, nao `canvas`,
     * e o PDF tambem nao porque nesse caminho nunca chega a existir uma <img>: o html2canvas
     * rasteriza o ecra vivo. Medido: 0 x 0 com a regra, 520 x 300 com o estilo inline.
     *
     * O estilo do canvas vem primeiro para a imagem herdar a posicao (o Leaflet posiciona por
     * `transform`), e o tamanho depois, para ganhar em caso de conflito.
     */
    const posicao = destino.getAttribute('style') || ''
    img.setAttribute(
      'style',
      `${posicao}${posicao && !posicao.trim().endsWith(';') ? ';' : ''}` +
        `max-width:none;width:${tela.width}px;height:${tela.height}px;`
    )
    img.width = tela.width
    img.height = tela.height
    destino.parentNode.replaceChild(img, destino)
  })
}

const CORES_SEVERIDADE: Record<string, string> = {
  critico: '#B91C1C',
  alto: '#C2410C',
  medio: '#A16207',
  informativo: '#1f7752',
}

/** Uma linha "de fundo" varia muito pouco de cor ao longo da largura — é isso que separa um
 *  espaço vazio entre secções de um cartão com texto/bordas a meio. Amostra em vez de ler cada
 *  pixel, para a exportação em PDF não ficar lenta numa imagem com milhares de pixels de largura. */
function linhaEhFundo(dados: Uint8ClampedArray): boolean {
  const passo = 32 // 4 canais × 8 pixels
  const rRef = dados[0], gRef = dados[1], bRef = dados[2]
  let amostras = 0
  let iguais = 0
  for (let i = 0; i < dados.length; i += passo) {
    amostras++
    if (Math.abs(dados[i] - rRef) <= 6 && Math.abs(dados[i + 1] - gRef) <= 6 && Math.abs(dados[i + 2] - bRef) <= 6) iguais++
  }
  return amostras > 0 && iguais / amostras > 0.97
}

/**
 * Converte um Blob em data URI (base64), para embutir um ficheiro de fonte directamente numa
 * regra @font-face sem depender de um pedido de rede no momento da captura.
 */
function blobParaDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result))
    leitor.onerror = reject
    leitor.readAsDataURL(blob)
  })
}

/**
 * O html2canvas-pro usa foreignObjectRendering (obrigatório para o Leaflet ficar bem posicionado,
 * ver capturarContainer abaixo) — mas essa técnica rasteriza a página através de um <img> gerado a
 * partir de uma SVG, um contexto isolado que nem sempre tem acesso às fontes @font-face já
 * carregadas pela página (confirmado ao vivo: a exportação HTML, que clona o DOM em vez de
 * rasterizar, mostra a fonte certa; o PDF, que passa por aqui, caía para a fonte do sistema).
 * A única forma robusta de garantir a fonte nesse contexto isolado é embutir o próprio ficheiro
 * como data URI dentro da regra @font-face, sem pedido de rede nenhum no momento da rasterização.
 */
/**
 * Leva a janela ao topo e só devolve quando lá estiver de facto.
 *
 * O `html` do portal tem `scroll-behavior: smooth`, por isso um `window.scrollTo(0, 0)` anima em
 * vez de saltar, e dois `requestAnimationFrame` acabavam muito antes de a animação terminar: a
 * captura acontecia a meio do percurso e o PDF saía com o cabeçalho cortado por exactamente a
 * distância que faltava percorrer. Daí o `behavior: 'instant'`, que ignora a animação, e a espera
 * activa a seguir, para o caso de algum browser não o respeitar.
 */
async function esperarScrollNoTopo(): Promise<void> {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  const limite = Date.now() + 1000
  while (window.scrollY > 0 && Date.now() < limite) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    if (window.scrollY > 0) window.scrollTo(0, 0)
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

/**
 * Troca temporariamente o `src` de cada <img> dentro do bloco exportado por um data URI.
 *
 * O caminho `foreignObjectRendering` do html2canvas-pro serializa o DOM para dentro de um <svg>, e
 * um SVG desenhado como imagem não faz pedidos de rede: qualquer <img> com URL, mesmo do próprio
 * domínio, aparece como imagem partida. Era isso que deixava o logótipo do cabeçalho e do selo
 * partidos, e os mapas com uma grelha de quadrados vazios onde deviam estar os tiles.
 *
 * Os tiles são de outra origem, mas o Leaflet cria-os com `crossOrigin`, e tanto o OpenStreetMap
 * como o Esri respondem com cabeçalhos CORS: por isso podem ser desenhados num canvas sem o
 * contaminar. Uma imagem que ainda assim falhe fica como está, em vez de partir a exportação
 * inteira.
 */
async function embutirImagensTemporariamente(raiz: HTMLElement): Promise<() => void> {
  const originais: { img: HTMLImageElement; src: string }[] = []
  const imagens = Array.from(raiz.querySelectorAll('img'))

  await Promise.all(
    imagens.map(async (img) => {
      const src = img.getAttribute('src')
      if (!src || src.startsWith('data:')) return
      try {
        if (!img.complete || img.naturalWidth === 0) {
          await new Promise<void>((resolve) => {
            const pronto = () => resolve()
            img.addEventListener('load', pronto, { once: true })
            img.addEventListener('error', pronto, { once: true })
            setTimeout(pronto, 3000)
          })
        }
        if (img.naturalWidth === 0) return
        const tela = document.createElement('canvas')
        tela.width = img.naturalWidth
        tela.height = img.naturalHeight
        const ctx = tela.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0)
        const dataUri = tela.toDataURL('image/png')
        originais.push({ img, src })
        img.setAttribute('src', dataUri)
      } catch {
        // Canvas contaminado ou imagem inacessível: fica com o URL original.
      }
    })
  )

  return () => {
    for (const { img, src } of originais) img.setAttribute('src', src)
  }
}

async function embutirFontesTemporariamente(): Promise<() => void> {
  const regras: string[] = []
  for (const folha of Array.from(document.styleSheets)) {
    let listaRegras: CSSRuleList
    try {
      listaRegras = folha.cssRules
    } catch {
      continue // folha de outra origem (ex.: Google Fonts) sem acesso a cssRules: ignora-se
    }
    for (const regra of Array.from(listaRegras)) {
      if (!(regra instanceof CSSFontFaceRule)) continue
      const src = regra.style.getPropertyValue('src')
      const correspondencia = src.match(/url\(["']?([^"')]+)["']?\)/)
      if (!correspondencia) continue
      try {
        const url = new URL(correspondencia[1], document.baseURI).toString()
        const resposta = await fetch(url)
        const dataUri = await blobParaDataUri(await resposta.blob())
        regras.push(regra.cssText.replace(correspondencia[1], dataUri))
      } catch {
        // Uma fonte que falhe a embutir fica de fora; as restantes continuam a tentar-se.
      }
    }
  }

  const estilo = document.createElement('style')
  estilo.setAttribute('data-pd-fontes-embutidas', 'true')
  estilo.textContent = regras.join('\n')
  document.head.appendChild(estilo)

  return () => estilo.remove()
}

/**
 * Procura, para trás a partir do corte "cego" em alvoPx, a linha de fundo mais próxima dentro de
 * uma janela — cortar aí em vez de exactamente em alvoPx evita partir um cartão ou uma linha de
 * texto ao meio. Só recua (nunca avança): avançar empurraria conteúdo para a página seguinte sem
 * essa página o saber, recuar só encolhe ligeiramente a página actual.
 */
function encontrarCorteSeguro(
  ctx: CanvasRenderingContext2D | null,
  largura: number,
  alturaTotal: number,
  alvoPx: number,
  janela: number,
  minimo: number
): number {
  if (!ctx) return alvoPx
  const limite = Math.max(minimo, alvoPx - janela)
  try {
    for (let y = Math.min(alvoPx, alturaTotal - 1); y >= limite; y--) {
      const linha = ctx.getImageData(0, y, largura, 1).data
      if (linhaEhFundo(linha)) return y
    }
  } catch {
    // Canvas "contaminado" por uma imagem de outra origem sem CORS (raro, dado useCORS: true):
    // sem leitura de pixels possível, cai-se de volta ao corte cego original.
    return alvoPx
  }
  return alvoPx
}

/**
 * Versão de apresentação de uma análise: só o que se mostra a alguém de fora, sem os painéis de
 * auditoria (avisos técnicos, revisão adversarial linha a linha) que ficam na página de detalhe.
 * É este container, por inteiro, que os dois botões de download capturam.
 */
export function DashboardApresentacao({
  analiseId,
  voltarHref = '/analise/nova',
  voltarRotulo = 'Voltar',
  pergunta,
  narrativa,
  achados,
  series,
  graficos,
  destaques = [],
  camadasBrutas = [],
  qualidade = [],
  listas = [],
  multiplos = [],
  calcs = {},
  codigoExecutado = [],
  datasetsInfo = [],
  perguntasViaveis = [],
  geojsonPorNivel,
  criadoEm,
  guardadoInicial = false,
  publicoInicial = false,
  utilizadorId = null,
  traducaoInicial = null,
  ehDono = false,
}: {
  analiseId: string
  /** Para onde o "Voltar" leva. Vem de quem renderiza, que é quem sabe de onde a pessoa veio. */
  voltarHref?: string
  voltarRotulo?: string
  pergunta: string
  narrativa: any
  achados: any[]
  series: any[]
  graficos: any[]
  destaques?: any[]
  camadasBrutas?: any[]
  qualidade?: { coluna: string; completude_pct: number; n_distintos: number; tipo: string }[]
  /** Os registos que a pergunta pediu pelo nome, quando pediu. */
  listas?: any[]
  /** O mesmo indicador em varios momentos, para desenhar lado a lado. */
  multiplos?: any[]
  calcs?: Record<string, { proveniencia: { datasets: string[]; linhas_usadas: number; metodo: string } }>
  codigoExecutado?: { passo_id: string; instrucao: string; codigo: string }[]
  datasetsInfo?: any[]
  /** Perguntas ja verificadas contra os dados, vindas do mesmo gerador do ecra de recusa. */
  perguntasViaveis?: string[]
  geojsonPorNivel: Record<string, any>
  criadoEm: string
  guardadoInicial?: boolean
  publicoInicial?: boolean
  /** Quem esta a ver: so o autor de uma nota ve o botao de apagar. */
  utilizadorId?: number | null
  /** Versao inglesa ja guardada, quando existe: evita a espera na primeira troca. */
  traducaoInicial?: any | null
  /** So o dono liga o acompanhamento: e mandar o portal correr trabalho recorrente. */
  ehDono?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [aExportar, setAExportar] = useState<'pdf' | 'html' | null>(null)
  const [parceiro, setParceiro] = useState<Parceiro | null>(null)
  const [idioma, setIdioma] = useState<'pt' | 'en'>('pt')
  const [traducao, setTraducao] = useState<any | null>(traducaoInicial)

  /*
   * A narrativa que a pagina desenha.
   *
   * So o TEXTO troca de lingua. Os numeros, os mapas, os graficos e as tabelas continuam a vir dos
   * mesmos calculos, porque sao os mesmos: traduzir um relatorio nao e recalcula-lo. Fundir por
   * cima da narrativa original garante que um campo que a traducao nao trouxe cai para o portugues
   * em vez de desaparecer do ecra.
   */
  const narrativaVisivel = idioma === 'en' && traducao ? { ...narrativa, ...traducao } : narrativa
  const [guardado, setGuardado] = useState(guardadoInicial)
  const [aGuardar, setAGuardar] = useState(false)
  // Clicar num gráfico destaca a unidade correspondente no mapa (Parte 20-bis): sem isto, mapa e
  // gráficos eram dois painéis lado a lado que não conversavam entre si.
  const [unidadeDestacada, setUnidadeDestacada] = useState<string | null>(null)
  // Só faz sentido destacar por nome se o coroplético por unidade estiver mesmo visível — quando
  // há pontos/linhas/polígonos próprios, esse mapa fica escondido (ver comentário mais abaixo).
  const nomesUnidades =
    camadasBrutas.length > 0
      ? []
      : Array.from(new Set(series.flatMap((s: any) => s.unidades.map((u: any) => u.nome as string))))

  // Séries de datasets DIFERENTES (ex.: cruzar reservas nacionais com florestais) não podem
  // partilhar um único cartão de mapa com um só selector — a de um dataset ficava escondida atrás
  // das do outro. Um cartão por dataset, cada um com o seu próprio selector interno.
  const gruposSeriesPorDataset = (() => {
    const grupos = new Map<string, typeof series>()
    for (const s of series) {
      const chave = String(s.dataset_id ?? 'sem-dataset')
      const grupo = grupos.get(chave) || []
      grupo.push(s)
      grupos.set(chave, grupo)
    }
    return Array.from(grupos.entries())
  })()

  // Área para focar o mapa de pontos: a fronteira da série mais fina (a mesma lógica de
  // AnaliseSerieGeografica) — já vem filtrada ao filtro_unidade quando a pergunta ficou restrita
  // a uma unidade, por isso "focar aí" É a resposta dinâmica à pergunta, sem precisar de um
  // coroplético. Quando não há filtro (série cobre o país inteiro), o bbox acaba a dar
  // praticamente o mesmo que o ajuste automático a todos os pontos — inofensivo em ambos os casos.
  const ORDEM_FINURA_BBOX: Record<string, number> = { admin3: 3, admin2: 2, admin1: 1 }
  const serieMaisFina = series.reduce(
    (melhor: any, s: any) => ((ORDEM_FINURA_BBOX[s.nivel] || 0) > (ORDEM_FINURA_BBOX[melhor?.nivel] || 0) ? s : melhor),
    null
  )
  const geojsonMaisFino = serieMaisFina ? geojsonPorNivel?.[serieMaisFina.nivel] : null
  const bboxFocoPontos: [number, number, number, number] | null = (() => {
    const features = geojsonMaisFino?.features
    if (!Array.isArray(features) || features.length === 0) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    const varrer = (coords: any): void => {
      if (typeof coords[0] === 'number') {
        const [x, y] = coords
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      } else {
        coords.forEach(varrer)
      }
    }
    for (const f of features) {
      if (f?.geometry?.coordinates) varrer(f.geometry.coordinates)
    }
    return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null
  })()

  // "Análise Comparativa" e "Tendências e Evolução" só aparecem quando a própria pergunta gerou
  // esse tipo de cálculo (comparar_grupos / séries temporais) — nunca por omissão, para não
  // prometer uma secção vazia nem inventar uma comparação que não foi pedida.
  const graficosComparativos = graficos.filter((g: any) => g.categoria === 'comparativo')
  const graficosTemporais = graficos.filter((g: any) => g.categoria === 'temporal')
  const graficosResto = graficos.filter((g: any) => g.categoria !== 'comparativo' && g.categoria !== 'temporal')
  // Análises só de texto (sem mapa nem gráfico) deixavam o cartão de resposta a parecer pobre —
  // uma citação com destaque à esquerda dá-lhe presença sem inventar um segundo cartão de KPI
  // duplicado (a Faixa de KPIs, logo acima, já mostra os números).
  const semVisualizacoes =
    destaques.length === 0 && series.length === 0 && camadasBrutas.length === 0 && graficos.length === 0

  // Convida a continuar a explorar os mesmos datasets em vez de terminar a experiência num
  // ecrã estático — reaproveita o mesmo gerador de sugestões já usado no AI Insights, para não
  // ter duas lógicas diferentes de "que pergunta fazer a seguir" no portal.
  // As verificadas vem primeiro: foram confrontadas com as colunas, os metodos e a cobertura reais
  // dos datasets, ao contrario do gerador por modelo, que so conhece o titulo do ficheiro e por
  // isso podia propor perguntas sem resposta nenhuma nos dados. O gerador antigo fica como recurso
  // para a seccao nunca aparecer vazia.
  const perguntasSugeridas = Array.from(
    new Set([
      ...(perguntasViaveis || []),
      ...getSuggestedQuestions(
        datasetsInfo.map((d: any) => ({ title: d.titulo, category: d.categoria ? { name: d.categoria } : null, dataType: d.dataType, year: d.ano }))
      ),
    ])
  )
    .filter((p) => p.trim().toLowerCase() !== pergunta.trim().toLowerCase())
    .slice(0, 4)
  const datasetIdsParaNovaAnalise = datasetsInfo.map((d: any) => d.id).join(',')

  // Clicar numa linha da Tabela Exploratória destaca a mesma categoria nos gráficos (Parte
  // 20-ter): só faz sentido se algum valor da linha for exactamente uma categoria que já
  // aparece num gráfico clicável — senão não há nada para destacar, e fica sem efeito em
  // silêncio em vez de "seleccionar" um valor que não existe em lado nenhum.
  const categoriasClicaveis = new Set(graficosResto.flatMap((g: any) => g.eixoX || []))
  function aoClicarLinhaTabela(valores: string[]) {
    const valor = valores.find((v) => categoriasClicaveis.has(v))
    if (valor) setUnidadeDestacada((prev) => (prev === valor ? null : valor))
  }

  // html2canvas-pro (não o "html2canvas" normal, nem o embutido no jsPDF): é o único dos dois que
  // sabe interpretar color-mix()/oklch(), que este site usa em várias folhas de estilo — a versão
  // normal rebenta com "unsupported color function" ao tentar ler esses estilos computados.
  async function capturarContainer() {
    if (!containerRef.current) return null
    const { default: html2canvas } = await import('html2canvas-pro')
    // Sem isto, um clique em "PDF"/"HTML" logo após a página carregar podia capturar antes de a
    // Inter (via next/font) ter terminado de aplicar-se às caixas de texto — o canvas ficava com
    // a serif de recurso do sistema em vez da tipografia real do portal, um export com "letra
    // errada" mesmo com o ecrã já a mostrar a fonte certa.
    await document.fonts.ready
    // O foreignObjectRendering do html2canvas-pro captura em relação à posição de scroll actual
    // da janela, não à posição absoluta do elemento no documento: sem estar mesmo no topo, a
    // imagem começa a meio do container e o PDF sai sem cabeçalho.
    await esperarScrollNoTopo()
    const removerFontesEmbutidas = await embutirFontesTemporariamente()
    // Um <img> com URL continua a ser um pedido de rede, e o SVG que o foreignObject gera é
    // desenhado num contexto isolado onde esses pedidos não acontecem: sem embutir, o logótipo do
    // cabeçalho e todos os tiles dos mapas saíam como imagem partida.
    const restaurarImagens = await embutirImagensTemporariamente(containerRef.current)
    // O Leaflet posiciona quase tudo o que desenha com `transform: translate3d(...)`, e o
    // html2canvas erra ao recalcular essas posições: os tiles saem deslocados e as linhas correm
    // para fora do mapa. Assentar as translações em left/top antes da captura resolve isso, e é o
    // que permite dispensar o `foreignObjectRendering` (ver o porquê logo abaixo).
    const restaurarMapas = assentarTransformesLeaflet(containerRef.current)
    try {
      return await html2canvas(containerRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        /*
         * `foreignObjectRendering` fica DESLIGADO, e não é indiferente.
         *
         * Ligado, o html2canvas-pro desloca o conteúdo todo para cima dentro da tela. Medido numa
         * página de diagnóstico: 426px de desvio, com a tela do tamanho certo — o relatório saía
         * sem logótipo, sem título e sem subtítulo, a começar a meio do cabeçalho. O desvio não
         * corresponde à posição do elemento no documento, não desaparece com `scrollX`/`scrollY`
         * nem com `x`/`y`, e não muda ao tirar o `windowWidth`.
         *
         * Estava ligado por causa dos mapas, que sem ele saíam partidos. Isso agora resolve-se
         * antes da captura, assentando as translações do Leaflet: medido na mesma página, o
         * cabeçalho passa a começar exactamente onde deve e o mapa monta-se inteiro.
         */
        foreignObjectRendering: false,
      })
    } finally {
      restaurarMapas()
      restaurarImagens()
      removerFontesEmbutidas()
    }
  }

  async function exportarPdf() {
    setAExportar('pdf')
    try {
      const canvas = await capturarContainer()
      if (!canvas) return
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF('p', 'mm', 'a4')
      const larguraPagina = 210
      const alturaPagina = 297
      const pxPorMm = canvas.width / larguraPagina
      const alturaImagemMm = (canvas.height * larguraPagina) / canvas.width
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const ctx = canvas.getContext('2d')

      // Uma imagem só, mais alta que uma página A4: fatia-se em páginas sucessivas deslocando o
      // ponto de desenho para cima em cada página. A versão antiga cortava sempre exactamente aos
      // 297mm, o que partia cartões e linhas de texto ao meio sempre que a fronteira caía a meio
      // de uma secção — cada corte agora procura, para trás a partir desse ponto, a linha de
      // pixels mais próxima que seja só fundo (sem conteúdo) e corta ali: a página fica um pouco
      // mais curta em vez de partir algo.
      let offsetPx = 0
      let primeiraPagina = true
      while (offsetPx < canvas.height) {
        const alvoPx = Math.min(canvas.height, offsetPx + alturaPagina * pxPorMm)
        const cortePx =
          alvoPx >= canvas.height
            ? canvas.height
            : encontrarCorteSeguro(ctx, canvas.width, canvas.height, Math.round(alvoPx), Math.round(70 * pxPorMm), offsetPx + Math.round(30 * pxPorMm))

        if (!primeiraPagina) doc.addPage()
        primeiraPagina = false
        doc.addImage(dataUrl, 'JPEG', 0, -(offsetPx / pxPorMm), larguraPagina, alturaImagemMm)

        offsetPx = cortePx > offsetPx ? cortePx : alvoPx
      }
      doc.save(`analise-${analiseId}.pdf`)
    } finally {
      setAExportar(null)
    }
  }

  /**
   * Exporta o HTML real da página (não uma captura de ecrã): clona o container, embute as regras
   * CSS realmente aplicadas (a versão antiga era uma imagem única do html2canvas — pesada, texto
   * não seleccionável, e sujeita ao mesmo risco de fonte errada que o PDF já tinha). Elementos só
   * de interacção (`print:hidden`: botões, popovers) saem do clone, o mesmo critério que já
   * existia para impressão.
   */
  async function exportarHtml() {
    setAExportar('html')
    try {
      if (!containerRef.current) return
      await document.fonts.ready

      const origin = window.location.origin
      const blocosCss: string[] = []
      for (const folha of Array.from(document.styleSheets)) {
        try {
          blocosCss.push(Array.from(folha.cssRules).map((r) => r.cssText).join('\n'))
        } catch {
          // Folha de outra origem (CORS): as regras não são legíveis via cssRules, mas ainda dá
          // para a referenciar directamente.
          if (folha.href) blocosCss.push(`@import url("${folha.href}");`)
        }
      }
      // Urls relativas a /_next/static (fontes, etc.) só resolvem a partir do domínio real —
      // tornam-se absolutas para o ficheiro exportado continuar a carregá-las quando aberto fora
      // do portal (localmente, por exemplo), desde que haja ligação à internet nessa altura.
      const css = blocosCss.join('\n').replace(/url\((['"]?)(\/_next\/[^'")]+)\1\)/g, `url($1${origin}$2$1)`)

      // O <div class="pdx"> à volta não é decoração: todos os tokens do sistema de design vivem
      // nesse âmbito, e o `containerRef` é um nó DENTRO dele. Sem o recriar aqui, o ficheiro
      // exportado levava o CSS todo mas nenhuma variável resolvia, e saía sem cor nenhuma.
      // Mesmo motivo do PDF, por outra via: um <img src="/images/logo.png"> guardado num ficheiro
      // solto aponta para um caminho que não existe fora do portal. Embutido, o HTML exportado
      // abre com logótipo e com mapas em qualquer lado, mesmo sem ligação.
      const restaurarImagens = await embutirImagensTemporariamente(containerRef.current)
      const clone = containerRef.current.cloneNode(true) as HTMLElement
      restaurarImagens()
      // Antes de mexer no clone: congelarTelas empareha os canvas por indice entre original e
      // clone, e qualquer remocao previa fazia as duas listas divergirem em tamanho, altura em
      // que a funcao desiste por seguranca. Congelar primeiro e remover depois mantem o
      // emparelhamento exacto, e as imagens dentro de um bloco print:hidden saem com ele.
      congelarTelas(containerRef.current, clone)
      clone.querySelectorAll('.print\\:hidden').forEach((el) => el.remove())

      const html = `<!doctype html>
<html lang="pt-MZ"><head><meta charset="utf-8" />
<title>${narrativaVisivel.titulo} · Data Portal</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${css}</style>
</head><body class="min-h-screen"><div class="pdx min-h-screen"><div class="w-full max-w-[1920px] mx-auto px-4 md:px-6 py-6">${clone.innerHTML}</div></div></body></html>`
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analise-${analiseId}.html`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setAExportar(null)
    }
  }

  async function alternarGuardado() {
    setAGuardar(true)
    try {
      const resposta = await fetch(`/api/analise/${analiseId}/guardar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardado: !guardado }),
      })
      if (resposta.ok) {
        const dados = await resposta.json()
        setGuardado(dados.guardado)
      }
    } finally {
      setAGuardar(false)
    }
  }

  return (
    <div className="pdx min-h-screen">
      {/*
        Barra de acções: não faz parte do que é exportado. Fica em tom de papel, e não em verde,
        porque a navegação do portal por cima já é clara e o cabeçalho do relatório logo abaixo é
        verde-floresta: uma barra escura entre os dois criaria listas.
      */}
      <div className="pdx-barra-accoes print:hidden">
        <Link href={voltarHref} className="pdx-btn">
          <ArrowLeft className="size-4" aria-hidden />
          {voltarRotulo}
        </Link>
        <div className="pdx-barra-grupo">
          <button
            type="button"
            onClick={alternarGuardado}
            disabled={aGuardar}
            className={`pdx-btn${guardado ? ' pdx-btn-activo' : ''}`}
          >
            {aGuardar ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : guardado ? (
              <BookmarkCheck className="size-3.5" aria-hidden />
            ) : (
              <Bookmark className="size-3.5" aria-hidden />
            )}
            {guardado ? 'Guardado' : 'Guardar'}
          </button>
          <PartilharBotao analiseId={analiseId} publicoInicial={publicoInicial} />
          <SelectorParceiro parceiro={parceiro} onEscolher={setParceiro} />
          <SelectorIdioma
            analiseId={analiseId}
            idioma={idioma}
            temTraducao={!!traducao}
            onMudar={(lingua, nova) => {
              if (nova) setTraducao(nova)
              setIdioma(lingua)
            }}
          />
          {/*
            Os números, em folha de cálculo.
            Ligações e não botões: o servidor devolve o ficheiro com `Content-Disposition:
            attachment`, e o browser trata do descarregamento sem estado nenhum deste lado. Uma
            ligação tambem se abre num separador novo e copia-se, que um `onClick` nao faz.
          */}
          <a
            href={`/api/analise/${analiseId}/dados?formato=xlsx`}
            className="pdx-btn"
            title="Todos os números da análise, uma folha por bloco, com a proveniência de cada um"
          >
            <Sheet className="size-3.5" aria-hidden />
            Excel
          </a>
          <a
            href={`/api/analise/${analiseId}/dados?formato=csv`}
            className="pdx-btn"
            title="Os mesmos números numa só tabela, em formato longo"
          >
            <Table2 className="size-3.5" aria-hidden />
            CSV
          </a>
          <button
            type="button"
            onClick={exportarHtml}
            disabled={aExportar === 'html'}
            className="pdx-btn"
          >
            {aExportar === 'html' ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="size-3.5" aria-hidden />
            )}
            HTML
          </button>
          <button
            type="button"
            onClick={exportarPdf}
            disabled={aExportar === 'pdf'}
            className="pdx-btn pdx-btn-primary"
          >
            {aExportar === 'pdf' ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <FileDown className="size-3.5" aria-hidden />
            )}
            PDF
          </button>
        </div>
      </div>

      {/* Conteúdo exportável: ecrã cheio, densidade tipo BI, não uma coluna centrada estreita */}
      <div
        ref={containerRef}
        className="w-full max-w-[1920px] mx-auto px-4 md:px-6 py-6"
        style={{ background: 'var(--paper)' }}
      >
        <header className="pdx-hero">
          <div className="pdx-marca">
            {/* <img> e não next/image: o export por html2canvas captura o DOM já desenhado, e o
                srcset responsivo do next/image podia resolver para um ficheiro ainda não
                carregado no momento da captura, deixando o PDF sem logótipo. */}
            <img src="/images/logo.png" alt="" width={34} height={31} />
            <p className="pdx-hero-eyebrow">Data Portal · dataportal.co.mz</p>
            {/*
              A marca do parceiro entra ao lado da nossa, separada por uma barra, e nunca no lugar
              dela. "Preparado para" e nao "por": o parceiro e o destinatario do trabalho, e trocar
              a preposicao atribuir-lhe-ia uma analise que nao fez e numeros que nao verificou.
            */}
            {parceiro && (
              <span className="pdx-hero-parceiro">
                <span className="pdx-hero-parceiro-risco" aria-hidden />
                <img src={parceiro.logo} alt="" height={26} />
                <span>Preparado para {parceiro.rotulo}</span>
              </span>
            )}
          </div>
          <h1 className="pdx-hero-titulo">{narrativaVisivel.titulo}</h1>
          <p className="pdx-hero-sub">{narrativaVisivel.subtitulo}</p>
          <div className="pdx-hero-pergunta">
            <p>Pergunta feita</p>
            <p>{pergunta}</p>
          </div>
          <div className="pdx-hero-data">
            {new Date(criadoEm).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </header>

        <FaixaKPIs
          numerosChave={narrativaVisivel.numeros_chave || []}
          calcs={calcs}
          graficos={graficos}
          series={series}
          nomesUnidades={nomesUnidades as string[]}
          unidadeDestacada={unidadeDestacada}
          onDestacar={setUnidadeDestacada}
        />

        <section className="pdx-panel mb-5">
          <div className="pdx-panel-body p-6">
            <div className="pdx-narrativa">
              {/* `semVisualizacoes` continua a mandar no destaque: sem gráfico nem mapa, esta
                  frase é o relatório inteiro e sobe um degrau de tamanho. */}
              <p className={`pdx-lede${semVisualizacoes ? ' pdx-lede-so' : ''}`}>
                {narrativaVisivel.resposta_directa}
              </p>
              {(narrativaVisivel.o_que_mostram || narrativaVisivel.porque) && (
                <div className="pdx-narr">
                  {narrativaVisivel.o_que_mostram && (
                    <div className="pdx-narr-col">
                      <h2>O que os dados mostram</h2>
                      <p>{narrativaVisivel.o_que_mostram}</p>
                    </div>
                  )}
                  {narrativaVisivel.porque && (
                    <div className="pdx-narr-col alt">
                      <h2>Porquê</h2>
                      <p>{narrativaVisivel.porque}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Painel principal: mapa e gráficos lado a lado numa grelha densa, não empilhados um a um.
            items-start é essencial: sem isto o grid esticava a coluna mais curta (normalmente o
            mapa, um só cartão) até à altura da mais alta (vários gráficos empilhados), deixando
            uma faixa em branco por baixo do cartão do mapa em vez de cada coluna parar onde o seu
            próprio conteúdo acaba. */}
        {/* O mapa tem altura fixa (filtros + pesquisa + legenda + Leaflet, ~460px) e a grelha de
            gráficos cresce com a quantidade — lado a lado numa divisão fixa (7/5), uma das duas
            colunas ficava sempre bem mais curta que a outra, com um vazio grande por baixo,
            fosse qual fosse o número de gráficos (mesmo 2 colunas de gráficos, com 5+ gráficos,
            ainda ficava mais alto que o mapa). Em vez de tentar equilibrar a divisão consoante a
            quantidade (nunca dá certo para todos os casos), empilha-se: mapa à largura toda,
            gráficos numa grelha larga a seguir. */}
        <div className="space-y-4 mb-5">
          {(destaques.length > 0 || series.length > 0 || camadasBrutas.length > 0) && (
            <div className="space-y-4">
              {/* A camada bruta (polígonos/linhas tal como estão no dataset, sem cor por valor)
                  só é redundante com o coroplético quando é O MESMO dataset (o coroplético já
                  pinta as mesmas geometrias a cores) — comparar por dataset_id, não por "existe
                  alguma série": ao cruzar dois datasets geoespaciais (ex.: reservas nacionais +
                  florestais), a série calculada é só de um deles, e filtrar por "series.length
                  > 0" escondia o OUTRO dataset por inteiro, que nunca tinha série nenhuma. Fica
                  visível sempre que não haja série calculada PARA ESSE dataset, ou quando é de
                  pontos (localizações individuais, que o coroplético não substitui de qualquer forma). */}
              {camadasBrutas
                .filter((c: any) => geometriaPrecisaDaSuaPropriaCamada(c.tipoGeometria) || !series.some((s: any) => s.dataset_id === c.dataset_id))
                .map((c: any) => {
                const insights = computeGeoInsights({ features: c.features })
                return (
                  <div key={c.dataset_id} id={`camada-mapa-${c.dataset_id}`}>
                    <AnaliseMapaPontos camada={c} bboxFoco={bboxFocoPontos} unidadeDestacada={unidadeDestacada} />
                    {insights && (
                      <div className="pdx-nota mt-2">
                        {insights.geometryTypes.map(({ type, count }) => (
                          <span key={type}>
                            <strong>{count}</strong>{' '}
                            {ROTULO_GEOMETRIA[type] || type}
                            {count !== 1 ? 's' : ''}
                          </span>
                        ))}
                        {insights.totalAreaKm2 != null && (
                          <span>Área total: <strong>{formatarNumeroInsight(insights.totalAreaKm2, 'km²')}</strong></span>
                        )}
                        {insights.totalLengthKm != null && (
                          <span>Extensão total: <strong>{formatarNumeroInsight(insights.totalLengthKm, 'km')}</strong></span>
                        )}
                        {insights.centroid && (
                          <span>Centro: <strong>{insights.centroid[1].toFixed(2)}°, {insights.centroid[0].toFixed(2)}°</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {unidadeDestacada && (
                <div className="pdx-nota">
                  <span>
                    <strong>A destacar:</strong> {unidadeDestacada}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUnidadeDestacada(null)}
                    className="font-semibold hover:underline"
                    style={{ color: 'var(--forest-700)' }}
                  >
                    Limpar
                  </button>
                </div>
              )}
              {destaques.map((d: any) => (
                <AnaliseMapaDestaque key={d.passo_id} destaque={d} />
              ))}
              {/* Segundo mapa, sempre que houver, MAS não para datasets de pontos: uma área pintada
                  com um número lá dentro não é útil quando o que existe são localizações
                  individuais (ex.: unidades sanitárias) — o mapa de pontos, ajustado à área da
                  pergunta (ver abaixo), já é a resposta dinâmica certa nesse caso. O coroplético
                  fica só para datasets sem geometria de ponto própria (linhas/polígonos), onde
                  comparar áreas por cor é mesmo a forma certa de ver a agregação. */}
              {gruposSeriesPorDataset
                .filter(([chave, grupo]) => {
                  /*
                   * Este filtro nasceu quando o mapa agregado era SEMPRE um coroplético. Para um
                   * dataset de pontos isso dava duas leituras da mesma coisa, e a pior das duas
                   * pintada por cima: um coroplético de contagens faz uma província grande parecer
                   * melhor servida por ser grande. Esconder o agregado era, na altura, a decisão
                   * certa.
                   *
                   * Deixou de ser quando o agregado passou a sair em símbolos proporcionais. Aí já
                   * não é a mesma leitura: a camada bruta responde "onde está cada uma" e os
                   * círculos respondem "quantas por unidade", e a área do polígono não entra em
                   * nenhuma das duas. O filtro continuava a apagar o mapa novo, e o efeito era
                   * visível: na página da análise ele aparecia, no dashboard não, e por isso também
                   * não aparecia no HTML nem no PDF, que são exportados a partir daqui.
                   */
                  const temCamadaPropria = camadasBrutas.some(
                    (c: any) => String(c.dataset_id) === chave && geometriaPrecisaDaSuaPropriaCamada(c.tipoGeometria)
                  )
                  if (!temCamadaPropria) return true
                  return grupo.some((serie: any) => formaDaSerie(serie) === 'simbolos')
                })
                .map(([chave, grupo]) => (
                  <AnaliseSerieGeografica
                    key={chave}
                    series={grupo}
                    geojsonPorNivel={geojsonPorNivel}
                    unidadeDestacada={unidadeDestacada}
                  />
                ))}
            </div>
          )}
          {graficosResto.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {graficosResto.map((g: any) => (
                // Uma matriz de cor ou um diagrama de fluxo numa coluna de um terço fica ilegível:
                // as células encolhem abaixo do rótulo e as fitas cruzam-se sem espaço. Estas duas
                // formas ocupam a largura toda; as restantes continuam a emparelhar.
                <div key={g.passo_id} className={FORMA_LARGA.has(g.tipo) ? 'sm:col-span-2 xl:col-span-3' : undefined}>
                  <AnaliseGrafico
                    grafico={g}
                    categoriaActiva={unidadeDestacada}
                    aoClicarCategoria={setUnidadeDestacada}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {graficosComparativos.length > 0 && (
          <section className="pdx-panel mb-5">
            <div className="pdx-panel-head">
              <span className="pdx-panel-icone" aria-hidden>
                <GitCompareArrows className="size-3.5" />
              </span>
              <h2>Análise comparativa</h2>
              <span className="pdx-panel-sub pdx-num">
                {graficosComparativos.length} {graficosComparativos.length === 1 ? 'comparação' : 'comparações'}
              </span>
            </div>
            <div className={`pdx-panel-body grid grid-cols-1 gap-4 ${graficosComparativos.length > 1 ? 'sm:grid-cols-2' : ''}`}>
              {graficosComparativos.map((g: any) => {
                const [rotuloA, rotuloB] = g.eixoX
                const [valorA, valorB] = g.series?.[0]?.valores || []
                const temDiferenca = typeof valorA === 'number' && typeof valorB === 'number' && valorA !== 0
                const diferenca = temDiferenca ? valorB - valorA : null
                const percentual = temDiferenca ? (diferenca! / Math.abs(valorA)) * 100 : null
                return (
                  <div key={g.passo_id}>
                    <AnaliseGrafico grafico={g} />
                    {temDiferenca && (
                      <p className="pdx-nota mt-2">
                        <span>
                        <strong>{rotuloB}</strong> face a <strong>{rotuloA}</strong>:{' '}
                        {diferenca! > 0 ? '+' : ''}
                        {diferenca!.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} (
                        {percentual! > 0 ? '+' : ''}
                        {percentual!.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%)
                        </span>
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {graficosTemporais.length > 0 && (
          <section className="pdx-panel mb-5">
            <div className="pdx-panel-head">
              <span className="pdx-panel-icone" aria-hidden>
                <TrendingUp className="size-3.5" />
              </span>
              <h2>Tendências e evolução</h2>
              <span className="pdx-panel-sub pdx-num">
                {graficosTemporais.length} {graficosTemporais.length === 1 ? 'série' : 'séries'}
              </span>
            </div>
            <div className={`pdx-panel-body grid grid-cols-1 gap-4 ${graficosTemporais.length > 1 ? 'sm:grid-cols-2' : ''}`}>
              {graficosTemporais.map((g: any) => (
                <AnaliseGrafico key={g.passo_id} grafico={g} />
              ))}
            </div>
          </section>
        )}

        {achados.length > 0 && (
          <section className="pdx-panel mb-5">
            <div className="pdx-panel-head">
              <span className="pdx-panel-icone" aria-hidden>
                <Lightbulb className="size-3.5" />
              </span>
              <h2>O que não perguntou mas devia saber</h2>
            </div>
            <div
              className={`pdx-panel-body grid grid-cols-1 gap-3 ${
                Math.min(achados.length, 6) >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : Math.min(achados.length, 6) === 2 ? 'sm:grid-cols-2' : ''
              }`}
            >
              {achados.slice(0, 6).map((a: any, i: number) => (
                <div
                  key={i}
                  className="pdx-achado"
                  style={{ ['--achado-cor' as any]: CORES_SEVERIDADE[a.severidade] || 'var(--forest-600)' }}
                >
                  <p>{a.titulo}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {multiplos.map((m: any) => (
          <AnaliseMultiplosPequenos key={m.passo_id} multiplo={m} geojson={geojsonPorNivel?.[m.nivel] || null} />
        ))}

        <PainelAnaliseViva analiseId={analiseId} ehDono={ehDono} />

        <PainelAnotacoes analiseId={analiseId} utilizadorId={utilizadorId} publico={publicoInicial} />

        {/* Os nomes que a pergunta pediu. Vêm antes da tabela exploratória de propósito: a
            tabela é para quem quiser vasculhar, a lista é a resposta a uma pergunta feita. */}
        {listas.map((lista: any) => (
          <AnaliseListaRegistos key={lista.passo_id} lista={lista} />
        ))}

        {/* Só para datasets alfanuméricos: os geoespaciais já têm o mapa (localização real +
            filtros + legenda) como a forma certa de explorar os dados linha a linha — uma tabela
            ao lado seria a mesma informação duas vezes, pior apresentada. */}
        <TabelaExploratoria
          datasets={datasetsInfo.filter((d: any) => d.dataType !== 'geoespacial').map((d: any) => ({ id: d.id, titulo: d.titulo }))}
          datasetIdsComMapa={camadasBrutas.map((c: any) => c.dataset_id)}
          aoClicarLinha={categoriasClicaveis.size > 0 ? aoClicarLinhaTabela : undefined}
          valorDestacado={unidadeDestacada}
        />

        <MetadadosDataset datasets={datasetsInfo} />

        <PerguntasSugeridas perguntas={perguntasSugeridas} datasetIds={datasetIdsParaNovaAnalise} />

        <SeloAutoria analiseId={analiseId} criadoEm={criadoEm} />

        <footer className="pdx-rodape">
          <p className="mb-1">
            <strong>Fontes:</strong>{' '}
            {narrativa.fontes.map((f: any) => `${f.instituicao}${f.ano ? ` (${f.ano})` : ''}`).join('; ')}
          </p>
          <p>Produzido por dataportal.co.mz, o portal de dados oficial de Moçambique.</p>
        </footer>
      </div>
    </div>
  )
}
