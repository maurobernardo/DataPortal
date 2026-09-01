/**
 * Extracção de texto de um PDF, página a página.
 *
 * A âncora de página é a disciplina que torna o resto do módulo de relatórios honesto: sem ela, um
 * digesto podia citar "a cobertura foi de 62%" sem ninguém conseguir confirmar onde é que o
 * documento diz isso. É o equivalente, para um relatório, do `{{calc:id}}` que o motor de análise
 * exige de qualquer número.
 *
 * `pdf-parse` só devolve o texto do documento inteiro concatenado; a extracção por página usa o
 * seu parâmetro `pagerender`, chamado uma vez por página na ordem do documento, para capturar cada
 * página separadamente à medida que é lida.
 */

export type PaginaExtraida = { pagina: number; texto: string }

export type ResultadoExtraccao = {
  paginas: PaginaExtraida[]
  totalPaginas: number
  /** Ver `ehDigitalizado`: quando true, o PDF provavelmente não tem camada de texto (digitalização
   *  sem OCR) e o resto do módulo não tem nada para ler. */
  digitalizado: boolean
}

/**
 * Um PDF digitalizado sem OCR abre normalmente, tem páginas, e não tem uma palavra de texto: cada
 * página é uma imagem. Processá-lo em silêncio produziria um digesto vazio com aspecto de sucesso.
 *
 * O limiar é por CARACTERES POR PÁGINA, não por presença de texto: um relatório real tem páginas de
 * capa, de rosto e de índice quase vazias, e contar essas contra o documento inteiro classificaria
 * relatórios normais como digitalizados. O que interessa é se a MAIORIA das páginas tem prosa a
 * sério.
 */
const MIN_CARACTERES_PAGINA_COM_TEXTO = 40
const FRACCAO_MINIMA_PAGINAS_COM_TEXTO = 0.3

export function ehDigitalizado(paginas: PaginaExtraida[]): boolean {
  if (paginas.length === 0) return true
  const comTexto = paginas.filter((p) => p.texto.trim().length >= MIN_CARACTERES_PAGINA_COM_TEXTO).length
  return comTexto / paginas.length < FRACCAO_MINIMA_PAGINAS_COM_TEXTO
}

export async function extrairPaginas(bufferPdf: Buffer): Promise<ResultadoExtraccao> {
  // Importado do módulo INTERNO (`lib/pdf-parse.js`), não da raiz do pacote: o `index.js` da raiz
  // tem `isDebugMode = !module.parent` e, se essa condição for verdadeira sob o carregador de
  // módulos usado aqui, corre um teste embutido que tenta ler um PDF de exemplo do próprio pacote
  // e rebenta com "ENOENT" antes de a função sequer ser chamada. É um efeito colateral conhecido do
  // pacote, apanhado ao correr este módulo pela primeira vez.
  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default as any

  const paginas: PaginaExtraida[] = []
  let contador = 0

  await pdfParse(bufferPdf, {
    pagerender: async (pageData: any) => {
      contador += 1
      const conteudo = await pageData.getTextContent({ normalizeWhitespace: true })
      let texto = ''
      let ultimoY: number | null = null
      for (const item of conteudo.items as any[]) {
        const y = item.transform?.[5]
        if (ultimoY !== null && y !== ultimoY) texto += '\n'
        texto += item.str
        ultimoY = y
      }
      paginas.push({ pagina: contador, texto: texto.trim() })
      return texto
    },
  })

  return {
    paginas,
    totalPaginas: paginas.length,
    digitalizado: ehDigitalizado(paginas),
  }
}
