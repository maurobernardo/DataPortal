const ADMIN_UNIT_PROPERTY_REGEX = /provin|distrit|posto|adm[123]?_?nm|adm[123]?_?name/i

const DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g')

function normalize(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS_REGEX, '')
}

export type GeoInsights = {
  featureCount: number
  geometryTypes: { type: string; count: number }[]
  centroid: [number, number] | null
  totalAreaKm2: number | null
  totalLengthKm: number | null
  crsWarning: boolean
  coverage: { property: string; values: string[]; total: number } | null
}

const EARTH_RADIUS_KM = 6371

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const [lon1, lat1] = a
  const [lon2, lat2] = b
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Área aproximada de um polígono (anel simples, lon/lat) por projecção equirectangular
 * centrada na latitude média do anel — precisão suficiente à escala nacional/regional. */
function ringAreaKm2(ring: [number, number][]): number {
  if (ring.length < 3) return 0
  const avgLat = ring.reduce((s, [, lat]) => s + lat, 0) / ring.length
  const kmPerDegLon = 111.32 * Math.cos(toRad(avgLat))
  const kmPerDegLat = 110.57
  let area = 0
  for (let i = 0; i < ring.length; i++) {
    const [lon1, lat1] = ring[i]
    const [lon2, lat2] = ring[(i + 1) % ring.length]
    const x1 = lon1 * kmPerDegLon
    const y1 = lat1 * kmPerDegLat
    const x2 = lon2 * kmPerDegLon
    const y2 = lat2 * kmPerDegLat
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area / 2)
}

function ringLengthKm(ring: [number, number][]): number {
  let total = 0
  for (let i = 0; i < ring.length - 1; i++) {
    total += haversineKm(ring[i], ring[i + 1])
  }
  return total
}

function bboxFromPoints(points: [number, number][]): [number, number, number, number] | null {
  if (points.length === 0) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return [minX, minY, maxX, maxY]
}

function bboxLooksLikeLonLat(bbox: [number, number, number, number] | null): boolean {
  if (!bbox) return false
  const [minX, minY, maxX, maxY] = bbox
  return (
    Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY) &&
    minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90
  )
}

function collectVertices(geometry: any, out: [number, number][]) {
  if (!geometry) return
  const { type, coordinates } = geometry
  if (type === 'Point') {
    if (Array.isArray(coordinates)) out.push([coordinates[0], coordinates[1]])
  } else if (type === 'MultiPoint' || type === 'LineString') {
    for (const c of coordinates || []) out.push([c[0], c[1]])
  } else if (type === 'MultiLineString' || type === 'Polygon') {
    for (const ring of coordinates || []) for (const c of ring) out.push([c[0], c[1]])
  } else if (type === 'MultiPolygon') {
    for (const poly of coordinates || []) for (const ring of poly) for (const c of ring) out.push([c[0], c[1]])
  }
}

/**
 * Detecta uma propriedade de unidade administrativa (província/distrito/posto) já presente
 * nas feições e devolve os valores únicos — evita ter de fazer point-in-polygon contra os
 * datasets de "Limites Administrativos" só para saber que unidades o dataset cobre.
 */
function detectCoverage(features: any[]): GeoInsights['coverage'] {
  if (features.length === 0) return null
  const sample = features[0]?.properties
  if (!sample || typeof sample !== 'object') return null

  const candidateKey = Object.keys(sample).find((k) => ADMIN_UNIT_PROPERTY_REGEX.test(normalize(k)))
  if (!candidateKey) return null

  const values = new Set<string>()
  for (const f of features) {
    const v = f?.properties?.[candidateKey]
    if (typeof v === 'string' && v.trim()) values.add(v.trim())
  }
  if (values.size === 0) return null

  return {
    property: candidateKey,
    values: Array.from(values).sort((a, b) => a.localeCompare(b)).slice(0, 12),
    total: values.size,
  }
}

export function computeGeoInsights(geojson: any): GeoInsights | null {
  const features: any[] = Array.isArray(geojson?.features) ? geojson.features : []
  if (features.length === 0) return null

  const geometryCounts = new Map<string, number>()
  let totalAreaKm2 = 0
  let hasArea = false
  let totalLengthKm = 0
  let hasLength = false
  const allVertices: [number, number][] = []

  for (const f of features) {
    const geom = f?.geometry
    if (!geom?.type) continue
    geometryCounts.set(geom.type, (geometryCounts.get(geom.type) || 0) + 1)
    collectVertices(geom, allVertices)

    if (geom.type === 'Polygon') {
      hasArea = true
      const [outer, ...holes] = geom.coordinates || []
      if (outer) totalAreaKm2 += ringAreaKm2(outer)
      for (const hole of holes) totalAreaKm2 -= ringAreaKm2(hole)
    } else if (geom.type === 'MultiPolygon') {
      hasArea = true
      for (const poly of geom.coordinates || []) {
        const [outer, ...holes] = poly
        if (outer) totalAreaKm2 += ringAreaKm2(outer)
        for (const hole of holes) totalAreaKm2 -= ringAreaKm2(hole)
      }
    } else if (geom.type === 'LineString') {
      hasLength = true
      totalLengthKm += ringLengthKm(geom.coordinates || [])
    } else if (geom.type === 'MultiLineString') {
      hasLength = true
      for (const line of geom.coordinates || []) totalLengthKm += ringLengthKm(line)
    }
  }

  const bbox = bboxFromPoints(allVertices)
  const crsWarning = allVertices.length > 0 && !bboxLooksLikeLonLat(bbox)

  let centroid: [number, number] | null = null
  if (bbox && !crsWarning) {
    centroid = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
  }

  return {
    featureCount: features.length,
    geometryTypes: Array.from(geometryCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    centroid,
    totalAreaKm2: hasArea && !crsWarning ? Math.round(totalAreaKm2 * 100) / 100 : null,
    totalLengthKm: hasLength && !crsWarning ? Math.round(totalLengthKm * 100) / 100 : null,
    crsWarning,
    coverage: detectCoverage(features),
  }
}
