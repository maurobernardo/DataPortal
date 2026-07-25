export type PolesRawBundle = {
  provs: string[]
  sts: string[]
  mats: string[]
  volts: string[]
  areas: string[]
  proxs: string[]
  techs: string[]
  rows: Array<
    [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      string,
      number,
      number,
    ]
  >
}

export type PoleRecord = {
  pid: number
  prov: string
  state: string
  mat: string
  volt: string | null
  lines: number
  area: string | null
  prox: string | null
  tech: string | null
  date: Date | null
  x: number
  y: number
  risk: number
  def: boolean
  ov: boolean
  hi: boolean
}

export type PolesSelection = {
  prov: Set<string>
  state: Set<string>
  mat: Set<string>
  volt: Set<string>
  lines: Set<number>
  flags: Set<string>
}

export const ACCENT = '#064E2C'
export const ACCENT_LIGHT = '#E7F3EB'
export const ACCENT_MUTED = '#1a3d2e'

export const CONDITION_COLOR: Record<string, string> = {
  Bom: '#16a34a',
  Inclinado: '#ca8a04',
  Danificado: '#ea580c',
  Partido: '#dc2626',
}

export const MATERIAL_COLOR: Record<string, string> = {
  Madeira: '#b45309',
  Betão: '#475569',
  Metal: '#0ea5e9',
}

export const fmt = (n: number) => (n ?? 0).toLocaleString('pt-PT')
export const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0)

export function emptySelection(): PolesSelection {
  return {
    prov: new Set(),
    state: new Set(),
    mat: new Set(),
    volt: new Set(),
    lines: new Set(),
    flags: new Set(),
  }
}

export function toggleSet<T>(set: Set<T>, val: T): Set<T> {
  const next = new Set(set)
  if (next.has(val)) next.delete(val)
  else next.add(val)
  return next
}

export function passesFilter(d: PoleRecord, sel: PolesSelection): boolean {
  if (sel.prov.size && !sel.prov.has(d.prov)) return false
  if (sel.state.size && !sel.state.has(d.state)) return false
  if (sel.mat.size && !sel.mat.has(d.mat)) return false
  if (sel.volt.size) {
    if (d.volt === null || !sel.volt.has(d.volt)) return false
  }
  if (sel.lines.size && !sel.lines.has(d.lines)) return false
  if (sel.flags.size) {
    if (sel.flags.has('def') && !d.def) return false
    if (sel.flags.has('ov') && !d.ov) return false
    if (sel.flags.has('wood') && d.mat !== 'Madeira') return false
  }
  return true
}

export function isAnySelected(sel: PolesSelection): boolean {
  return (
    sel.prov.size +
      sel.state.size +
      sel.mat.size +
      sel.volt.size +
      sel.lines.size +
      sel.flags.size >
    0
  )
}

export function decodePolesData(raw: PolesRawBundle): PoleRecord[] {
  const { provs, sts, mats, volts, areas, proxs, techs, rows } = raw
  return rows.map((r) => {
    const [pid, pi, si, mi, vi, lines, ai, xi, ti, date, x, y] = r
    const state = sts[si]
    const mat = mats[mi]
    const stateW = { Bom: 0, Inclinado: 2, Danificado: 3, Partido: 4 }[state] ?? 0
    const matW = mat === 'Madeira' ? 1 : 0
    const ovW = lines > 8 ? 2 : lines > 4 ? 1 : 0
    return {
      pid,
      prov: provs[pi],
      state,
      mat,
      volt: vi >= 0 ? volts[vi] : null,
      lines,
      area: ai >= 0 ? areas[ai] : null,
      prox: xi >= 0 ? proxs[xi] : null,
      tech: ti >= 0 ? techs[ti] : null,
      date: date ? new Date(date) : null,
      x,
      y,
      risk: stateW + matW + ovW,
      def: ['Inclinado', 'Danificado', 'Partido'].includes(state),
      ov: lines > 8,
      hi: lines > 4 && lines <= 8,
    }
  })
}

export type HotspotCell = {
  lonMin: number
  lonMax: number
  latMin: number
  latMax: number
  defects: number
  lines: number[]
  poles: PoleRecord[]
}

export function computeHotspots(data: PoleRecord[], grid = 0.01): HotspotCell[] {
  const cells = new Map<string, HotspotCell>()
  data.forEach((d) => {
    const cx = Math.floor(d.x / grid) * grid
    const cy = Math.floor(d.y / grid) * grid
    const key = `${cx}:${cy}`
    if (!cells.has(key)) {
      cells.set(key, {
        lonMin: cx,
        lonMax: cx + grid,
        latMin: cy,
        latMax: cy + grid,
        defects: 0,
        lines: [],
        poles: [],
      })
    }
    const c = cells.get(key)!
    if (d.def) c.defects++
    c.lines.push(d.lines)
    c.poles.push(d)
  })
  return Array.from(cells.values()).filter((c) => {
    const avg = c.lines.reduce((a, b) => a + b, 0) / c.lines.length
    return c.defects >= 5 && avg > 4
  })
}
