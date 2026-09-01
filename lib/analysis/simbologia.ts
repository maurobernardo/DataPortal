/**
 * Simbologia temática partilhada entre o mapa coroplético e os gráficos de ranking
 * (PLANO-DATAPROPROMAX.md): a mesma cor tem de significar a mesma coisa em toda a análise — um
 * "alto" laranja no mapa e um "alto" verde-escuro no gráfico ao lado seria confuso, não só feio.
 *
 * Cliente-only (sem imports de servidor): importado directamente por componentes React.
 */

/**
 * Rampa sequencial da paleta do relatório (sálvia → dourado → terracota → rubi), e monotónica em
 * luminância: 0,53 → 0,34 → 0,18 → 0,06. É essa monotonia que faz a escala continuar a ler-se
 * como uma ordem em tons de cinzento, numa impressão a preto e branco, e para quem não distingue
 * verde de vermelho.
 *
 * A rampa anterior (#15803D, #EAB308, #EA580C, #B91C1C) tinha luminâncias 0,16 → 0,50 → 0,25 →
 * 0,11: "Baixo" saía mais escuro do que "Alto", pelo que sem a cor a escala lia-se ao contrário.
 */
export const CLASSES_TEMATICAS = [
  { cor: '#a8c9ae', rotulo: 'Baixo' },
  { cor: '#c7962c', rotulo: 'Moderado' },
  { cor: '#be5433', rotulo: 'Alto' },
  { cor: '#7a2422', rotulo: 'Muito alto' },
] as const

/** Classificação por quantil (cada classe com o mesmo número de unidades, não o mesmo intervalo
 *  de valores): resiste a um outlier esticar a escala e deixar tudo o resto na mesma cor. */
export function limitesQuantil(valores: number[], nClasses: number): number[] {
  const ordenados = [...valores].sort((a, b) => a - b)
  const limites: number[] = []
  for (let i = 1; i < nClasses; i++) {
    const idx = Math.min(ordenados.length - 1, Math.floor((ordenados.length * i) / nClasses))
    limites.push(ordenados[idx])
  }
  return limites
}

/** Classificação por intervalo igual (cada classe cobre a mesma fatia de valores, não o mesmo
 *  número de unidades): mais intuitiva quando a distribuição é razoavelmente uniforme, mas um
 *  outlier "estica" a escala e empurra a maioria das unidades para a classe mais baixa — por isso
 *  fica como alternativa que o utilizador escolhe, não a omissão. */
export function limitesIntervaloIgual(valores: number[], nClasses: number): number[] {
  if (valores.length === 0) return []
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const passo = (max - min) / nClasses
  const limites: number[] = []
  for (let i = 1; i < nClasses; i++) limites.push(min + passo * i)
  return limites
}

export type EsquemaClassificacao = 'quartis' | 'intervalos_iguais'

export function calcularLimites(
  valores: number[],
  nClasses: number,
  esquema: EsquemaClassificacao
): number[] {
  return esquema === 'intervalos_iguais' ? limitesIntervaloIgual(valores, nClasses) : limitesQuantil(valores, nClasses)
}

export function classeParaValor(valor: number, limites: number[]): number {
  for (let i = 0; i < limites.length; i++) {
    if (valor <= limites[i]) return i
  }
  return limites.length
}

/* ------------------------------------------------------------------ mudança */

/**
 * Escala divergente, para mapas de variação.
 *
 * Uma rampa sequencial não serve para mudança. A sequencial ordena de pouco para muito e tem um só
 * extremo; a variação tem DOIS extremos e um centro que importa mais do que qualquer um deles, que
 * é o zero. Pintar variações com a rampa temática faria "desceu muito" e "não mudou" partilharem o
 * canto claro da escala, quando são a notícia e a ausência de notícia.
 *
 * Sobre as cores escolhidas, e o que elas deliberadamente NÃO dizem.
 *
 * O reflexo é verde para quem sobe e vermelho para quem desce. Isso é uma opinião, e metade das
 * vezes é a opinião errada: mais escolas é bom, mais casos de cólera é o contrário, e o mapa não
 * sabe qual dos dois está a desenhar. É o mesmo motivo pelo qual a referência do KPI não pinta a
 * seta. Por isso a descida vai num azul-ardósia dessaturado, que não é cor de alarme, e a subida no
 * verde-floresta que o portal já usa para "mais". A escala diz a DIRECÇÃO e o TAMANHO; o juízo
 * sobre se é boa ou má fica para quem lê, que é quem sabe a métrica.
 *
 * Uma limitação que não se resolve e por isso se declara: uma escala divergente é ambígua a preto
 * e branco. As duas pontas são escuras por construção, e nenhuma escolha de cor evita isso. É a
 * razão pela qual o sinal vai escrito no rótulo de cada classe e na etiqueta de cada unidade, em
 * vez de ficar entregue só à cor.
 */
export const CLASSES_MUDANCA = [
  { cor: '#3d4f70', rotulo: 'Desceu muito' },
  { cor: '#8f9db5', rotulo: 'Desceu' },
  { cor: '#ece7d8', rotulo: 'Sem mudança' },
  { cor: '#86ab8f', rotulo: 'Subiu' },
  { cor: '#1f7752', rotulo: 'Subiu muito' },
] as const

/**
 * Percentil com interpolação linear. Existe para a escala não depender de um só valor.
 */
export function percentil(valores: number[], p: number): number {
  const ordenados = [...valores].sort((a, b) => a - b)
  if (ordenados.length === 0) return 0
  if (ordenados.length === 1) return ordenados[0]
  const pos = p * (ordenados.length - 1)
  const baixo = Math.floor(pos)
  const alto = Math.ceil(pos)
  if (baixo === alto) return ordenados[baixo]
  return ordenados[baixo] + (pos - baixo) * (ordenados[alto] - ordenados[baixo])
}

/**
 * Limites SIMÉTRICOS à volta do zero, com a amplitude tirada de uma estatística ROBUSTA.
 *
 * A simetria é obrigatória: com limites por quantil, uma descida de 5% e uma subida de 5% caem em
 * classes de tamanho diferente conforme a distribuição, e o mapa dá mais peso visual a um lado sem
 * nada nos dados o justificar.
 *
 * Mas a amplitude NÃO pode vir do maior desvio, e a primeira versão vinha. Foi um erro grave, e
 * silencioso, apanhado num mapa real de produção de milho.
 *
 * Uma variação percentual é assimétrica por natureza: não desce abaixo de -100%, e sobe sem limite.
 * Naquele mapa, uma província cresceu 1048% e o maior desvio passou a ser 1048. A faixa central,
 * calculada como uma fracção dele, ficou em ±105%. Como nenhuma descida pode passar de -100%, TODAS
 * as descidas do país caíram dentro da faixa de "sem mudança": uma província que tivesse perdido 99%
 * da produção seria pintada como estável, e o mapa continuaria a parecer certo.
 *
 * A amplitude passa a sair do percentil 90 dos desvios em módulo. Um valor acima disso cai na classe
 * extrema, que é o que a classe extrema significa, e deixa de arrastar a escala inteira consigo.
 */
export function limitesMudanca(valores: number[], limiarNulo = 0.1): number[] {
  /*
   * Quando não há variação nenhuma, os limites TÊM de deixar o zero estritamente dentro da faixa
   * central. Devolver quatro zeros parece inofensivo e não é: `classeDeMudanca(0, [0,0,0,0])`
   * compara `0 <= 0` no primeiro limite e devolve a classe mais baixa, pelo que um país onde nada
   * mudou saía pintado de "desceu muito", de ponta a ponta, com toda a confiança visual de um mapa
   * correcto. Apanhado pelos testes, não pelo olho.
   *
   * A magnitude da banda é arbitrária de propósito: se todos os valores são zero, qualquer faixa
   * simétrica que contenha o zero dá o mesmo resultado, e o que interessa é só a simetria.
   */
  const SEM_VARIACAO = [-1, -0.5, 0.5, 1]
  const finitos = valores.filter((v) => Number.isFinite(v))
  if (finitos.length === 0) return SEM_VARIACAO

  const modulos = finitos.map((v) => Math.abs(v))
  // O percentil 90 é a amplitude típica; o maior valor entra na classe extrema e fica por lá.
  const escala = percentil(modulos, 0.9)
  if (escala === 0) return SEM_VARIACAO

  const nulo = escala * limiarNulo
  const meio = (escala + nulo) / 2
  // Quatro limites para cinco classes: muito abaixo | abaixo | nulo | acima | muito acima.
  return [-meio, -nulo, nulo, meio]
}

/** Índice da classe de mudança, de 0 (desceu muito) a 4 (subiu muito). */
export function classeDeMudanca(valor: number, limites: number[]): number {
  for (let i = 0; i < limites.length; i++) {
    if (valor <= limites[i]) return i
  }
  return limites.length
}
