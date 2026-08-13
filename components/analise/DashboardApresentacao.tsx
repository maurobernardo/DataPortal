'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bookmark, BookmarkCheck, Download, FileDown, Loader2 } from 'lucide-react'
import { AnaliseSerieGeografica } from './AnaliseSerieGeografica'
import { AnaliseMapaDestaque } from './AnaliseMapaDestaque'
import { AnaliseMapaPontos } from './AnaliseMapaPontos'
import { AnaliseGrafico } from './AnaliseGrafico'
import { MetadadosDataset } from './MetadadosDataset'
import { TabelaExploratoria } from './TabelaExploratoria'
import { FaixaKPIs } from './FaixaKPIs'
import { QualidadeDados } from './QualidadeDados'
import { PerguntasSugeridas } from './PerguntasSugeridas'
import { CodigoExecutado } from './CodigoExecutado'
import { PartilharBotao } from './PartilharBotao'
import { getSuggestedQuestions } from '@/lib/ai-suggested-questions'
import { computeGeoInsights } from '@/lib/geo-intelligence'

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

const CORES_SEVERIDADE: Record<string, string> = {
  critico: '#B91C1C',
  alto: '#C2410C',
  medio: '#A16207',
  informativo: '#064E2C',
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
  pergunta,
  narrativa,
  achados,
  series,
  graficos,
  destaques = [],
  camadasBrutas = [],
  qualidade = [],
  calcs = {},
  codigoExecutado = [],
  datasetsInfo = [],
  geojsonPorNivel,
  criadoEm,
  guardadoInicial = false,
  publicoInicial = false,
}: {
  analiseId: string
  pergunta: string
  narrativa: any
  achados: any[]
  series: any[]
  graficos: any[]
  destaques?: any[]
  camadasBrutas?: any[]
  qualidade?: { coluna: string; completude_pct: number; n_distintos: number; tipo: string }[]
  calcs?: Record<string, { proveniencia: { datasets: string[]; linhas_usadas: number; metodo: string } }>
  codigoExecutado?: { passo_id: string; instrucao: string; codigo: string }[]
  datasetsInfo?: any[]
  geojsonPorNivel: Record<string, any>
  criadoEm: string
  guardadoInicial?: boolean
  publicoInicial?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [aExportar, setAExportar] = useState<'pdf' | 'html' | null>(null)
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
  const perguntasSugeridas = getSuggestedQuestions(
    datasetsInfo.map((d: any) => ({ title: d.titulo, category: d.categoria ? { name: d.categoria } : null, dataType: d.dataType, year: d.ano }))
  )
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
    return html2canvas(containerRef.current, {
      useCORS: true,
      scale: 2,
      backgroundColor: '#ffffff',
      windowWidth: containerRef.current.scrollWidth,
      // O Leaflet posiciona as suas camadas (linhas, marcadores) com "transform" em CSS, não com
      // left/top — sem foreignObjectRendering o html2canvas recalcula essas posições à mão e
      // erra, fazendo uma linha (ex.: Linha Férrea) aparecer esticada para fora do mapa.
      foreignObjectRendering: true,
    })
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

      const clone = containerRef.current.cloneNode(true) as HTMLElement
      clone.querySelectorAll('.print\\:hidden').forEach((el) => el.remove())

      const html = `<!doctype html>
<html lang="pt-MZ"><head><meta charset="utf-8" />
<title>${narrativa.titulo} · Data Portal</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${css}</style>
</head><body class="min-h-screen bg-[#FAFBFA]"><div class="w-full max-w-[1920px] mx-auto px-4 md:px-6 py-6">${clone.innerHTML}</div></body></html>`
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
    <div className="min-h-screen bg-[#FAFBFA]">
      {/* Barra de acções: não faz parte do que é exportado */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E2E8E5] px-4 py-3 flex items-center justify-between gap-3 print:hidden">
        <Link
          href="/analise/nova"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8E5] bg-white px-3 py-1.5 text-[13px] font-semibold text-[var(--pd-ink-700)] hover:border-[#CFE3D6] hover:text-[#064E2C] transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={alternarGuardado}
            disabled={aGuardar}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
              guardado
                ? 'border-[#064E2C] bg-[#F1F8F4] text-[#064E2C]'
                : 'border-[#E2E8E5] text-[var(--pd-ink-700)] hover:border-[#CFE3D6]'
            }`}
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
          <button
            type="button"
            onClick={exportarHtml}
            disabled={aExportar === 'html'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8E5] px-3 py-1.5 text-[13px] font-semibold text-[var(--pd-ink-700)] hover:border-[#CFE3D6] disabled:opacity-60"
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#064E2C] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#0a6339] disabled:opacity-60"
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
      <div ref={containerRef} className="w-full max-w-[1920px] mx-auto px-4 md:px-6 py-6">
        <header className="rounded-2xl bg-gradient-to-br from-[#064E2C] to-[#0a6339] text-white px-6 py-8 md:px-10 md:py-10 mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9FD4B4] mb-3">
            Data Portal · dataportal.co.mz
          </p>
          <h1 className="text-2xl md:text-[34px] font-extrabold leading-[1.14] tracking-tight mb-3 max-w-4xl">
            {narrativa.titulo}
          </h1>
          <p className="text-[15px] md:text-[17px] text-white/85 leading-relaxed max-w-3xl mb-5">
            {narrativa.subtitulo}
          </p>
          <div className="inline-block max-w-3xl rounded-xl bg-white/10 border border-white/20 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9FD4B4] mb-1">Pergunta feita</p>
            <p className="text-[15px] md:text-[16px] font-semibold leading-snug">{pergunta}</p>
          </div>
          <div className="mt-4 text-[12px] text-white/60">
            {new Date(criadoEm).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </header>

        <FaixaKPIs
          numerosChave={narrativa.numeros_chave || []}
          calcs={calcs}
          graficos={graficos}
          nomesUnidades={nomesUnidades as string[]}
          unidadeDestacada={unidadeDestacada}
          onDestacar={setUnidadeDestacada}
        />

        <section className="rounded-2xl border border-[#E2E8E5] bg-white p-6 mb-5">
          {semVisualizacoes ? (
            <p className="text-[19px] md:text-[21px] font-medium leading-snug text-[var(--pd-ink-900)] border-l-4 border-[#064E2C] pl-4 mb-4">
              {narrativa.resposta_directa}
            </p>
          ) : (
            <p className="text-[16px] leading-relaxed text-[var(--pd-ink-800)] mb-4">{narrativa.resposta_directa}</p>
          )}
          {narrativa.o_que_mostram && (
            <div className="pt-4 border-t border-[#E2E8E5]">
              <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">O que os dados mostram</h2>
              <p className="text-[14px] leading-relaxed text-[var(--pd-ink-700)] whitespace-pre-line">{narrativa.o_que_mostram}</p>
            </div>
          )}
          {narrativa.porque && (
            <div className="pt-4 mt-4 border-t border-[#E2E8E5]">
              <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">Porquê</h2>
              <p className="text-[14px] leading-relaxed text-[var(--pd-ink-700)] whitespace-pre-line">{narrativa.porque}</p>
            </div>
          )}
        </section>

        {/* Painel principal: mapa e gráficos lado a lado numa grelha densa, não empilhados um a um.
            items-start é essencial: sem isto o grid esticava a coluna mais curta (normalmente o
            mapa, um só cartão) até à altura da mais alta (vários gráficos empilhados), deixando
            uma faixa em branco por baixo do cartão do mapa em vez de cada coluna parar onde o seu
            próprio conteúdo acaba. */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5 items-start">
          {(destaques.length > 0 || series.length > 0 || camadasBrutas.length > 0) && (
            <div className="xl:col-span-7 space-y-4">
              {camadasBrutas.map((c: any) => {
                const insights = computeGeoInsights({ features: c.features })
                return (
                  <div key={c.dataset_id} id={`camada-mapa-${c.dataset_id}`}>
                    <AnaliseMapaPontos camada={c} bboxFoco={bboxFocoPontos} />
                    {insights && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-[#E2E8E5] bg-[#FAFBFA] px-4 py-2.5 text-[12px] text-[var(--pd-ink-700)]">
                        {insights.geometryTypes.map(({ type, count }) => (
                          <span key={type}>
                            <strong className="text-[var(--pd-ink-900)]">{count}</strong>{' '}
                            {ROTULO_GEOMETRIA[type] || type}
                            {count !== 1 ? 's' : ''}
                          </span>
                        ))}
                        {insights.totalAreaKm2 != null && (
                          <span>Área total: <strong className="text-[var(--pd-ink-900)]">{formatarNumeroInsight(insights.totalAreaKm2, 'km²')}</strong></span>
                        )}
                        {insights.totalLengthKm != null && (
                          <span>Extensão total: <strong className="text-[var(--pd-ink-900)]">{formatarNumeroInsight(insights.totalLengthKm, 'km')}</strong></span>
                        )}
                        {insights.centroid && (
                          <span>Centro: <strong className="text-[var(--pd-ink-900)]">{insights.centroid[1].toFixed(2)}°, {insights.centroid[0].toFixed(2)}°</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {unidadeDestacada && (
                <div className="flex items-center gap-2 text-[12px] text-[var(--pd-ink-700)]">
                  <span className="font-semibold">A destacar: {unidadeDestacada}</span>
                  <button
                    type="button"
                    onClick={() => setUnidadeDestacada(null)}
                    className="text-[#064E2C] hover:underline font-semibold"
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
              {series.length > 0 && !camadasBrutas.some((c: any) => c.tipoGeometria === 'Point') && (
                <AnaliseSerieGeografica
                  series={series}
                  geojsonPorNivel={geojsonPorNivel}
                  unidadeDestacada={unidadeDestacada}
                />
              )}
            </div>
          )}
          {graficosResto.length > 0 && (
            <div className={`grid grid-cols-1 ${(series.length > 0 || destaques.length > 0 || camadasBrutas.length > 0) ? 'xl:col-span-5' : 'sm:grid-cols-2 xl:grid-cols-3 xl:col-span-12'} gap-4`}>
              {graficosResto.map((g: any) => (
                <AnaliseGrafico
                  key={g.passo_id}
                  grafico={g}
                  categoriaActiva={unidadeDestacada}
                  aoClicarCategoria={setUnidadeDestacada}
                />
              ))}
            </div>
          )}
        </div>

        {graficosComparativos.length > 0 && (
          <section className="rounded-2xl border border-[#E2E8E5] bg-white p-5 mb-5">
            <h2 className="text-base font-bold text-[var(--pd-ink-900)] mb-3">Análise Comparativa</h2>
            <div className={`grid grid-cols-1 gap-4 ${graficosComparativos.length > 1 ? 'sm:grid-cols-2' : ''}`}>
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
                      <p className="text-[12px] text-gray-600 mt-2 px-1">
                        <strong className="text-[var(--pd-ink-800)]">{rotuloB}</strong> face a{' '}
                        <strong className="text-[var(--pd-ink-800)]">{rotuloA}</strong>:{' '}
                        {diferenca! > 0 ? '+' : ''}
                        {diferenca!.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} (
                        {percentual! > 0 ? '+' : ''}
                        {percentual!.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%)
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {graficosTemporais.length > 0 && (
          <section className="rounded-2xl border border-[#E2E8E5] bg-white p-5 mb-5">
            <h2 className="text-base font-bold text-[var(--pd-ink-900)] mb-3">Tendências e Evolução</h2>
            <div className={`grid grid-cols-1 gap-4 ${graficosTemporais.length > 1 ? 'sm:grid-cols-2' : ''}`}>
              {graficosTemporais.map((g: any) => (
                <AnaliseGrafico key={g.passo_id} grafico={g} />
              ))}
            </div>
          </section>
        )}

        {achados.length > 0 && (
          <section className="mb-5">
            <h2 className="text-base font-bold text-[var(--pd-ink-900)] mb-3">
              O que não perguntou mas devia saber
            </h2>
            <div
              className={`grid grid-cols-1 gap-3 ${
                Math.min(achados.length, 6) >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : Math.min(achados.length, 6) === 2 ? 'sm:grid-cols-2' : ''
              }`}
            >
              {achados.slice(0, 6).map((a: any, i: number) => (
                <div
                  key={i}
                  className="rounded-xl border border-[#E2E8E5] bg-white p-4"
                  style={{ borderLeft: `4px solid ${CORES_SEVERIDADE[a.severidade] || '#064E2C'}` }}
                >
                  <p className="text-[13px] font-bold text-[var(--pd-ink-900)] leading-snug">{a.titulo}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <QualidadeDados qualidade={qualidade} />

        <CodigoExecutado codigo={codigoExecutado} />

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

        <footer className="text-[12px] text-gray-500 border-t border-[#E2E8E5] pt-4">
          <p className="mb-1">
            <strong className="text-[var(--pd-ink-700)]">Fontes:</strong>{' '}
            {narrativa.fontes.map((f: any) => `${f.instituicao}${f.ano ? ` (${f.ano})` : ''}`).join('; ')}
          </p>
          <p>Produzido por dataportal.co.mz, o portal de dados oficial de Moçambique.</p>
        </footer>
      </div>
    </div>
  )
}
