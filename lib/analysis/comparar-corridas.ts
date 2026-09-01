/**
 * O que mudou entre duas corridas da mesma pergunta.
 *
 * É o coração da análise viva. Sem isto, voltar a correr uma pergunta produz um segundo relatório
 * que alguém teria de ler lado a lado com o primeiro para descobrir o que interessa, que é
 * exactamente o trabalho que a funcionalidade existe para poupar.
 *
 * A regra que mais importa é a que RECUSA comparar.
 *
 * Duas corridas da mesma pergunta podem produzir planos diferentes: os dados mudaram, o motor
 * escolheu outro método, um passo falhou numa e não na outra. Quando os identificadores de cálculo
 * deixam de coincidir, os números das duas corridas deixam de ser o mesmo número medido duas vezes
 * e passam a ser dois números diferentes. Compará-los daria variações inventadas com todo o aspecto
 * de descobertas. Por isso, quando a sobreposição é fraca, isto declara-se incomparável em vez de
 * produzir um relatório de mudanças que ninguém consegue desmentir.
 */

export type MudancaNumero = {
  id: string
  antes: number
  depois: number
  delta: number
  /** Nulo quando o valor anterior era zero: a variação percentual não existe. */
  deltaPct: number | null
}

export type MudancaUnidade = {
  serie: string
  nome: string
  antes: number
  depois: number
  delta: number
}

export type ComparacaoDeCorridas = {
  comparavel: boolean
  /** Porque não, quando não é. Vai para o ecrã tal e qual. */
  razao?: string
  numeros: MudancaNumero[]
  unidades: MudancaUnidade[]
  /** Unidades que apareceram ou desapareceram entre corridas: mudança de cobertura, não de valor. */
  unidadesNovas: string[]
  unidadesPerdidas: string[]
}

/**
 * Fracção mínima de cálculos em comum para as duas corridas falarem da mesma coisa.
 *
 * Metade é deliberadamente exigente. Abaixo disso, o que mudou não foi o país: foi o plano.
 */
const MIN_SOBREPOSICAO = 0.5

/**
 * Variação relativa abaixo da qual um número não conta como notícia.
 *
 * Sem este limiar, uma re-execução em que nada de material mudou produziria uma lista de trinta
 * "mudanças" de décimas, e a única mudança que interessava ficava enterrada no meio delas.
 */
const RUIDO = 0.005

type Corrida = {
  calcs?: Record<string, { valor: number | string }>
  series?: { passo_id: string; metrica?: string; unidades: { codigo: string; nome: string; valor: number }[] }[]
}

function numerico(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function compararCorridas(anterior: Corrida, actual: Corrida): ComparacaoDeCorridas {
  const vazio: ComparacaoDeCorridas = {
    comparavel: false,
    numeros: [],
    unidades: [],
    unidadesNovas: [],
    unidadesPerdidas: [],
  }

  const calcsA = anterior.calcs || {}
  const calcsB = actual.calcs || {}
  const idsA = Object.keys(calcsA)
  const idsB = Object.keys(calcsB)
  if (idsA.length === 0 || idsB.length === 0) {
    return { ...vazio, razao: 'Uma das corridas não produziu cálculos que se possam comparar.' }
  }

  const comuns = idsA.filter((id) => id in calcsB)
  const sobreposicao = comuns.length / Math.max(idsA.length, idsB.length)
  if (sobreposicao < MIN_SOBREPOSICAO) {
    return {
      ...vazio,
      razao:
        'O motor traçou um plano diferente desta vez, por isso os números das duas corridas não ' +
        'são o mesmo número medido duas vezes. Comparar dava variações que não existiram.',
    }
  }

  // ---------------------------------------------------------------- números
  const numeros: MudancaNumero[] = []
  for (const id of comuns) {
    const antes = numerico(calcsA[id]?.valor)
    const depois = numerico(calcsB[id]?.valor)
    if (antes === null || depois === null) continue
    const delta = depois - antes
    if (delta === 0) continue
    const relativo = antes === 0 ? Infinity : Math.abs(delta / antes)
    if (relativo < RUIDO) continue
    numeros.push({
      id,
      antes,
      depois,
      delta,
      deltaPct: antes === 0 ? null : (delta / Math.abs(antes)) * 100,
    })
  }
  // Maior variação relativa primeiro: um distrito que duplicou é mais notícia do que o total
  // nacional a subir um por cento, mesmo sendo um número muito menor.
  numeros.sort((a, b) => Math.abs(b.deltaPct ?? Infinity) - Math.abs(a.deltaPct ?? Infinity))

  // ---------------------------------------------------------------- unidades
  const unidades: MudancaUnidade[] = []
  const novas: string[] = []
  const perdidas: string[] = []
  const seriesA = new Map((anterior.series || []).map((s) => [s.passo_id, s]))

  for (const serieB of actual.series || []) {
    const serieA = seriesA.get(serieB.passo_id)
    if (!serieA) continue
    const porCodigoA = new Map(serieA.unidades.map((u) => [u.codigo, u]))
    const vistos = new Set<string>()
    for (const u of serieB.unidades) {
      vistos.add(u.codigo)
      const antes = porCodigoA.get(u.codigo)
      if (!antes) {
        novas.push(u.nome)
        continue
      }
      const delta = u.valor - antes.valor
      if (delta === 0) continue
      const relativo = antes.valor === 0 ? Infinity : Math.abs(delta / antes.valor)
      if (relativo < RUIDO) continue
      unidades.push({
        serie: serieB.metrica || serieB.passo_id,
        nome: u.nome,
        antes: antes.valor,
        depois: u.valor,
        delta,
      })
    }
    for (const u of serieA.unidades) {
      if (!vistos.has(u.codigo)) perdidas.push(u.nome)
    }
  }
  unidades.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  return {
    comparavel: true,
    numeros,
    unidades,
    unidadesNovas: Array.from(new Set(novas)),
    unidadesPerdidas: Array.from(new Set(perdidas)),
  }
}

/** Houve alguma coisa que valha a pena contar a alguém? */
export function houveMudanca(c: ComparacaoDeCorridas): boolean {
  return (
    c.comparavel &&
    (c.numeros.length > 0 ||
      c.unidades.length > 0 ||
      c.unidadesNovas.length > 0 ||
      c.unidadesPerdidas.length > 0)
  )
}
