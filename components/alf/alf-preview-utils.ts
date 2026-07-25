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

export function typeLabelPt(t: 'str' | 'num' | 'date') {
  if (t === 'date') return 'Data'
  if (t === 'num') return 'Número'
  return 'Texto'
}
