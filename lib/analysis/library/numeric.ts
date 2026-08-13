/**
 * Utilitários numéricos partilhados pela biblioteca de análise.
 *
 * Tudo aqui é determinístico e sem dependências: é este código que produz os números que
 * chegam ao utilizador (R1), por isso tem de ser auditável e reproduzível linha a linha.
 */

/** Converte um valor de célula em número, tolerando formato português (vírgula decimal). */
export function paraNumero(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  // Remove separadores de milhares (espaço, espaço fino, apóstrofo) antes de trocar a vírgula.
  const limpo = s.replace(/[\s  ']/g, '').replace(',', '.')
  const n = Number.parseFloat(limpo)
  return Number.isFinite(n) ? n : null
}

export function numerosValidos(valores: unknown[]): number[] {
  const out: number[] = []
  for (const v of valores) {
    const n = paraNumero(v)
    if (n !== null) out.push(n)
  }
  return out
}

export function soma(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0)
}

export function media(xs: number[]): number {
  if (xs.length === 0) return NaN
  return soma(xs) / xs.length
}

export function mediana(xs: number[]): number {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const meio = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[meio - 1] + s[meio]) / 2 : s[meio]
}

/** Quantil por interpolação linear (mesmo método que numpy 'linear'). */
export function quantil(xs: number[], q: number): number {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  if (s.length === 1) return s[0]
  const pos = (s.length - 1) * q
  const base = Math.floor(pos)
  const resto = pos - base
  return s[base + 1] !== undefined ? s[base] + resto * (s[base + 1] - s[base]) : s[base]
}

/** Variância amostral (denominador n-1). */
export function variancia(xs: number[]): number {
  if (xs.length < 2) return NaN
  const m = media(xs)
  return soma(xs.map((x) => (x - m) ** 2)) / (xs.length - 1)
}

/** Variância populacional (denominador n): a usada em Moran's I e Gi*. */
export function varianciaPopulacional(xs: number[]): number {
  if (xs.length === 0) return NaN
  const m = media(xs)
  return soma(xs.map((x) => (x - m) ** 2)) / xs.length
}

export function desvioPadrao(xs: number[]): number {
  return Math.sqrt(variancia(xs))
}

export function minimo(xs: number[]): number {
  return xs.reduce((a, b) => (b < a ? b : a), Infinity)
}

export function maximo(xs: number[]): number {
  return xs.reduce((a, b) => (b > a ? b : a), -Infinity)
}

/**
 * Função de distribuição acumulada da normal padrão (aproximação de Abramowitz & Stegun 7.1.26,
 * erro < 7.5e-8). Usada para converter z-scores em p-valores sem depender de bibliotecas.
 */
export function normalCdf(z: number): number {
  const sinal = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x)
  return 0.5 * (1 + sinal * y)
}

/** p-valor bilateral a partir de um z-score. */
export function pValorBilateral(z: number): number {
  return 2 * (1 - normalCdf(Math.abs(z)))
}

export function arredondar(x: number, casas = 4): number {
  const f = 10 ** casas
  return Math.round(x * f) / f
}

/** Formatação portuguesa: espaço para milhares, vírgula decimal. */
export function formatarPT(x: number, casasDecimais = 1): string {
  if (!Number.isFinite(x)) return 'N/D'
  return x.toLocaleString('pt-PT', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  })
}
