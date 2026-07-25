export type MalariaProvince = {
  province: string
  region: string
  lat: number
  lon: number
  tile_x: number
  tile_y: number
  v2015: number
  v2018: number
  n2015: number
  n2018: number
  delta: number
  relative_change: number
  risk_2018: string
  source_2015: string
  source_2018: string
}

export type MalariaNationalPoint = {
  geography: string
  year: number
  value: number
  source: string
}

export type MalariaBundle = {
  provinces: MalariaProvince[]
  national: MalariaNationalPoint[]
}

export type MalariaMode = 'change' | 'level'

export const fmtPct = (v: number) => `${Number(v).toFixed(1)}%`

export const fmtPp = (v: number) => `${v > 0 ? '+' : ''}${Number(v).toFixed(1)} pp`

export function colorLevel(v: number): string {
  if (v >= 50) return '#b92f2a'
  if (v >= 40) return '#d86b32'
  if (v >= 20) return '#e2a13a'
  return '#2c9c72'
}

export function colorChange(v: number): string {
  if (v >= 20) return '#b92f2a'
  if (v >= 5) return '#d86b32'
  if (v > -5) return '#8b98a6'
  return '#2c9c72'
}

export function activeColor(d: MalariaProvince, mode: MalariaMode): string {
  return mode === 'change' ? colorChange(d.delta) : colorLevel(d.v2018)
}

export function computeKpis(provinces: MalariaProvince[], national: MalariaNationalPoint[]) {
  const n2018 = national.find((d) => d.year === 2018)?.value ?? 39
  const by2018 = provinces.slice().sort((a, b) => b.v2018 - a.v2018)[0]
  const byInc = provinces.slice().sort((a, b) => b.delta - a.delta)[0]
  const byDec = provinces.slice().sort((a, b) => a.delta - b.delta)[0]
  return {
    national2018: n2018,
    highest2018: by2018,
    largestIncrease: byInc,
    largestDecline: byDec,
  }
}
