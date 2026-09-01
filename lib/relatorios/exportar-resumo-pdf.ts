import { realcarTexto } from './realce'
import { construirTabelaDados } from './tabela-dados'
import { construirLinhaTempo } from './linha-tempo'
import { construirDestaques } from './destaques'
import { classificarAchado } from './classificar-achado'
import type { Digesto } from './digesto'
import type { ChartSpec } from '@/lib/ai-insights'

/**
 * O resumo de um relatório, como um PDF com a marca do portal.
 *
 * Existe porque um resumo só na página não sai de lá: quem o quer levar para uma reunião, ou
 * anexar a um email, precisa de um ficheiro. Gerado no browser com jsPDF (já dependência do
 * projecto, usada na exportação das análises), com o mesmo logótipo e as mesmas cores do portal:
 * um documento produzido pelo Data Portal tem de se identificar como tal à primeira vista, não
 * sair como texto genérico sem nome.
 *
 * O destaque de texto (páginas a verde, números a dourado) usa o MESMO `realcarTexto` que o ecrã
 * usa, e não uma cópia: são as mesmas regras, e nunca podem divergir sobre o que conta como uma
 * citação de página ou um ano. jsPDF não tem uma API de texto rico (não há `<span style="color">`
 * aqui) — cada troço colorido é desenhado palavra a palavra, com `setTextColor` antes de cada uma,
 * e o embrulho de linha feito à mão a partir da largura medida de cada palavra.
 *
 * Cliente-only: usa `document` para carregar o logótipo, por isso só corre no browser.
 */

type DigestoParaPdf = {
  o_que_e: { assunto: string; geografia: string; periodo: string; metodologia: string }
  resumo_curto: string
  resumo_medio: string
  achados: { texto: string; pagina: number; ano?: number | null }[]
  recomendacoes: { texto: string; responsavel: string | null; prazo: string | null; pagina: number }[]
  fontes: { instituicao: string; documento: string | null; ano: number | null }[]
  resultado?: { tipo: 'obtido' | 'esperado' | 'nao_aplicavel'; texto: string | null; pagina: number | null }
  afirmacoes_numericas?: Digesto['afirmacoes_numericas']
  glossario?: { termo: string; definicao: string; pagina: number }[]
  credibilidade?: { tipo_dado: 'primario' | 'secundario' | 'misto' | null; tamanho_amostra: string | null; observacoes: string | null }
}

// Exportadas (não só locais a este ficheiro): `exportar-onepager-pdf.ts` precisa exactamente da
// mesma paleta e do mesmo carregador de logótipo, e duplicá-los ali divergiria com o tempo.
export const VERDE_FLORESTA = '#0f3d2e'
// As mesmas três cores da página: verde para onde a afirmação se confirma (a citação de página),
// dourado para as quantidades, laranja para os rótulos "Sobre o quê / Onde / Quando".
export const VERDE_CONTEUDO = '#064e2c'
export const DOURADO = '#c7962c'
export const LARANJA = '#c2570b'
export const TINTA = '#1a2118'
export const TINTA_FAINT = '#5c6459'

/** Carrega uma imagem do próprio site como dataURL, para o jsPDF a poder desenhar. */
export function carregarImagemComoDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('sem contexto de canvas'))
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('falha ao carregar o logótipo'))
    img.src = src
  })
}

export type Token = { texto: string; cor: string; negrito: boolean }

/**
 * Parte um texto em palavras coloridas, a partir das mesmas regras do ecrã (`realcarTexto`).
 *
 * Uma citação de página ou um número NUNCA se separam a meio: ficam como um único token, mesmo
 * tendo espaços lá dentro ("p. 5, 7"), para nunca acontecerem partidos entre duas linhas do PDF.
 * Um trecho de texto normal parte-se em palavras (preservando os espaços como tokens próprios),
 * porque esses sim têm de poder quebrar onde a linha acabar.
 */
export function tokensDoTexto(texto: string, corBase: string): Token[] {
  const tokens: Token[] = []
  for (const seg of realcarTexto(texto)) {
    if (seg.tipo === 'texto') {
      for (const parte of seg.texto.split(/(\s+)/)) {
        if (parte.length > 0) tokens.push({ texto: parte, cor: corBase, negrito: false })
      }
    } else {
      tokens.push({ texto: seg.texto, cor: seg.tipo === 'pagina' ? VERDE_CONTEUDO : DOURADO, negrito: true })
    }
  }
  return tokens
}

// A mesma paleta usada em AIChartRenderer.tsx (SERIES_COLORS), para uma série com mais do que uma
// linha usar as mesmas cores no PDF que usaria no ecrã. `construirTabelaDados` só produz hoje um
// gráfico com uma série cada, mas a função de desenho aceita mais do que uma sem assumir isso.
const CORES_SERIE = ['#c7962c', '#064e2c', '#6B4FBB', '#1FA365', '#c2570b', '#8B5CF6']

export async function gerarPdfDoResumo(entrada: {
  titulo: string
  ano: string
  digesto: DigestoParaPdf
  /** Quando presente, o PDF vai buscar as províncias mencionadas (o mesmo endpoint do mapa no
   *  ecrã) e lista-as em texto: o PDF não desenha o mapa em si, mas a informação por trás dele
   *  não fica de fora só por o desenho não caber num documento estático. */
  reportId?: number
}): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF('p', 'mm', 'a4')
  const largura = doc.internal.pageSize.getWidth()
  const altura = doc.internal.pageSize.getHeight()
  const margem = 18
  const larguraUtil = largura - margem * 2
  let y = 0

  // Cabeçalho: faixa verde-floresta com o logótipo, para o documento se identificar como do
  // portal mesmo se for reencaminhado sem contexto nenhum à volta.
  doc.setFillColor(VERDE_FLORESTA)
  doc.rect(0, 0, largura, 28, 'F')
  try {
    const logo = await carregarImagemComoDataUrl('/images/logo.png')
    doc.addImage(logo, 'PNG', margem, 7, 14, 14)
  } catch {
    // Sem logótipo o cabeçalho continua a identificar o portal pelo texto: nunca vale a pena
    // falhar a geração do PDF inteiro por causa de uma imagem.
  }
  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('DATA PORTAL', margem + 19, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text('dataportal.co.mz · Resumo de relatório gerado pelo portal', margem + 19, 18.5)

  y = 40

  function novaLinha(altoNecessario: number) {
    if (y + altoNecessario > altura - 20) {
      doc.addPage()
      y = 20
    }
  }

  function paragrafo(texto: string, opcoes: { tamanho?: number; negrito?: boolean; cor?: string; espacoDepois?: number } = {}) {
    if (!texto) return
    doc.setFont('helvetica', opcoes.negrito ? 'bold' : 'normal')
    doc.setFontSize(opcoes.tamanho ?? 10.5)
    doc.setTextColor(opcoes.cor ?? TINTA)
    const linhas = doc.splitTextToSize(texto, larguraUtil)
    novaLinha(linhas.length * 5 + (opcoes.espacoDepois ?? 6))
    doc.text(linhas, margem, y)
    y += linhas.length * 5 + (opcoes.espacoDepois ?? 6)
  }

  /**
   * A versão colorida de `paragrafo`: desenha palavra a palavra, mudando de cor sempre que o token
   * o exige, e quebra a linha sozinha quando a próxima palavra já não cabe na largura útil.
   */
  function paragrafoRealcado(
    texto: string,
    opcoes: { tamanho?: number; corBase?: string; prefixo?: string; corPrefixo?: string; espacoDepois?: number } = {}
  ) {
    if (!texto) return
    const tamanho = opcoes.tamanho ?? 10.5
    const alturaLinha = tamanho / 2 + 0.7
    doc.setFontSize(tamanho)

    const tokens: Token[] = []
    if (opcoes.prefixo) {
      tokens.push({ texto: opcoes.prefixo, cor: opcoes.corPrefixo ?? opcoes.corBase ?? TINTA, negrito: true })
    }
    tokens.push(...tokensDoTexto(texto, opcoes.corBase ?? TINTA))

    novaLinha(alturaLinha)
    let x = margem
    for (const tok of tokens) {
      const soEspaco = /^\s+$/.test(tok.texto)
      doc.setFont('helvetica', tok.negrito ? 'bold' : 'normal')
      const largura = doc.getTextWidth(tok.texto)

      if (!soEspaco && x + largura > margem + larguraUtil) {
        x = margem
        y += alturaLinha
        novaLinha(alturaLinha)
      }
      if (soEspaco && x === margem) continue // uma linha nunca começa por um espaço em branco

      doc.setTextColor(tok.cor)
      doc.text(tok.texto, x, y)
      x += largura
    }
    y += alturaLinha + (opcoes.espacoDepois ?? 6)
  }

  function tituloSeccao(texto: string) {
    novaLinha(12)
    doc.setDrawColor(DOURADO)
    doc.setLineWidth(0.6)
    doc.line(margem, y, margem + 10, y)
    y += 5
    paragrafo(texto, { tamanho: 12, negrito: true, cor: VERDE_FLORESTA, espacoDepois: 4 })
  }

  /** O mesmo selo de página do ecrã (`.rpt-digesto-pagina`), como uma caixinha em vez de texto a
   *  negrito solto: reaproveita o mesmo verde e a mesma ideia de "destacar isto do resto da
   *  frase" que a UI já usa em achados, recomendações, resultado, linha do tempo e glossário. */
  function seloPagina(pagina: number, opcoes: { espacoDepois?: number } = {}) {
    const texto = `PÁGINA ${pagina}`
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    const larguraTexto = doc.getTextWidth(texto)
    const larguraCaixa = larguraTexto + 8
    const alturaCaixa = 6

    novaLinha(alturaCaixa + (opcoes.espacoDepois ?? 4))
    doc.setFillColor('#E9F5EC')
    doc.setDrawColor(VERDE_CONTEUDO)
    doc.setLineWidth(0.3)
    doc.roundedRect(margem, y - 4.3, larguraCaixa, alturaCaixa, 1.4, 1.4, 'FD')
    doc.setTextColor(VERDE_CONTEUDO)
    doc.text(texto, margem + 4, y)
    y += alturaCaixa - 1 + (opcoes.espacoDepois ?? 4)
  }

  /**
   * O mesmo gráfico de linha que `AIChartRenderer` desenha em SVG no ecrã, mas em traços vectoriais
   * do próprio jsPDF: não há DOM nem `recharts` disponíveis aqui (isto corre num módulo puro, sem
   * um componente montado), e rasterizar um gráfico à parte só para o converter em imagem seria
   * mais frágil do que desenhar directamente as poucas formas de que um gráfico de linha precisa
   * (eixo, pontos, segmentos, rótulos).
   */
  function formatarValor(v: number): string {
    return String(Math.round(v * 100) / 100)
  }

  function desenharGraficoLinha(spec: ChartSpec) {
    const alturaGrafico = 52
    const alturaTitulo = spec.title ? 6 : 0
    // +6 de folga no topo: é onde o número de cada ponto fica escrito, e sem esta folga o valor do
    // ponto mais alto saía cortado contra a borda do gráfico.
    novaLinha(alturaGrafico + alturaTitulo + 16)

    if (spec.title) {
      paragrafo(spec.title, { tamanho: 9.5, negrito: true, cor: VERDE_FLORESTA, espacoDepois: 2 })
    }

    const todosValores = spec.series.flatMap((s) => s.data)
    const minimo = Math.min(...todosValores)
    const maximo = Math.max(...todosValores)
    const amplitude = maximo - minimo || 1

    const xEsquerda = margem + 24 // espaço para os rótulos do eixo Y
    const xDireita = margem + larguraUtil
    const yTopo = y + 6 // folga para o número do ponto mais alto não colidir com o título
    const yBase = yTopo + alturaGrafico
    const larguraEixo = xDireita - xEsquerda

    // Grelha e eixo: um rectângulo claro, o mesmo tratamento visual da tabela de variáveis.
    doc.setDrawColor('#E2E8E5')
    doc.setLineWidth(0.2)
    doc.rect(xEsquerda, yTopo, larguraEixo, alturaGrafico)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(TINTA_FAINT)
    doc.text(formatarValor(maximo), xEsquerda - 2, yTopo + 3, { align: 'right' })
    doc.text(formatarValor(minimo), xEsquerda - 2, yBase, { align: 'right' })

    const nPontos = spec.labels.length
    const passoX = nPontos > 1 ? larguraEixo / (nPontos - 1) : 0

    spec.series.forEach((serie, indiceSerie) => {
      const cor = CORES_SERIE[indiceSerie % CORES_SERIE.length]
      doc.setDrawColor(cor)
      doc.setFillColor(cor)
      doc.setLineWidth(0.6)

      const pontos = serie.data.map((valor, i) => ({
        x: xEsquerda + i * passoX,
        y: yBase - ((valor - minimo) / amplitude) * alturaGrafico,
      }))

      for (let i = 1; i < pontos.length; i++) {
        doc.line(pontos[i - 1].x, pontos[i - 1].y, pontos[i].x, pontos[i].y)
      }
      for (const p of pontos) doc.circle(p.x, p.y, 1, 'F')

      // O número de cada ponto, não só a posição no eixo: era a falha exacta que fazia o gráfico
      // "não dizer nada" no PDF (a forma sem o valor real por trás dela).
      doc.setFontSize(6.5)
      doc.setTextColor(cor)
      doc.setFont('helvetica', 'bold')
      serie.data.forEach((valor, i) => {
        doc.text(formatarValor(valor), pontos[i].x, pontos[i].y - 2.5, { align: 'center' })
      })
    })

    // Rótulos do eixo X: um por ponto, tal como no ecrã, num tamanho pequeno o suficiente para
    // caberem todos mesmo com vários pontos.
    doc.setFontSize(7)
    doc.setTextColor(TINTA_FAINT)
    spec.labels.forEach((rotulo, i) => {
      doc.text(rotulo, xEsquerda + i * passoX, yBase + 5, { align: 'center' })
    })

    // Legenda: só quando há mais do que uma série, senão o título já diz o que é a linha.
    if (spec.series.length > 1) {
      let xLegenda = xEsquerda
      const yLegenda = yBase + 11
      for (let i = 0; i < spec.series.length; i++) {
        const cor = CORES_SERIE[i % CORES_SERIE.length]
        doc.setFillColor(cor)
        doc.circle(xLegenda, yLegenda - 1, 1, 'F')
        doc.setFontSize(7)
        doc.setTextColor(TINTA_FAINT)
        doc.text(spec.series[i].name, xLegenda + 2.5, yLegenda)
        xLegenda += doc.getTextWidth(spec.series[i].name) + 12
      }
      y = yLegenda + 6
    } else {
      y = yBase + 12
    }
  }

  /**
   * O par do gráfico de linha, para quando os pontos não formam uma trajectória com sentido
   * (duas geografias, ou só dois anos sem mais nada a ligar): barras lêem-se como valores
   * individuais, uma linha lê-se como uma evolução contínua entre eles, e nem sempre é isso que os
   * dados dizem. `construirTabelaDados` decide qual dos dois faz sentido para cada série.
   */
  function desenharGraficoBarras(spec: ChartSpec) {
    const alturaGrafico = 52
    const alturaTitulo = spec.title ? 6 : 0
    novaLinha(alturaGrafico + alturaTitulo + 16)

    if (spec.title) {
      paragrafo(spec.title, { tamanho: 9.5, negrito: true, cor: VERDE_FLORESTA, espacoDepois: 2 })
    }

    const todosValores = spec.series.flatMap((s) => s.data)
    const minimo = Math.min(0, ...todosValores) // as barras partem sempre de zero, nunca do mínimo
    const maximo = Math.max(...todosValores)
    const amplitude = maximo - minimo || 1

    const xEsquerda = margem + 24
    const xDireita = margem + larguraUtil
    const yTopo = y + 6
    const yBase = yTopo + alturaGrafico
    const larguraEixo = xDireita - xEsquerda

    doc.setDrawColor('#E2E8E5')
    doc.setLineWidth(0.2)
    doc.rect(xEsquerda, yTopo, larguraEixo, alturaGrafico)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(TINTA_FAINT)
    doc.text(formatarValor(maximo), xEsquerda - 2, yTopo + 3, { align: 'right' })
    doc.text(formatarValor(minimo), xEsquerda - 2, yBase, { align: 'right' })

    const nGrupos = spec.labels.length
    const nSeries = spec.series.length
    const larguraGrupo = larguraEixo / nGrupos
    const larguraBarra = (larguraGrupo * 0.6) / nSeries

    spec.labels.forEach((rotulo, indiceGrupo) => {
      const xGrupo = xEsquerda + indiceGrupo * larguraGrupo + larguraGrupo / 2

      spec.series.forEach((serie, indiceSerie) => {
        const valor = serie.data[indiceGrupo]
        const alturaBarra = ((valor - minimo) / amplitude) * alturaGrafico
        const xBarra = xGrupo - (larguraBarra * nSeries) / 2 + indiceSerie * larguraBarra
        const cor = CORES_SERIE[indiceSerie % CORES_SERIE.length]

        doc.setFillColor(cor)
        doc.rect(xBarra, yBase - alturaBarra, larguraBarra, alturaBarra, 'F')

        doc.setFontSize(6.5)
        doc.setTextColor(cor)
        doc.setFont('helvetica', 'bold')
        doc.text(formatarValor(valor), xBarra + larguraBarra / 2, yBase - alturaBarra - 2, { align: 'center' })
      })

      doc.setFontSize(7)
      doc.setTextColor(TINTA_FAINT)
      doc.setFont('helvetica', 'normal')
      doc.text(rotulo, xGrupo, yBase + 5, { align: 'center' })
    })

    if (spec.series.length > 1) {
      let xLegenda = xEsquerda
      const yLegenda = yBase + 11
      for (let i = 0; i < spec.series.length; i++) {
        const cor = CORES_SERIE[i % CORES_SERIE.length]
        doc.setFillColor(cor)
        doc.rect(xLegenda, yLegenda - 2.5, 2.5, 2.5, 'F')
        doc.setFontSize(7)
        doc.setTextColor(TINTA_FAINT)
        doc.text(spec.series[i].name, xLegenda + 4, yLegenda)
        xLegenda += doc.getTextWidth(spec.series[i].name) + 14
      }
      y = yLegenda + 6
    } else {
      y = yBase + 12
    }
  }

  function desenharGrafico(spec: ChartSpec) {
    if (spec.type === 'bar') desenharGraficoBarras(spec)
    else desenharGraficoLinha(spec)
  }

  paragrafo(entrada.titulo, { tamanho: 16, negrito: true, cor: VERDE_FLORESTA, espacoDepois: 3 })
  paragrafo(entrada.ano, { tamanho: 9, cor: TINTA_FAINT, espacoDepois: 8 })

  const {
    o_que_e,
    resumo_curto,
    resumo_medio,
    achados,
    recomendacoes,
    fontes,
    resultado,
    afirmacoes_numericas,
    glossario,
    credibilidade,
  } = entrada.digesto

  // Calculado aqui em cima (não só lá em baixo, onde a tabela/gráficos precisam dele) porque o
  // cartão de destaques, logo a seguir ao título, também é construído a partir dele.
  const tabelaDados = construirTabelaDados(afirmacoes_numericas ?? [])

  // O mesmo cartão de números do ecrã (`destaques.ts`), desenhado como caixas lado a lado: a
  // primeira coisa a aparecer no PDF depois do título, antes de qualquer parágrafo de contexto.
  function desenharDestaques() {
    const itens = construirDestaques(
      {
        resultado: resultado ?? { tipo: 'nao_aplicavel', texto: null, pagina: null },
        o_que_e,
        fontes,
        achados: achados.map((a) => ({ ...a, ano: a.ano ?? null })),
      },
      tabelaDados
    )
    if (itens.length === 0) return

    const alturaCaixa = 22
    novaLinha(alturaCaixa + 8)
    const gap = 4
    const larguraCaixa = (larguraUtil - gap * (itens.length - 1)) / itens.length

    itens.forEach((item, i) => {
      const x = margem + i * (larguraCaixa + gap)
      doc.setFillColor('#E9F5EC')
      doc.setDrawColor(VERDE_CONTEUDO)
      doc.setLineWidth(0.3)
      doc.roundedRect(x, y, larguraCaixa, alturaCaixa, 2, 2, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(VERDE_CONTEUDO)
      const linhasValor = doc.splitTextToSize(item.valor, larguraCaixa - 6)
      doc.text(linhasValor.slice(0, 1), x + larguraCaixa / 2, y + 10, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(TINTA_FAINT)
      const linhasRotulo = doc.splitTextToSize(item.rotulo.toUpperCase(), larguraCaixa - 6)
      doc.text(linhasRotulo.slice(0, 2), x + larguraCaixa / 2, y + 15, { align: 'center' })
    })

    y += alturaCaixa + 10
  }

  // As mesmas duas cores do ecrã para este bloco: rótulo em laranja, conteúdo em verde. O rótulo
  // fica numa linha maiúscula e curta antes do conteúdo, tal como no ecrã (bloco em cima, texto a
  // seguir), em vez de os misturar numa só linha corrida.
  function campoContexto(rotulo: string, conteudo: string) {
    paragrafo(rotulo.toUpperCase(), { tamanho: 8, negrito: true, cor: LARANJA, espacoDepois: 1 })
    paragrafoRealcado(conteudo, { tamanho: 9.5, corBase: VERDE_CONTEUDO, espacoDepois: 4 })
  }

  desenharDestaques()
  campoContexto('Sobre o quê', o_que_e.assunto)
  campoContexto('Onde', o_que_e.geografia)
  campoContexto('Quando', o_que_e.periodo)
  y += 4

  // O mapa do ecrã não sai daqui: é um Leaflet com peças (tiles do OpenStreetMap) que não dão
  // permissão de origem cruzada para serem lidas de volta como imagem (o mesmo obstáculo que a
  // exportação de análises resolveu com uma camada de código só para isso, em
  // `DashboardApresentacao.tsx`). O que interessa de facto (que províncias o relatório menciona)
  // sai como uma secção de texto própria, com o mesmo título do ecrã, em vez de tentar arriscar
  // uma imagem que pode sair em branco.
  if (entrada.reportId != null) {
    try {
      const r = await fetch(`/api/reports/${entrada.reportId}/geografia`)
      const d = await r.json()
      const unidades: { nome: string; mencoes: number }[] = d?.unidades ?? []
      if (unidades.length > 0) {
        tituloSeccao('Onde este relatório se passa')
        paragrafo(
          unidades.map((u) => u.nome).join(', ') + '.',
          { tamanho: 9.5, cor: VERDE_CONTEUDO, espacoDepois: 6 }
        )
      }
    } catch {
      // O resto do PDF não depende disto: sem resposta do endpoint, a ficha sai sem esta secção
      // em vez de falhar a geração toda por causa de uma parte acessória.
    }
  }

  tituloSeccao('Resumo')
  paragrafoRealcado(resumo_curto, { espacoDepois: 4 })
  paragrafoRealcado(resumo_medio, { espacoDepois: 6 })

  if (resultado && resultado.tipo !== 'nao_aplicavel' && resultado.texto) {
    tituloSeccao(resultado.tipo === 'obtido' ? 'Resultado obtido' : 'O que se espera')
    paragrafoRealcado(resultado.texto, { espacoDepois: 1 })
    if (resultado.pagina != null) seloPagina(resultado.pagina)
  }

  if (credibilidade && (credibilidade.tipo_dado || credibilidade.tamanho_amostra || credibilidade.observacoes)) {
    tituloSeccao('Credibilidade metodológica')
    const selo =
      credibilidade.tipo_dado === 'primario'
        ? 'Dado primário'
        : credibilidade.tipo_dado === 'secundario'
          ? 'Dado secundário'
          : credibilidade.tipo_dado === 'misto'
            ? 'Dados primários e secundários'
            : null
    if (selo) paragrafo(selo.toUpperCase(), { tamanho: 8, negrito: true, cor: VERDE_CONTEUDO, espacoDepois: 2 })
    if (credibilidade.tamanho_amostra) {
      paragrafoRealcado(`Amostra: ${credibilidade.tamanho_amostra}.`, { tamanho: 9.5, espacoDepois: 2 })
    }
    if (credibilidade.observacoes) {
      paragrafoRealcado(credibilidade.observacoes, { tamanho: 9.5, espacoDepois: 6 })
    }
  }

  if (achados.length > 0) {
    tituloSeccao('O que o relatório encontrou')
    for (const a of achados) {
      // A mesma distinção visual do ecrã: um achado sobre uma queda não tem o mesmo aspecto que um
      // sobre um ganho. Classificação por palavra-chave, por isso "neutro" continua a ser o
      // resultado mais comum, e está certo ficar discreto nesse caso. Um círculo desenhado, não um
      // glifo de texto: os símbolos de seta/triângulo não existem na codificação WinAnsi das fontes
      // standard do jsPDF, e sairiam em branco ou trocados por outro carácter.
      const tipo = classificarAchado(a.texto)
      const corMarca = tipo === 'risco' ? '#B91C1C' : tipo === 'oportunidade' ? VERDE_CONTEUDO : TINTA_FAINT
      novaLinha(5)
      // O círculo fica na margem da página, à esquerda do texto, não em cima dele: uma tentativa
      // anterior usava espaços como prefixo para abrir espaço ao círculo, mas `paragrafoRealcado`
      // descarta um token só de espaços no início de uma linha (a regra que evita uma linha
      // começar por um espaço em branco), e a primeira letra do parágrafo saía desenhada por baixo
      // do círculo.
      doc.setFillColor(corMarca)
      doc.circle(margem - 3, y - 1.3, 1.2, 'F')
      paragrafoRealcado(a.texto, { espacoDepois: 1 })
      seloPagina(a.pagina)
    }
  }

  if (recomendacoes.length > 0) {
    tituloSeccao('O que o relatório recomenda')
    for (const r of recomendacoes) {
      paragrafoRealcado(r.texto, { prefixo: '•  ', espacoDepois: 1 })
      const extra = [r.responsavel ? `Responsável: ${r.responsavel}` : '', r.prazo ? `Prazo: ${r.prazo}` : '']
        .filter(Boolean)
        .join(' · ')
      if (extra) paragrafo(extra, { tamanho: 8.5, cor: TINTA_FAINT, espacoDepois: 1 })
      seloPagina(r.pagina)
    }
  }

  if (fontes.length > 0) {
    tituloSeccao('Fontes citadas')
    for (const f of fontes) {
      paragrafo(`•  ${f.instituicao}${f.documento ? `, ${f.documento}` : ''}${f.ano ? ` (${f.ano})` : ''}`, { espacoDepois: 3 })
    }
  }

  // O que sai aqui é o mesmo que a página mostra em "Tudo": a tabela de variáveis (mesmas colunas)
  // e um gráfico por cada série com pontos suficientes para desenhar uma tendência.
  const { variaveis, graficos } = tabelaDados
  if (variaveis.length > 0) {
    tituloSeccao('Variáveis e dados usados neste relatório')
    autoTable(doc, {
      startY: y,
      margin: { left: margem, right: margem },
      head: [['Variável', 'Geografia', 'Unidade', 'Período', 'Valor recente', 'Pontos', 'Página']],
      body: variaveis.map((v) => [
        v.tema,
        v.geografia,
        v.unidade || 'n/d',
        v.periodo ?? 'n/d',
        formatarValor(v.ultimoValor),
        String(v.nPontos),
        v.paginas.join(', '),
      ]),
      theme: 'grid',
      styles: { fontSize: 8.5, textColor: TINTA },
      headStyles: { fillColor: VERDE_FLORESTA, textColor: '#ffffff', fontSize: 8 },
      alternateRowStyles: { fillColor: '#F7FAF8' },
    })
    y = (doc as any).lastAutoTable.finalY + 12
  }

  if (graficos.length > 0) {
    tituloSeccao('Em gráfico')
    for (const grafico of graficos) desenharGrafico(grafico)
  }

  const linhaTempo = construirLinhaTempo({ achados: achados.map((a) => ({ ...a, ano: a.ano ?? null })), afirmacoes_numericas: afirmacoes_numericas ?? [] })
  if (linhaTempo.length > 0) {
    tituloSeccao('Linha do tempo')
    for (const evento of linhaTempo) {
      // O ano na sua própria linha, colorido consoante a origem (achado ou dado), em vez de metido
      // como prefixo dentro do texto destacado: o mesmo padrão simples que já usa em achados e
      // recomendações, e que se sabe que funciona.
      paragrafo(String(evento.ano), {
        tamanho: 9,
        negrito: true,
        cor: evento.tipo === 'achado' ? VERDE_FLORESTA : DOURADO,
        espacoDepois: 1,
      })
      paragrafoRealcado(evento.texto, { espacoDepois: 1 })
      seloPagina(evento.pagina)
    }
  }

  if (glossario && glossario.length > 0) {
    tituloSeccao('Glossário')
    for (const g of glossario) {
      paragrafo(g.termo, { tamanho: 9.5, negrito: true, cor: VERDE_FLORESTA, espacoDepois: 1 })
      paragrafoRealcado(g.definicao, { tamanho: 9, espacoDepois: 1 })
      seloPagina(g.pagina)
    }
  }

  // Rodapé em todas as páginas: quem recebe o PDF isolado, sem o email nem o link que o trouxe,
  // continua a saber de onde veio e que não é a íntegra do relatório.
  const totalPaginas = doc.getNumberOfPages()
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(TINTA_FAINT)
    doc.text(
      'Resumo gerado automaticamente pelo Data Portal a partir do documento original. Não substitui a leitura do relatório completo.',
      margem,
      altura - 12,
      { maxWidth: larguraUtil }
    )
    doc.text(`${p} / ${totalPaginas}`, largura - margem, altura - 12, { align: 'right' })
  }

  // Sem a flag "u" nem \p{}: o alvo de compilação do projecto é anterior ao que as suportaria.
  // Um nome de ficheiro só precisa de evitar caracteres problemáticos no sistema de ficheiros, não
  // de reconhecer todo o unicode — trocar tudo o que não for letra/número comum por um traço chega.
  const nomeFicheiro = `resumo-${entrada.titulo
    .slice(0, 60)
    .replace(/[^a-zA-Z0-9À-ÿ]+/g, '-')
    .toLowerCase()}.pdf`
  doc.save(nomeFicheiro)
}
