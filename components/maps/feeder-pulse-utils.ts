export type RiskTier = 'Extreme' | 'High' | 'Moderate' | 'Low'

export type FeederRecord = {
  feeder_id: string
  feeder_name: string
  substation_id: string
  substation_name: string
  voltage_kv: number
  region: string
  province: string
  district: string
  length_km: number
  num_customers: number
  transformer_count: number
  installation_year: number
  status: 'active' | 'maintenance'
  cyclone_risk_score: number
  lat: number
  lon: number
  age_years: number
  customers_per_km: number
  transformer_load_avg: number
  risk_tier: RiskTier
  vintage: string
  priority_score: number
}

export type FeederProvince = {
  province: string
  feeders: number
  customers: number
  avg_age: number
  avg_risk: number
  transformers: number
  length: number
}

export type FeederTotals = {
  feeders: number
  customers: number
  transformers: number
  length_km: number
  provinces: number
  avg_risk: number
  avg_age: number
  customers_high_risk: number
  customers_legacy: number
  maintenance_count: number
  extreme_risk_feeders: number
}

export type FeederPulseBundle = {
  feeders: FeederRecord[]
  provinces: FeederProvince[]
  totals: FeederTotals
}

export const RISK_COLORS: Record<RiskTier, string> = {
  Extreme: '#C62828',
  High: '#E86F2C',
  Moderate: '#FBC02D',
  Low: '#2E7D32',
}

export const RISK_PILL_CLASS: Record<RiskTier, string> = {
  Extreme: 'fp-pill-extreme',
  High: 'fp-pill-high',
  Moderate: 'fp-pill-moderate',
  Low: 'fp-pill-low',
}

export const CAPEX_BY_RISK: Record<RiskTier, number> = {
  Extreme: 22,
  High: 14,
  Moderate: 9,
  Low: 5,
}

export function provBarColor(avgRisk: number): string {
  if (avgRisk >= 7) return RISK_COLORS.Extreme
  if (avgRisk >= 5) return RISK_COLORS.High
  if (avgRisk >= 3) return RISK_COLORS.Moderate
  return RISK_COLORS.Low
}

export function markerRadius(customers: number): number {
  return Math.min(6 + Math.sqrt(customers) / 8, 26)
}

export function fmtNum(n: number, decimals = 0, suffix = ''): string {
  return (
    n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + suffix
  )
}
