/**
 * Verifica uma afirmação numérica de um relatório contra os dados do próprio portal.
 *
 * Isto é o que separa "resumir o PDF" (uma mercadoria; qualquer chatbot faz isso) de algo que só
 * este portal pode oferecer: cruzar o que um relatório diz com 37 datasets que já têm ligação
 * geográfica verificada e proveniência auditável. É por isso a peça mais valiosa desta ronda, e é
 * também a mais perigosa. Se este módulo disser "o relatório está errado" e estiver ele próprio
 * errado, o dano à confiança no portal é maior do que o benefício de todas as outras
 * funcionalidades juntas.
 *
 * Por isso a regra que mais importa aqui, como em `comparar-corridas.ts`, é a que RECUSA comparar.
 * Geografias diferentes, unidades diferentes, períodos que não se sobrepõem: tudo isso declara-se
 * "não comparável" em vez de forçar uma comparação e produzir um veredicto que parece rigoroso e
 * não é. O vocabulário nunca acusa: mostra-se o valor do relatório e o valor do portal lado a
 * lado, e quem lê decide. Este módulo nunca escreve "o relatório está errado".
 */

export type TipoAfirmacao = 'nivel' | 'variacao'

export type AfirmacaoRelatorio = {
  texto: string
  tema: string
  geografia: string
  /** Ano único (nível) ou o par que define o intervalo (variação). Nulo quando o relatório não
   *  data a afirmação. */
  periodo_inicio: number | null
  periodo_fim: number | null
  valor: number
  unidade: string
  pagina: number
  tipo: TipoAfirmacao
}

export type ValorPortal = {
  /** Nome da unidade administrativa, ou 'nacional' para um total agregado ao país. */
  geografia: string
  /** Nulo para uma série sem dimensão temporal (ex.: um total do dataset inteiro). */
  periodo: number | null
  valor: number
  unidade: string
}

export type VeredictoAfirmacao =
  | { estado: 'nao_comparavel'; razao: string }
  | {
      estado: 'confirma' | 'diverge'
      valorPortal: number
      unidade: string
      diferencaAbsoluta: number
      /** Nulo quando o valor de referência é zero: a diferença relativa não existe. */
      diferencaRelativaPct: number | null
    }

/** Folga por omissão: 5% de diferença relativa ainda conta como confirmação, porque um relatório
 *  raramente cita um número com a mesma precisão exacta de um recálculo directo do dataset. */
export const TOLERANCIA_PADRAO = 0.05

export function normalizarTexto(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Duas geografias são a mesma unidade.
 *
 * Exige correspondência exacta OU sobreposição total de palavras ("Cidade de Maputo" contra
 * "Maputo Cidade"), nunca uma correspondência parcial: "Maputo" e "Maputo Cidade" são unidades
 * administrativas DIFERENTES (a província e a cidade), e um portal que as confundisse produziria
 * exactamente a comparação falsa que este módulo existe para evitar.
 */
export function mesmaGeografia(a: string, b: string): boolean {
  const na = normalizarTexto(a)
  const nb = normalizarTexto(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const setA = new Set(na.split(/\s+/).filter(Boolean))
  const setB = new Set(nb.split(/\s+/).filter(Boolean))
  if (setA.size === 0 || setB.size === 0) return false
  if (setA.size !== setB.size) return false
  for (const p of Array.from(setA)) if (!setB.has(p)) return false
  return true
}

/** Grupos de unidades equivalentes. Fora destes grupos, a comparação exige o mesmo texto
 *  normalizado: nunca se converte toneladas em quilogramas ou dólares em meticais por adivinha. */
const GRUPOS_UNIDADE: string[][] = [
  ['%', 'pct', 'percentagem', 'por cento'],
  ['pp', 'pontos percentuais', 'ponto percentual'],
  ['toneladas', 'ton', 'tonelada'],
  ['pessoas', 'habitantes', 'individuos'],
]

function grupoDaUnidade(u: string): number | null {
  const n = normalizarTexto(u)
  const i = GRUPOS_UNIDADE.findIndex((g) => g.includes(n))
  return i === -1 ? null : i
}

/**
 * Duas unidades são comparáveis directamente.
 *
 * Percentagem e pontos percentuais são o par que mais se confunde e NUNCA são a mesma coisa: uma
 * taxa que passa de 40% para 50% subiu 10 pontos percentuais e 25 por cento, ao mesmo tempo, e são
 * duas leituras diferentes do mesmo facto. Por isso ficam em grupos separados de propósito, mesmo
 * sendo ambas "percentagens" em linguagem corrente.
 */
export function mesmaUnidade(a: string, b: string): boolean {
  const na = normalizarTexto(a)
  const nb = normalizarTexto(b)
  if (na === nb) return true
  const ga = grupoDaUnidade(a)
  const gb = grupoDaUnidade(b)
  return ga !== null && ga === gb
}

function valoresDaGeografia(geografia: string, valores: ValorPortal[]): ValorPortal[] {
  return valores.filter((v) => mesmaGeografia(v.geografia, geografia))
}

function valorNoPeriodo(candidatos: ValorPortal[], periodo: number | null): ValorPortal | 'ambiguo' | null {
  if (periodo !== null) {
    const exacto = candidatos.filter((v) => v.periodo === periodo)
    return exacto.length === 1 ? exacto[0] : exacto.length > 1 ? 'ambiguo' : null
  }
  // Afirmação sem ano: só é resolúvel se houver exactamente UM valor para aquela geografia, ou se
  // todos os candidatos, apesar de anos diferentes, forem o MESMO valor (um total repetido em
  // várias linhas). Duas leituras diferentes sem forma de escolher entre elas é "não comparável",
  // não uma escolha arbitrária pela mais recente.
  if (candidatos.length === 0) return null
  const distintos = new Set(candidatos.map((v) => v.valor))
  return distintos.size === 1 ? candidatos[0] : 'ambiguo'
}

export function compararValores(
  valorRelatorio: number,
  valorPortal: number,
  unidade: string,
  tolerancia: number
): VeredictoAfirmacao {
  const diferencaAbsoluta = valorRelatorio - valorPortal
  const diferencaRelativaPct = valorPortal === 0 ? null : Math.abs(diferencaAbsoluta / valorPortal) * 100
  const dentroDaTolerancia =
    diferencaRelativaPct !== null ? diferencaRelativaPct / 100 <= tolerancia : diferencaAbsoluta === 0
  return {
    estado: dentroDaTolerancia ? 'confirma' : 'diverge',
    valorPortal,
    unidade,
    diferencaAbsoluta,
    diferencaRelativaPct,
  }
}

export function verificarAfirmacao(
  afirmacao: AfirmacaoRelatorio,
  valoresPortal: ValorPortal[],
  tolerancia: number = TOLERANCIA_PADRAO
): VeredictoAfirmacao {
  if (!Number.isFinite(afirmacao.valor)) {
    return { estado: 'nao_comparavel', razao: 'a afirmação não tem um valor numérico legível' }
  }

  const candidatos = valoresDaGeografia(afirmacao.geografia, valoresPortal)
  if (candidatos.length === 0) {
    return { estado: 'nao_comparavel', razao: `o portal não tem dados para "${afirmacao.geografia}"` }
  }

  if (afirmacao.tipo === 'nivel') {
    const comUnidade = candidatos.filter((v) => mesmaUnidade(v.unidade, afirmacao.unidade))
    if (comUnidade.length === 0) {
      const unidadesDisponiveis = Array.from(new Set(candidatos.map((v) => v.unidade))).join(', ')
      return {
        estado: 'nao_comparavel',
        razao: `o relatório usa "${afirmacao.unidade}" e o portal só tem "${unidadesDisponiveis}" para esta unidade: uma conversão entre as duas não é feita por adivinha`,
      }
    }
    const periodo = afirmacao.periodo_fim ?? afirmacao.periodo_inicio
    const encontrado = valorNoPeriodo(comUnidade, periodo)
    if (encontrado === null) {
      return {
        estado: 'nao_comparavel',
        razao: periodo !== null
          ? `o portal não tem um valor de ${periodo} para "${afirmacao.geografia}"`
          : `o relatório não data a afirmação e o portal tem vários valores para "${afirmacao.geografia}"`,
      }
    }
    if (encontrado === 'ambiguo') {
      return {
        estado: 'nao_comparavel',
        razao: `há mais do que um valor do portal para "${afirmacao.geografia}" nesse período, sem forma de escolher qual comparar`,
      }
    }
    return compararValores(afirmacao.valor, encontrado.valor, encontrado.unidade, tolerancia)
  }

  // tipo === 'variacao': precisa de DOIS valores da mesma geografia, um em cada extremo do
  // intervalo que a afirmação declara.
  if (afirmacao.periodo_inicio === null || afirmacao.periodo_fim === null) {
    return { estado: 'nao_comparavel', razao: 'uma variação exige dois períodos, e a afirmação só indica um' }
  }

  /*
   * A unidade da variação NÃO é a unidade da série de nível, e tratá-las como a mesma coisa foi um
   * erro apanhado pelos testes: "subiu 10 pontos percentuais" descreve uma série de nível em "%",
   * e `mesmaUnidade('pp', '%')` é falso por construção (são grupos diferentes de propósito). Três
   * casos, porque a forma da variação decide contra que unidade de nível ela é comparável:
   *
   * - pontos percentuais: só faz sentido como variação de uma série que já é uma percentagem.
   * - percentagem (variação relativa): adimensional, aplica-se a qualquer unidade de nível.
   * - qualquer outra unidade (variação absoluta, ex.: toneladas): tem de ser a MESMA unidade da
   *   série de nível, porque a diferença é calculada nessa unidade.
   */
  const grupoAfirmacao = grupoDaUnidade(afirmacao.unidade)
  const ehPontosPercentuais = grupoAfirmacao === 1
  const ehPercentualRelativa = grupoAfirmacao === 0
  const candidatosDeNivel = ehPontosPercentuais
    ? candidatos.filter((v) => grupoDaUnidade(v.unidade) === 0)
    : ehPercentualRelativa
      ? candidatos
      : candidatos.filter((v) => mesmaUnidade(v.unidade, afirmacao.unidade))

  if (candidatosDeNivel.length === 0) {
    return {
      estado: 'nao_comparavel',
      razao: ehPontosPercentuais
        ? `a afirmação é em pontos percentuais, e o portal não tem uma série em percentagem de "${afirmacao.geografia}" para comparar`
        : `o portal não tem uma série na unidade certa de "${afirmacao.geografia}" para comparar esta variação`,
    }
  }

  const inicio = valorNoPeriodo(candidatosDeNivel, afirmacao.periodo_inicio)
  const fim = valorNoPeriodo(candidatosDeNivel, afirmacao.periodo_fim)
  if (inicio === null || fim === null) {
    const emFalta = inicio === null ? afirmacao.periodo_inicio : afirmacao.periodo_fim
    return { estado: 'nao_comparavel', razao: `o portal não tem um valor de ${emFalta} para "${afirmacao.geografia}"` }
  }
  if (inicio === 'ambiguo' || fim === 'ambiguo') {
    return { estado: 'nao_comparavel', razao: `há mais do que um valor do portal num dos dois períodos, sem forma de escolher qual comparar` }
  }

  const variacaoPortal = ehPontosPercentuais
    ? fim.valor - inicio.valor
    : inicio.valor === 0
      ? null
      : ((fim.valor - inicio.valor) / Math.abs(inicio.valor)) * 100

  if (variacaoPortal === null) {
    return {
      estado: 'nao_comparavel',
      razao: `o valor inicial do portal para "${afirmacao.geografia}" em ${afirmacao.periodo_inicio} é zero, e uma variação percentual a partir de zero não existe`,
    }
  }
  return compararValores(afirmacao.valor, variacaoPortal, afirmacao.unidade, tolerancia)
}
