/**
 * A referência de um KPI: o que torna um número legível.
 *
 * Um cartão que diz "105" e "Escolas na Beira" não diz se são muitas. O leitor fica com o número e
 * sem a única coisa que lhe dá sentido, que é a comparação. Este módulo produz essa comparação a
 * partir do que a análise JÁ calculou, e nunca a pede a um modelo: uma referência inventada é pior
 * do que referência nenhuma, porque parece um facto.
 *
 * Duas referências, por esta ordem de preferência:
 *
 * `variacao` responde "está a melhorar?", e sai quando o mesmo passo produziu uma série temporal.
 * `posicao` responde "é muito?", e sai quando o mesmo passo produziu uma série por unidade
 * geográfica: onde é que este valor cai entre o mínimo, a mediana e o máximo do país.
 *
 * O valor deste módulo está no que RECUSA. A armadilha óbvia é comparar um total nacional com a
 * distribuição das províncias que o compõem: o total está sempre acima do máximo, e o cartão diria
 * "o mais alto do país" sobre um número que não é de nenhuma província. Por isso um valor que caia
 * fora do intervalo observado não recebe posição nenhuma.
 *
 * Cliente-only: sem imports de servidor, para o cartão poder calcular isto ao desenhar.
 */

export type ReferenciaKpi =
  | {
      tipo: 'variacao'
      anterior: number
      actual: number
      delta: number
      /** Nulo quando o anterior é zero: a variação percentual não existe, e inventá-la seria mentir. */
      deltaPct: number | null
      subiu: boolean
    }
  | {
      tipo: 'posicao'
      minimo: number
      mediana: number
      maximo: number
      valor: number
      /** Onde o valor cai entre o mínimo e o máximo, de 0 a 100. Para desenhar a barra. */
      posicaoPct: number
      acimaDaMediana: boolean
      nUnidades: number
    }
  | null

/**
 * Abaixo disto não há distribuição que se leia. Uma "mediana" de três valores é o do meio, e dizer
 * a alguém que está acima dela sugere uma comparação com o país que não foi feita.
 */
const MIN_UNIDADES_PARA_POSICAO = 5

/**
 * Folga permitida para considerar que um valor pertence à distribuição.
 *
 * Não é zero por uma razão prática: o KPI é arredondado para o ecrã e a série guarda o valor
 * inteiro, por isso o máximo do país pode aparecer no cartão como um número um pouco acima do
 * máximo da série. Meio por cento absorve o arredondamento sem deixar passar um total nacional,
 * que costuma ser várias vezes maior do que a maior unidade.
 */
const FOLGA_RELATIVA = 0.005

export function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(ordenados.length / 2)
  return ordenados.length % 2 === 0 ? (ordenados[meio - 1] + ordenados[meio]) / 2 : ordenados[meio]
}

/** Um número a sério. Exclui texto, nulos e infinitos, que aparecem em calcs de formato 'texto'. */
export function comoNumero(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  if (typeof valor === 'string') {
    // O calc guarda o valor cru; a formatação para o ecrã acontece noutro sítio. Ainda assim há
    // casos com separador de milhares ou sinal de percentagem colados, e recusá-los deixaria sem
    // referência precisamente os KPIs mais comuns.
    const limpo = valor.replace(/\s/g, '').replace(/%$/, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
    const n = Number(limpo)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Variação face ao período anterior, a partir de uma série temporal já desenhada na sparkline.
 *
 * Usa os dois ÚLTIMOS pontos preenchidos, e não o primeiro e o último: a pergunta que um cartão
 * responde é "e agora?", não "e desde sempre?". Um buraco no fim da série faz saltar para o último
 * ano com dados, em vez de comparar contra nada.
 */
export function variacaoDaSerie(valores: (number | null)[] | null | undefined): ReferenciaKpi {
  if (!valores) return null
  const preenchidos = valores.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (preenchidos.length < 2) return null
  const actual = preenchidos[preenchidos.length - 1]
  const anterior = preenchidos[preenchidos.length - 2]
  const delta = actual - anterior
  return {
    tipo: 'variacao',
    anterior,
    actual,
    delta,
    deltaPct: anterior === 0 ? null : (delta / Math.abs(anterior)) * 100,
    subiu: delta > 0,
  }
}

/**
 * Onde este valor cai na distribuição das unidades do país.
 *
 * Devolve `null` sempre que a comparação não for honesta: poucas unidades, valor não numérico,
 * distribuição sem amplitude (todas as unidades iguais, em que "posição" não significa nada), ou
 * um valor fora do intervalo observado, que é o sinal de que não é uma unidade desta série.
 */
export function posicaoNaDistribuicao(
  valor: unknown,
  unidades: { valor: number }[] | null | undefined
): ReferenciaKpi {
  const n = comoNumero(valor)
  if (n === null || !unidades) return null

  const valores = unidades
    .map((u) => u.valor)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (valores.length < MIN_UNIDADES_PARA_POSICAO) return null

  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  const amplitude = maximo - minimo
  if (amplitude <= 0) return null

  const folga = Math.abs(maximo) * FOLGA_RELATIVA
  if (n < minimo - folga || n > maximo + folga) return null

  const med = mediana(valores)
  const bruta = ((n - minimo) / amplitude) * 100
  return {
    tipo: 'posicao',
    minimo,
    mediana: med,
    maximo,
    valor: n,
    posicaoPct: Math.max(0, Math.min(100, bruta)),
    acimaDaMediana: n > med,
    nUnidades: valores.length,
  }
}

/**
 * A referência a mostrar, escolhida entre as que existirem.
 *
 * A variação ganha à posição quando as duas existem. Um cartão só tem espaço para uma linha, e
 * "subiu 12% face ao ano anterior" é mais accionável do que "está acima da mediana": a segunda
 * descreve, a primeira avisa.
 */
export function referenciaDoKpi(entrada: {
  valor: unknown
  serieTemporal?: (number | null)[] | null
  unidadesDaSerie?: { valor: number }[] | null
}): ReferenciaKpi {
  return (
    variacaoDaSerie(entrada.serieTemporal) ?? posicaoNaDistribuicao(entrada.valor, entrada.unidadesDaSerie)
  )
}
