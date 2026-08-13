/**
 * Estatística descritiva, comparativa, temporal e de relação (Partes 7.1 a 7.4).
 *
 * Todas as funções são puras e determinísticas: dado o mesmo input produzem exactamente o mesmo
 * output, o que é o que torna R11 (reprodutibilidade) possível. Nenhuma delas aceita ou devolve
 * texto gerado por modelo; a interpretação em linguagem natural é derivada dos números.
 */
import {
  arredondar,
  desvioPadrao,
  maximo,
  media,
  mediana,
  minimo,
  numerosValidos,
  pValorBilateral,
  quantil,
  soma,
  variancia,
} from './numeric'

// ==================== 7.1 PERFIL E QUALIDADE ====================

export type PerfilColuna = {
  coluna: string
  tipo: 'numerica' | 'categorica' | 'temporal' | 'vazia'
  n_total: number
  n_preenchidos: number
  completude_pct: number
  n_distintos: number
  estatisticas?: {
    min: number
    max: number
    media: number
    mediana: number
    desvio: number
    q1: number
    q3: number
  }
  top_categorias?: { valor: string; n: number; pct: number }[]
}

export function perfilColuna(coluna: string, valores: unknown[]): PerfilColuna {
  const preenchidos = valores.filter((v) => v != null && String(v).trim() !== '')
  const nums = numerosValidos(preenchidos)
  const distintos = new Set(preenchidos.map((v) => String(v).trim()))

  const base = {
    coluna,
    n_total: valores.length,
    n_preenchidos: preenchidos.length,
    completude_pct: valores.length ? arredondar((preenchidos.length / valores.length) * 100, 1) : 0,
    n_distintos: distintos.size,
  }

  if (preenchidos.length === 0) return { ...base, tipo: 'vazia' }

  // Só trata como numérica se a esmagadora maioria dos valores preenchidos converter.
  if (nums.length >= preenchidos.length * 0.9) {
    return {
      ...base,
      tipo: 'numerica',
      estatisticas: {
        min: arredondar(minimo(nums), 4),
        max: arredondar(maximo(nums), 4),
        media: arredondar(media(nums), 4),
        mediana: arredondar(mediana(nums), 4),
        desvio: arredondar(desvioPadrao(nums), 4),
        q1: arredondar(quantil(nums, 0.25), 4),
        q3: arredondar(quantil(nums, 0.75), 4),
      },
    }
  }

  const contagem = new Map<string, number>()
  for (const v of preenchidos) {
    const k = String(v).trim()
    contagem.set(k, (contagem.get(k) || 0) + 1)
  }
  const top = Array.from(contagem.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([valor, n]) => ({
      valor,
      n,
      pct: arredondar((n / preenchidos.length) * 100, 1),
    }))

  return { ...base, tipo: 'categorica', top_categorias: top }
}

/** Outliers pelo critério IQR (Tukey). Robusto a distribuições assimétricas. */
export function detectarOutliers(valores: number[], factor = 1.5) {
  const nums = valores.filter((n) => Number.isFinite(n))
  if (nums.length < 4) return { limite_inferior: NaN, limite_superior: NaN, outliers: [], n: 0 }
  const q1 = quantil(nums, 0.25)
  const q3 = quantil(nums, 0.75)
  const iqr = q3 - q1
  const li = q1 - factor * iqr
  const ls = q3 + factor * iqr
  const outliers = nums
    .map((valor, indice) => ({ indice, valor }))
    .filter((o) => o.valor < li || o.valor > ls)
  return {
    limite_inferior: arredondar(li, 4),
    limite_superior: arredondar(ls, 4),
    outliers,
    n: outliers.length,
  }
}

// ==================== 7.2 DESCRITIVA E COMPARATIVA ====================

export function resumoEstatistico(valores: number[]) {
  const nums = valores.filter((n) => Number.isFinite(n))
  if (nums.length === 0) return null
  return {
    n: nums.length,
    soma: arredondar(soma(nums), 4),
    media: arredondar(media(nums), 4),
    mediana: arredondar(mediana(nums), 4),
    desvio: arredondar(desvioPadrao(nums), 4),
    min: arredondar(minimo(nums), 4),
    max: arredondar(maximo(nums), 4),
    q1: arredondar(quantil(nums, 0.25), 4),
    q3: arredondar(quantil(nums, 0.75), 4),
    coeficiente_variacao: arredondar((desvioPadrao(nums) / media(nums)) * 100, 2),
  }
}

/**
 * Concentração: Gini, HHI e quota do topo N.
 *
 * É a família de métricas que responde à pergunta "está concentrado?" de forma defensável, em
 * vez de afirmações vagas sobre desigualdade.
 */
export function concentracao(valores: number[], topN = 3) {
  const nums = valores.filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b)
  const n = nums.length
  if (n === 0) return null
  const total = soma(nums)
  if (total === 0) return null

  // Gini pela fórmula da média das diferenças relativas, ordenada.
  let acumulado = 0
  for (let i = 0; i < n; i++) acumulado += (2 * (i + 1) - n - 1) * nums[i]
  const gini = acumulado / (n * total)

  const quotas = nums.map((v) => v / total)
  const hhi = soma(quotas.map((q) => q * q))

  const desc = [...nums].sort((a, b) => b - a)
  const quotaTopN = soma(desc.slice(0, topN)) / total

  return {
    gini: arredondar(gini, 4),
    hhi: arredondar(hhi, 4),
    [`quota_top${topN}_pct`]: arredondar(quotaTopN * 100, 1),
    n,
    interpretacao:
      gini > 0.5
        ? `Distribuição muito concentrada (Gini ${arredondar(gini, 2)}): poucas unidades detêm a maior parte do total.`
        : gini > 0.3
          ? `Distribuição moderadamente concentrada (Gini ${arredondar(gini, 2)}).`
          : `Distribuição relativamente equilibrada (Gini ${arredondar(gini, 2)}).`,
  }
}

/** Curva de Lorenz para acompanhar o Gini num gráfico. */
export function curvaLorenz(valores: number[]) {
  const nums = valores.filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b)
  const total = soma(nums)
  if (total === 0 || nums.length === 0) return []
  const pontos: { pop_acum: number; valor_acum: number }[] = [{ pop_acum: 0, valor_acum: 0 }]
  let acum = 0
  nums.forEach((v, i) => {
    acum += v
    pontos.push({
      pop_acum: arredondar(((i + 1) / nums.length) * 100, 2),
      valor_acum: arredondar((acum / total) * 100, 2),
    })
  })
  return pontos
}

/**
 * Comparação de dois grupos com teste t de Welch (não assume variâncias iguais) e Cohen's d.
 * O effect size acompanha sempre o p-valor porque significância sem magnitude induz em erro.
 */
export function compararGrupos(grupoA: number[], grupoB: number[], rotuloA = 'A', rotuloB = 'B') {
  const a = grupoA.filter((n) => Number.isFinite(n))
  const b = grupoB.filter((n) => Number.isFinite(n))
  if (a.length < 2 || b.length < 2) return null

  const mA = media(a)
  const mB = media(b)
  const vA = variancia(a)
  const vB = variancia(b)
  const erroPadrao = Math.sqrt(vA / a.length + vB / b.length)
  const t = erroPadrao > 0 ? (mA - mB) / erroPadrao : 0
  const p = pValorBilateral(t)

  const desvioAgrupado = Math.sqrt(
    ((a.length - 1) * vA + (b.length - 1) * vB) / (a.length + b.length - 2)
  )
  const d = desvioAgrupado > 0 ? (mA - mB) / desvioAgrupado : 0
  const magnitude = Math.abs(d) < 0.2 ? 'irrelevante' : Math.abs(d) < 0.5 ? 'pequena' : Math.abs(d) < 0.8 ? 'média' : 'grande'

  return {
    [`media_${rotuloA}`]: arredondar(mA, 4),
    [`media_${rotuloB}`]: arredondar(mB, 4),
    diferenca: arredondar(mA - mB, 4),
    diferenca_pct: mB !== 0 ? arredondar(((mA - mB) / Math.abs(mB)) * 100, 2) : null,
    t: arredondar(t, 4),
    p: arredondar(p, 6),
    significativo: p < 0.05,
    cohen_d: arredondar(d, 4),
    magnitude_efeito: magnitude,
    n_a: a.length,
    n_b: b.length,
    interpretacao:
      p < 0.05
        ? `Diferença estatisticamente significativa (p = ${arredondar(p, 4)}) e de magnitude ${magnitude}.`
        : `A diferença observada é compatível com variação aleatória (p = ${arredondar(p, 4)}): não há evidência de diferença real.`,
  }
}

/** Comparação entre dois períodos: variação absoluta, relativa e em pontos percentuais. */
export function compararPeriodos(valorInicial: number, valorFinal: number, ehPercentagem = false) {
  const absoluta = valorFinal - valorInicial
  const relativa = valorInicial !== 0 ? (absoluta / Math.abs(valorInicial)) * 100 : null
  return {
    valor_inicial: arredondar(valorInicial, 4),
    valor_final: arredondar(valorFinal, 4),
    variacao_absoluta: arredondar(absoluta, 4),
    variacao_relativa_pct: relativa !== null ? arredondar(relativa, 2) : null,
    variacao_pp: ehPercentagem ? arredondar(absoluta, 2) : null,
    direccao: absoluta > 0 ? 'subiu' : absoluta < 0 ? 'desceu' : 'estável',
  }
}

// ==================== 7.3 TEMPORAL ====================

/**
 * Teste de tendência de Mann-Kendall com declive de Sen.
 *
 * Escolhido em vez de regressão linear porque é não paramétrico: não assume normalidade nem
 * linearidade e é robusto a outliers, o que é o caso comum em séries oficiais curtas.
 */
export function tendenciaMannKendall(serie: number[]) {
  const x = serie.filter((n) => Number.isFinite(n))
  const n = x.length
  if (n < 4) return null

  let S = 0
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      S += Math.sign(x[j] - x[i])
    }
  }

  // Variância com correcção para empates.
  const contagem = new Map<number, number>()
  for (const v of x) contagem.set(v, (contagem.get(v) || 0) + 1)
  let correccao = 0
  for (const t of Array.from(contagem.values())) {
    if (t > 1) correccao += t * (t - 1) * (2 * t + 5)
  }
  const varS = (n * (n - 1) * (2 * n + 5) - correccao) / 18

  const z = S > 0 ? (S - 1) / Math.sqrt(varS) : S < 0 ? (S + 1) / Math.sqrt(varS) : 0
  const p = pValorBilateral(z)

  // Declive de Sen: mediana de todos os declives par a par.
  const declives: number[] = []
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      declives.push((x[j] - x[i]) / (j - i))
    }
  }
  const declivesOrdenados = [...declives].sort((a, b) => a - b)
  const sen = mediana(declives)

  const significativo = p < 0.05
  const direccao = !significativo ? 'sem tendência' : S > 0 ? 'crescente' : 'decrescente'

  if (!significativo) {
    return {
      S,
      z: arredondar(z, 4),
      p: arredondar(p, 6),
      significativo,
      declive_sen: arredondar(sen, 6),
      direccao,
      n,
      interpretacao: `Não há evidência de tendência: as variações observadas são compatíveis com flutuação aleatória (p = ${arredondar(p, 4)}).`,
    }
  }

  // Projecção honesta (PLANO-INTELIGENCIA-PRO-MAX.md, Fase 5, pilar 6): só entra quando o teste
  // já confirmou tendência real (linha acima). Não é uma recta ajustada à parte: extrapola-se um
  // período a partir do MESMO declive de Sen do teste, com intervalo de confiança calculado a
  // partir da mesma distribuição de declives par-a-par (método de Gilbert 1987/Hirsch-Slack, o
  // padrão não paramétrico para IC do declive de Sen) — a incerteza fica explícita, não escondida.
  const zAlpha = 1.959964 // bilateral, 95%
  const Calpha = zAlpha * Math.sqrt(varS)
  const N = declivesOrdenados.length
  const m1 = Math.max(0, Math.round((N - Calpha) / 2) - 1)
  const m2 = Math.min(N - 1, Math.round((N + Calpha) / 2))
  const declive_ic_inferior = declivesOrdenados[m1]
  const declive_ic_superior = declivesOrdenados[m2]
  const ultimoValor = x[n - 1]
  const projecao = ultimoValor + sen
  const projecaoA = ultimoValor + declive_ic_inferior
  const projecaoB = ultimoValor + declive_ic_superior
  const projecao_ic_inferior = Math.min(projecaoA, projecaoB)
  const projecao_ic_superior = Math.max(projecaoA, projecaoB)

  return {
    S,
    z: arredondar(z, 4),
    p: arredondar(p, 6),
    significativo,
    declive_sen: arredondar(sen, 6),
    direccao,
    n,
    projecao_proximo_periodo: arredondar(projecao, 4),
    projecao_ic_inferior: arredondar(projecao_ic_inferior, 4),
    projecao_ic_superior: arredondar(projecao_ic_superior, 4),
    interpretacao:
      `Tendência ${direccao} estatisticamente significativa (p = ${arredondar(p, 4)}), com variação típica de ` +
      `${arredondar(sen, 2)} por período. Projecção estatística para o próximo período: ${arredondar(projecao, 2)} ` +
      `(intervalo de confiança de 95%: ${arredondar(projecao_ic_inferior, 2)} a ${arredondar(projecao_ic_superior, 2)}) ` +
      `; projecção estatística, não garantia.`,
  }
}

/** Taxa de crescimento anual composta. */
export function cagr(valorInicial: number, valorFinal: number, periodos: number) {
  if (valorInicial <= 0 || periodos <= 0) return null
  const taxa = (Math.pow(valorFinal / valorInicial, 1 / periodos) - 1) * 100
  return {
    cagr_pct: arredondar(taxa, 3),
    periodos,
    interpretacao: `Crescimento médio de ${arredondar(taxa, 1)}% por período ao longo de ${periodos} períodos.`,
  }
}

/** Média móvel centrada, para suavizar séries ruidosas em gráficos. */
export function mediaMovel(serie: number[], janela = 3): (number | null)[] {
  const metade = Math.floor(janela / 2)
  return serie.map((_, i) => {
    const ini = i - metade
    const fim = i + metade
    if (ini < 0 || fim >= serie.length) return null
    return arredondar(media(serie.slice(ini, fim + 1)), 4)
  })
}

/** Índice base 100 no primeiro período: torna séries de escalas diferentes comparáveis. */
export function indexarBase100(serie: number[]): (number | null)[] {
  const base = serie.find((v) => Number.isFinite(v) && v !== 0)
  if (base == null) return serie.map(() => null)
  return serie.map((v) => (Number.isFinite(v) ? arredondar((v / base) * 100, 2) : null))
}

// ==================== 7.4 RELAÇÃO ====================

export function correlacaoPearson(x: number[], y: number[]) {
  const pares = x
    .map((xi, i) => ({ xi, yi: y[i] }))
    .filter((p) => Number.isFinite(p.xi) && Number.isFinite(p.yi))
  const n = pares.length
  if (n < 3) return null

  const mx = media(pares.map((p) => p.xi))
  const my = media(pares.map((p) => p.yi))
  const num = soma(pares.map((p) => (p.xi - mx) * (p.yi - my)))
  const den = Math.sqrt(
    soma(pares.map((p) => (p.xi - mx) ** 2)) * soma(pares.map((p) => (p.yi - my) ** 2))
  )
  const r = den === 0 ? 0 : num / den

  // t de Student com n-2 graus de liberdade, aproximado pela normal para p-valor.
  const t = r * Math.sqrt((n - 2) / Math.max(1e-12, 1 - r * r))
  const p = pValorBilateral(t)
  const forca = Math.abs(r) < 0.3 ? 'fraca' : Math.abs(r) < 0.6 ? 'moderada' : 'forte'

  return {
    r: arredondar(r, 4),
    r2: arredondar(r * r, 4),
    p: arredondar(p, 6),
    n,
    significativo: p < 0.05,
    forca,
    // R7: a interpretação nunca sugere causalidade.
    interpretacao:
      p < 0.05
        ? `Associação ${forca} e estatisticamente significativa (r = ${arredondar(r, 2)}, p = ${arredondar(p, 4)}). Associação não implica causalidade: pode existir uma variável de confundimento a explicar ambas.`
        : `Não há evidência de associação linear (r = ${arredondar(r, 2)}, p = ${arredondar(p, 4)}).`,
  }
}

/** Regressão linear simples com diagnóstico mínimo. */
export function regressaoLinear(x: number[], y: number[]) {
  const pares = x
    .map((xi, i) => ({ xi, yi: y[i] }))
    .filter((p) => Number.isFinite(p.xi) && Number.isFinite(p.yi))
  const n = pares.length
  if (n < 3) return null

  const mx = media(pares.map((p) => p.xi))
  const my = media(pares.map((p) => p.yi))
  const sxx = soma(pares.map((p) => (p.xi - mx) ** 2))
  const sxy = soma(pares.map((p) => (p.xi - mx) * (p.yi - my)))
  if (sxx === 0) return null

  const declive = sxy / sxx
  const intercepcao = my - declive * mx
  const previstos = pares.map((p) => intercepcao + declive * p.xi)
  const residuos = pares.map((p, i) => p.yi - previstos[i])
  const sqe = soma(residuos.map((r) => r * r))
  const sqt = soma(pares.map((p) => (p.yi - my) ** 2))
  const r2 = sqt === 0 ? 0 : 1 - sqe / sqt

  const erroPadraoDeclive = Math.sqrt(sqe / (n - 2) / sxx)
  const t = erroPadraoDeclive > 0 ? declive / erroPadraoDeclive : 0

  return {
    declive: arredondar(declive, 6),
    intercepcao: arredondar(intercepcao, 6),
    r2: arredondar(r2, 4),
    p_declive: arredondar(pValorBilateral(t), 6),
    n,
    equacao: `y = ${arredondar(intercepcao, 2)} + ${arredondar(declive, 4)}x`,
  }
}

/**
 * Detector do paradoxo de Simpson: a direcção da relação global inverte-se dentro dos grupos?
 * É uma das verificações que a auto-crítica adversarial exige e que raramente é feita à mão.
 */
export function detectarSimpson(
  x: number[],
  y: number[],
  grupos: string[]
): { paradoxo: boolean; r_global: number; r_por_grupo: { grupo: string; r: number; n: number }[]; nota: string } | null {
  const global = correlacaoPearson(x, y)
  if (!global) return null

  const porGrupo = new Map<string, { x: number[]; y: number[] }>()
  grupos.forEach((g, i) => {
    if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) return
    if (!porGrupo.has(g)) porGrupo.set(g, { x: [], y: [] })
    porGrupo.get(g)!.x.push(x[i])
    porGrupo.get(g)!.y.push(y[i])
  })

  const resultados: { grupo: string; r: number; n: number }[] = []
  for (const [grupo, dados] of Array.from(porGrupo)) {
    const c = correlacaoPearson(dados.x, dados.y)
    if (c) resultados.push({ grupo, r: c.r, n: c.n })
  }

  if (resultados.length < 2) return null

  const sinalGlobal = Math.sign(global.r)
  const invertidos = resultados.filter((r) => Math.sign(r.r) !== 0 && Math.sign(r.r) !== sinalGlobal)
  const paradoxo = invertidos.length >= Math.ceil(resultados.length / 2) && Math.abs(global.r) > 0.1

  return {
    paradoxo,
    r_global: global.r,
    r_por_grupo: resultados,
    nota: paradoxo
      ? 'Paradoxo de Simpson detectado: a direcção da associação global inverte-se dentro da maioria dos grupos. A conclusão agregada não se aplica aos subgrupos.'
      : 'Sem inversão de sinal entre a associação global e a dos grupos.',
  }
}
