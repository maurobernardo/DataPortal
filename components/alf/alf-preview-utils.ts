import { labelFromKey } from '@/lib/geo-preview-interactive'

export type AlfTablePreview = {
  type: 'table'
  columns: string[]
  rows: string[][]
  delimiter?: string
}

export function inferColumnType(values: string[]): 'str' | 'num' | 'date' {
  const sample = values.filter(Boolean).slice(0, 8)
  if (sample.length === 0) return 'str'
  if (sample.every((v) => /^\d{4}(-\d{2})?(-\d{2})?$/.test(v.trim()))) return 'date'
  if (sample.every((v) => /^-?\d+([.,]\d+)?$/.test(v.trim().replace(/\s/g, '')))) return 'num'
  return 'str'
}

export function typeIcon(t: 'str' | 'num' | 'date') {
  if (t === 'date') return { letter: 'D', className: 'alf-schema-icon-date' }
  if (t === 'num') return { letter: 'N', className: 'alf-schema-icon-num' }
  return { letter: 'S', className: 'alf-schema-icon-str' }
}

export function fillPercent(values: string[]) {
  if (!values.length) return 0
  const filled = values.filter((v) => v.trim() !== '').length
  return Math.round((filled / values.length) * 100)
}

export function columnLabel(col: string) {
  return col ? labelFromKey(col) : col
}

/**
 * Reordena as colunas da amostra pondo no fim as que têm um único valor em todas as linhas
 * mostradas.
 *
 * Muitos ficheiros do portal vêm em formato longo, com um bloco de colunas de identificação
 * repetidas linha a linha ("Layer NO", "Layer Nome", "Variable Identificador", "Variable Nome
 * EN"...). São as primeiras do ficheiro e são as primeiras que se vêem, mas na amostra dizem
 * sempre a mesma coisa: quem abre a pré-visualização gasta a largura toda do ecrã a ler a mesma
 * palavra repetida antes de chegar ao valor que procura.
 *
 * Nada é escondido nem alterado: só a ordem de leitura muda, a ordem relativa dentro de cada
 * grupo mantém-se, e o ecrã diz que isto aconteceu. A regra olha apenas para a amostra, por isso
 * uma coluna que varie no ficheiro inteiro mas não nestas linhas também desce, o que é o
 * comportamento certo para uma pré-visualização: aqui, ela de facto não distingue nada.
 */
/** Chave interna de linha ou código de referência: "Record Identificador", "Variable
 *  Identificador", "codigo", "id". Identifica, mas não descreve. */
const NOME_DE_IDENTIFICADOR = /(^|[\s_-])(identificador|id|ids|c[oó]digo|code|codes|key)([\s_-]|$)/i

export function ordenarColunasPorVariacao(
  columns: string[],
  rows: string[][]
): { columns: string[]; constantes: string[]; identificadores: string[] } {
  if (rows.length < 2) return { columns, constantes: [], identificadores: [] }

  const constantes: string[] = []
  const identificadores: string[] = []
  const informativas: string[] = []

  columns.forEach((col, i) => {
    if (NOME_DE_IDENTIFICADOR.test(col)) {
      identificadores.push(col)
      return
    }
    const primeiro = rows[0]?.[i] ?? ''
    const igual = rows.every((linha) => (linha[i] ?? '') === primeiro)
    if (igual) constantes.push(col)
    else informativas.push(col)
  })

  // Nada para promover: mantém-se a ordem do ficheiro, que é sempre a leitura mais fiel.
  if (informativas.length === 0 || informativas.length === columns.length) {
    return { columns, constantes: [], identificadores: [] }
  }

  return { columns: [...informativas, ...constantes, ...identificadores], constantes, identificadores }
}

export function typeLabelPt(t: 'str' | 'num' | 'date') {
  if (t === 'date') return 'Data'
  if (t === 'num') return 'Número'
  return 'Texto'
}

/** Número de linhas repetidas na amostra (conta as ocorrências a mais de cada duplicado). */
export function countDuplicateRows(rows: string[][]): number {
  const seen = new Map<string, number>()
  for (const row of rows) {
    const key = row.join('')
    seen.set(key, (seen.get(key) || 0) + 1)
  }
  let dup = 0
  Array.from(seen.values()).forEach((count) => {
    if (count > 1) dup += count - 1
  })
  return dup
}

/** Valores fora de Q1-1.5·IQR .. Q3+1.5·IQR numa coluna numérica da amostra. */
export function countOutliers(values: string[]): number {
  const nums = values
    .map((v) => Number.parseFloat(String(v).trim().replace(/\s/g, '').replace(',', '.')))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
  if (nums.length < 4) return 0
  const q1 = nums[Math.floor(nums.length * 0.25)]
  const q3 = nums[Math.floor(nums.length * 0.75)]
  const iqr = q3 - q1
  if (iqr === 0) return 0
  const lower = q1 - 1.5 * iqr
  const upper = q3 + 1.5 * iqr
  return nums.filter((n) => n < lower || n > upper).length
}

/** Nº de valores distintos não vazios numa coluna da amostra. */
export function distinctCount(values: string[]): number {
  const set = new Set(values.map((v) => v.trim()).filter(Boolean))
  return set.size
}

/** Intervalo min/max formatado de uma coluna, conforme o tipo inferido (numérica ou data). */
export function columnRange(values: string[], t: 'str' | 'num' | 'date'): { min: string; max: string } | null {
  if (t === 'num') {
    const nums = values
      .map((v) => Number.parseFloat(String(v).trim().replace(/\s/g, '').replace(',', '.')))
      .filter((n) => Number.isFinite(n))
    if (nums.length === 0) return null
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
    return { min: fmt(min), max: fmt(max) }
  }
  if (t === 'date') {
    const dates = values.map((v) => v.trim()).filter(Boolean).sort()
    if (dates.length === 0) return null
    return { min: dates[0], max: dates[dates.length - 1] }
  }
  return null
}

export type TrendInsight = {
  column: string
  dateColumn: string
  direction: 'up' | 'down' | 'flat'
  changePercent: number
}

/**
 * Detecta a melhor combinação data+número na amostra e resume a tendência comparando a média
 * do primeiro terço com a do último terço da série ordenada — mais robusto a ruído pontual do
 * que comparar apenas o primeiro e o último valor.
 */
export function detectTrend(preview: AlfTablePreview): TrendInsight | null {
  const { columns, rows } = preview
  if (rows.length < 6) return null

  const types = columns.map((_, i) => inferColumnType(rows.map((r) => r[i] ?? '')))
  const dateIdx = types.findIndex((t) => t === 'date')
  const numIdx = types.findIndex((t) => t === 'num')
  if (dateIdx === -1 || numIdx === -1) return null

  const parsed = rows
    .map((r) => ({
      date: r[dateIdx]?.trim() ?? '',
      value: Number.parseFloat(String(r[numIdx] ?? '').trim().replace(',', '.')),
    }))
    .filter((r) => r.date && Number.isFinite(r.value))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (parsed.length < 6) return null

  const third = Math.max(1, Math.floor(parsed.length / 3))
  const firstAvg = parsed.slice(0, third).reduce((s, r) => s + r.value, 0) / third
  const lastAvg = parsed.slice(-third).reduce((s, r) => s + r.value, 0) / third

  if (firstAvg === 0) return null

  const changePercent = Math.round(((lastAvg - firstAvg) / Math.abs(firstAvg)) * 1000) / 10
  const direction: TrendInsight['direction'] =
    Math.abs(changePercent) < 2 ? 'flat' : changePercent > 0 ? 'up' : 'down'

  return { column: columns[numIdx], dateColumn: columns[dateIdx], direction, changePercent }
}
