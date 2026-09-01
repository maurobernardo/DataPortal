/**
 * Realça, dentro de um texto em prosa, o que mais ajuda a ler depressa: onde no documento uma
 * afirmação se confirma, quando é que algo aconteceu, e as quantidades que dão corpo ao achado.
 *
 * Um resumo tem de se poder VARRER com os olhos, não só ler de fio a pavio. Três categorias, com
 * as duas cores fixas do sistema (nunca inventadas): a citação de página, porque é o que permite
 * confirmar qualquer afirmação no PDF original, em verde (a cor de "está confirmado" no resto do
 * portal); e o ano e as quantidades com unidade (percentagens, áreas, contagens), porque são os
 * números que uma pessoa procura ao correr o olho por um parágrafo, em dourado (a cor de destaque
 * do sistema). Não há uma terceira cor: mais cores dividiriam a atenção em vez de a dirigirem.
 *
 * Cliente-only, sem imports de servidor: chamado ao desenhar o texto, não ao gerar o digesto.
 */

export type Segmento = { texto: string; tipo: 'texto' | 'pagina' | 'numero' }

/**
 * Uma citação de página, nas formas em que o digesto as escreve: "(p. 6)", "(p. 5, 7)", "p. 42",
 * "páginas 10-12". O parêntesis é opcional de propósito — o texto corrido às vezes cita a página a
 * meio da frase, sem parêntesis nenhum.
 */
const PADRAO_PAGINA = /\(?\bp(?:á?g(?:ina)?s?)?\.?\s*\d+(?:\s*[-,e]\s*\d+)*\)?/gi

/** Um ano plausível para um relatório sobre Moçambique: só o suficiente para excluir códigos e
 *  contagens que por acaso têm quatro dígitos. */
const PADRAO_ANO = /\b(19[5-9]\d|20[0-6]\d)\b/g

/**
 * Uma quantidade com unidade: percentagem, área, dinheiro ou uma contagem redonda com milhar. O
 * número TEM de vir com a unidade colada (ou o separador de milhar português, "5 236"): um número
 * solto ("3 workshops") não se distingue de qualquer outra palavra e marcá-lo tornaria o texto
 * inteiro sublinhado, que é o oposto de destacar.
 */
// Sem "\b" a fechar: depois de "%" ou "²" (nenhum dos dois é um "carácter de palavra") o "\b" do
// regex nunca encontra fronteira nenhuma para casar, e o padrão inteiro falhava em silêncio -
// apanhado pelos testes, não por inspecção do resultado.
const PADRAO_QUANTIDADE = /\d[\d.,]*\s?(?:%|km²|km2|ha\b|kg\b|ton(?:eladas)?\b|mzn\b|usd\b|mt\b)/gi

export function realcarTexto(texto: string): Segmento[] {
  if (!texto) return []

  // Duas passagens: primeiro isola as páginas (que têm a forma mais específica e mais fácil de
  // confundir com outra coisa), depois procura anos só dentro do que sobrou como texto simples —
  // nunca dentro de um trecho já marcado como página, para "página 2018" nunca contar como os dois.
  const comPaginas: Segmento[] = []
  let ultimo = 0
  for (const m of Array.from(texto.matchAll(PADRAO_PAGINA))) {
    const inicio = m.index ?? 0
    if (inicio > ultimo) comPaginas.push({ texto: texto.slice(ultimo, inicio), tipo: 'texto' })
    comPaginas.push({ texto: m[0], tipo: 'pagina' })
    ultimo = inicio + m[0].length
  }
  if (ultimo < texto.length) comPaginas.push({ texto: texto.slice(ultimo), tipo: 'texto' })

  // Anos e quantidades partilham a mesma cor (dourado), por isso partilham a mesma passagem: um
  // padrão combinado evita que um deles marque um trecho que o outro já tinha marcado por cima.
  const PADRAO_DESTAQUE = new RegExp(`${PADRAO_ANO.source}|${PADRAO_QUANTIDADE.source}`, 'gi')

  const final: Segmento[] = []
  for (const seg of comPaginas) {
    if (seg.tipo !== 'texto') {
      final.push(seg)
      continue
    }
    let u2 = 0
    for (const m of Array.from(seg.texto.matchAll(PADRAO_DESTAQUE))) {
      const inicio = m.index ?? 0
      if (inicio > u2) final.push({ texto: seg.texto.slice(u2, inicio), tipo: 'texto' })
      final.push({ texto: m[0], tipo: 'numero' })
      u2 = inicio + m[0].length
    }
    if (u2 < seg.texto.length) final.push({ texto: seg.texto.slice(u2), tipo: 'texto' })
  }

  return final.filter((s) => s.texto.length > 0)
}
