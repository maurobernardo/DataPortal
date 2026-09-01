import {
  carregarImagemComoDataUrl,
  DOURADO,
  LARANJA,
  TINTA,
  TINTA_FAINT,
  tokensDoTexto,
  VERDE_CONTEUDO,
  VERDE_FLORESTA,
} from './exportar-resumo-pdf'

/**
 * A ficha de uma página de um relatório: a versão "reencaminhar num WhatsApp", não o resumo
 * completo. `gerarPdfDoResumo` (exportar-resumo-pdf.ts) pagina livremente porque o resumo completo
 * pode ter tabela, gráficos e todas as recomendações; esta ficha promete UMA página só, por isso
 * em vez de paginar quando o conteúdo não cabe, ela pára de acrescentar (corta achados a mais, uma
 * ficha cheia sem cortar o texto a meio é melhor do que arriscar uma segunda página).
 */

type DigestoParaOnePager = {
  o_que_e: { assunto: string; geografia: string; periodo: string }
  resumo_curto: string
  achados: { texto: string; pagina: number }[]
  resultado?: { tipo: 'obtido' | 'esperado' | 'nao_aplicavel'; texto: string | null; pagina: number | null }
}

export async function gerarOnePagerPdf(entrada: {
  titulo: string
  ano: string
  digesto: DigestoParaOnePager
}): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF('p', 'mm', 'a4')
  const largura = doc.internal.pageSize.getWidth()
  const altura = doc.internal.pageSize.getHeight()
  const margem = 18
  const larguraUtil = largura - margem * 2
  const limiteInferior = altura - 16
  let y = 0
  let cortado = false

  doc.setFillColor(VERDE_FLORESTA)
  doc.rect(0, 0, largura, 24, 'F')
  try {
    const logo = await carregarImagemComoDataUrl('/images/logo.png')
    doc.addImage(logo, 'PNG', margem, 5, 12, 12)
  } catch {
    // Ver o mesmo comentário em exportar-resumo-pdf.ts: sem logótipo, o texto do cabeçalho chega.
  }
  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('DATA PORTAL · FICHA DE UMA PÁGINA', margem + 16, 12)

  y = 34

  /** Ao contrário de `novaLinha` no resumo completo, esta nunca cria página nova: quando o
   *  espaço acaba, marca `cortado` e quem chamar deve parar de acrescentar mais conteúdo. */
  function cabe(altoNecessario: number): boolean {
    if (y + altoNecessario > limiteInferior) {
      cortado = true
      return false
    }
    return true
  }

  function paragrafo(texto: string, opcoes: { tamanho?: number; negrito?: boolean; cor?: string; espacoDepois?: number } = {}) {
    if (!texto || cortado) return
    doc.setFont('helvetica', opcoes.negrito ? 'bold' : 'normal')
    doc.setFontSize(opcoes.tamanho ?? 10)
    doc.setTextColor(opcoes.cor ?? TINTA)
    const linhas = doc.splitTextToSize(texto, larguraUtil)
    const altoTotal = linhas.length * 4.6 + (opcoes.espacoDepois ?? 5)
    if (!cabe(altoTotal)) return
    doc.text(linhas, margem, y)
    y += altoTotal
  }

  function paragrafoRealcado(texto: string, opcoes: { tamanho?: number; corBase?: string; prefixo?: string; espacoDepois?: number } = {}) {
    if (!texto || cortado) return
    const tamanho = opcoes.tamanho ?? 10
    const alturaLinha = tamanho / 2 + 0.7
    doc.setFontSize(tamanho)

    const tokens = []
    if (opcoes.prefixo) tokens.push({ texto: opcoes.prefixo, cor: opcoes.corBase ?? TINTA, negrito: false })
    tokens.push(...tokensDoTexto(texto, opcoes.corBase ?? TINTA))

    // Uma estimativa simples de quantas linhas isto vai ocupar, só para decidir se cabe: conta
    // palavras a dividir pela largura útil a um ritmo aproximado (7 caracteres por cm a 10pt).
    const linhasEstimadas = Math.max(1, Math.ceil((texto.length / 7) / (larguraUtil / 10)))
    if (!cabe(linhasEstimadas * alturaLinha + (opcoes.espacoDepois ?? 5))) return

    let x = margem
    for (const tok of tokens) {
      const soEspaco = /^\s+$/.test(tok.texto)
      doc.setFont('helvetica', tok.negrito ? 'bold' : 'normal')
      const largura = doc.getTextWidth(tok.texto)
      if (!soEspaco && x + largura > margem + larguraUtil) {
        x = margem
        y += alturaLinha
      }
      if (soEspaco && x === margem) continue
      doc.setTextColor(tok.cor)
      doc.text(tok.texto, x, y)
      x += largura
    }
    y += alturaLinha + (opcoes.espacoDepois ?? 5)
  }

  paragrafo(entrada.titulo, { tamanho: 15, negrito: true, cor: VERDE_FLORESTA, espacoDepois: 2 })
  paragrafo(entrada.ano, { tamanho: 8.5, cor: TINTA_FAINT, espacoDepois: 6 })

  const { o_que_e, resumo_curto, achados, resultado } = entrada.digesto

  paragrafo(
    `${o_que_e.geografia}  ·  ${o_que_e.periodo}`.replace(/\s*·\s*$/, ''),
    { tamanho: 8.5, negrito: true, cor: LARANJA, espacoDepois: 5 }
  )

  paragrafoRealcado(resumo_curto, { tamanho: 10.5, espacoDepois: 6 })

  if (resultado && resultado.tipo !== 'nao_aplicavel' && resultado.texto) {
    doc.setDrawColor(resultado.tipo === 'obtido' ? VERDE_CONTEUDO : DOURADO)
    doc.setLineWidth(0.6)
    if (cabe(2)) {
      doc.line(margem, y, margem + 10, y)
      y += 4
    }
    paragrafo(resultado.tipo === 'obtido' ? 'RESULTADO OBTIDO' : 'O QUE SE ESPERA', {
      tamanho: 8,
      negrito: true,
      cor: resultado.tipo === 'obtido' ? VERDE_CONTEUDO : DOURADO,
      espacoDepois: 1,
    })
    paragrafoRealcado(resultado.texto, { tamanho: 9.5, espacoDepois: 6 })
  }

  if (achados.length > 0 && cabe(6)) {
    doc.setDrawColor(DOURADO)
    doc.setLineWidth(0.6)
    doc.line(margem, y, margem + 10, y)
    y += 4
    paragrafo('Principais achados', { tamanho: 10.5, negrito: true, cor: VERDE_FLORESTA, espacoDepois: 3 })
    for (const a of achados.slice(0, 3)) {
      if (cortado) break
      paragrafoRealcado(a.texto, { tamanho: 9.5, prefixo: '•  ', espacoDepois: 1 })
      paragrafo(`Página ${a.pagina}`, { tamanho: 8, cor: VERDE_CONTEUDO, negrito: true, espacoDepois: 4 })
    }
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(TINTA_FAINT)
  doc.text(
    'Ficha de uma página gerada automaticamente pelo Data Portal. Consulte o resumo completo do relatório no portal para mais detalhe.',
    margem,
    altura - 10,
    { maxWidth: larguraUtil }
  )

  const nomeFicheiro = `ficha-${entrada.titulo
    .slice(0, 60)
    .replace(/[^a-zA-Z0-9À-ÿ]+/g, '-')
    .toLowerCase()}.pdf`
  doc.save(nomeFicheiro)
}
