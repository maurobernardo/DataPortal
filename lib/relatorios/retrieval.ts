/**
 * Que páginas de um relatório mostrar ao modelo para responder a uma pergunta.
 *
 * Não há base vectorial neste portal, e construir uma para um catálogo de uma dúzia de relatórios
 * seria infra-estrutura a mais para o problema que existe. Uma pontuação lexical, por sobreposição
 * de palavras com peso, é suficiente para "em que páginas é que isto é discutido" e é auditável:
 * dá para ver exactamente porque uma página foi escolhida.
 *
 * O ponto onde isto pode falhar em silêncio é óbvio: uma pergunta cujas palavras não aparecem no
 * documento (sinónimos, outra língua) não encontra nada e a resposta correcta é "não encontrei",
 * nunca as primeiras páginas ao acaso.
 */

const VAZIAS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem',
  'que', 'qual', 'quais', 'quantos', 'quantas', 'onde', 'como', 'sobre', 'entre', 'cada', 'este',
  'esta', 'estes', 'estas', 'esse', 'essa', 'e', 'ou', 'a', 'o', 'as', 'os', 'um', 'uma', 'ao',
  'the', 'is', 'are', 'of', 'in', 'on', 'to', 'and', 'or',
])

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function termos(texto: string): string[] {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !VAZIAS.has(t))
}

export type PaginaPontuada = { pagina: number; pontuacao: number }

/**
 * Pontua cada página pela sobreposição de termos com a pergunta, ponderada pela raridade do termo
 * (TF simples, IDF simples): um termo que aparece em todas as páginas ("relatório", "moçambique")
 * não distingue nada; um termo raro que só aparece numa página é um sinal forte.
 */
export function pontuarPaginas(pergunta: string, paginas: { pagina: number; texto: string }[]): PaginaPontuada[] {
  const termosQuery = new Set(termos(pergunta))
  if (termosQuery.size === 0 || paginas.length === 0) return []

  const contagensPorPagina = paginas.map((p) => {
    const contagem = new Map<string, number>()
    for (const t of termos(p.texto)) contagem.set(t, (contagem.get(t) || 0) + 1)
    return { pagina: p.pagina, contagem }
  })

  const nPaginasComTermo = new Map<string, number>()
  for (const termo of Array.from(termosQuery)) {
    let n = 0
    for (const { contagem } of contagensPorPagina) if (contagem.has(termo)) n++
    nPaginasComTermo.set(termo, n)
  }

  return contagensPorPagina
    .map(({ pagina, contagem }) => {
      let pontuacao = 0
      for (const termo of Array.from(termosQuery)) {
        const tf = contagem.get(termo) || 0
        if (tf === 0) continue
        const df = nPaginasComTermo.get(termo) || 1
        const idf = Math.log(1 + paginas.length / df)
        pontuacao += tf * idf
      }
      return { pagina, pontuacao }
    })
    .filter((p) => p.pontuacao > 0)
    .sort((a, b) => b.pontuacao - a.pontuacao)
}

const PADRAO_RESUMO_EXECUTIVO = /\b(executive summary|resumo executivo|sum[aá]rio executivo)\b/i

/** As páginas mais relevantes, até `limite`. Vazio quando nenhuma página tem termo em comum. */
export function seleccionarPaginas(
  pergunta: string,
  paginas: { pagina: number; texto: string }[],
  limite = 6
): { pagina: number; texto: string }[] {
  const pontuadas = pontuarPaginas(pergunta, paginas)
  if (pontuadas.length === 0) return []

  const porNumero = new Map(paginas.map((p) => [p.pagina, p.texto]))
  const escolhidas = new Map(pontuadas.slice(0, limite).map((p) => [p.pagina, true]))

  // Um relatório bilingue pode ter a resposta certa só na versão em inglês (ex.: "Executive
  // Summary"), com palavras que não batem nenhuma com uma pergunta em português — a pontuação
  // lexical não tem como as encontrar. Como o resumo executivo é sempre a página mais densa em
  // conteúdo relevante do documento inteiro, incluí-la sempre (mesmo com pontuação baixa ou nula)
  // é mais barato do que traduzir a pergunta, e resolve exactamente este caso.
  if (escolhidas.size < limite + 2) {
    for (const p of paginas) {
      if (escolhidas.size >= limite + 2) break
      if (!escolhidas.has(p.pagina) && PADRAO_RESUMO_EXECUTIVO.test(p.texto)) {
        escolhidas.set(p.pagina, true)
      }
    }
  }

  return Array.from(escolhidas.keys())
    .map((pagina) => ({ pagina, texto: porNumero.get(pagina) || '' }))
    .sort((a, b) => a.pagina - b.pagina)
}
