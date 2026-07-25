export type GeoFeature = {
  type: string
  geometry?: { type: string; coordinates: unknown }
  properties?: Record<string, unknown>
}

export type FieldMeta = {
  key: string
  label: string
  kind: 'numeric' | 'string'
  adminRole?: 'provincia' | 'distrito' | 'posto' | 'categoria'
  min: number
  max: number
  unit: string
  higherIsWorse: boolean
  description: string
  categories?: string[]
}

export type BaseMapKind = 'osm' | 'topo' | 'dark' | 'sat'

export type GeometryKind = 'point' | 'line' | 'polygon' | 'other'

const SKIP_KEYS = new Set([
  'id',
  'fid',
  'objectid',
  'object_id',
  'gid',
  'uuid',
  'shape_length',
  'shape_area',
  'shape_leng',
  'shape_le_1',
  'globalid',
  'ogc_fid',
])

/** Paleta para categorias (unidades sanitárias, tipos, etc.) */
export const CATEGORY_PALETTE = [
  '#dc2626',
  '#ea580c',
  '#f59e0b',
  '#2563eb',
  '#7c3aed',
  '#059669',
  '#0891b2',
  '#be185d',
  '#0d9488',
  '#4f46e5',
] as const

const FACILITY_COLOR_RULES: Array<{ test: RegExp; color: string }> = [
  { test: /hospital|hp\b|referência|referencia/i, color: '#dc2626' },
  { test: /maternidade/i, color: '#be185d' },
  { test: /centro.*sa[uú]de|csr|health\s*cent/i, color: '#ea580c' },
  { test: /posto.*sa[uú]de|posto de sa[uú]de/i, color: '#2563eb' },
  { test: /clínica|clinica|clinic/i, color: '#7c3aed' },
  { test: /laborat|lab\b/i, color: '#0891b2' },
  { test: /farmácia|farmacia|pharm/i, color: '#059669' },
  { test: /privad/i, color: '#f59e0b' },
  { test: /público|publico|estatal|governo/i, color: '#064E2C' },
]

const PT_LABELS: Record<string, string> = {
  province: 'Província',
  provincia: 'Província',
  província: 'Província',
  prov: 'Província',
  adm1: 'Província (ADM1)',
  name_1: 'Província',
  nome_provincia: 'Província',
  provincia_nome: 'Província',
  distrito: 'Distrito',
  district: 'Distrito',
  adm2: 'Distrito (ADM2)',
  name_2: 'Distrito',
  nome_distrito: 'Distrito',
  distrito_nome: 'Distrito',
  municipio: 'Município',
  município: 'Município',
  post_name: 'Nome do estabelecimento',
  posto: 'Posto administrativo',
  adm3: 'Posto (ADM3)',
  name_3: 'Posto administrativo',
  post_name_adm3: 'Posto administrativo',
  unidade: 'Unidade',
  us_nome: 'Unidade sanitária',
  health_unit: 'Unidade sanitária',
  facility_name: 'Estabelecimento',
  nome: 'Nome',
  name: 'Nome',
  pop_2017: 'População (2017)',
  population: 'População',
  pop: 'População',
  area_km2: 'Área (km²)',
  urban_class: 'Classe urbana',
  tipo: 'Tipo',
  type: 'Tipo',
  geometry: 'Geometria',
  country: 'País',
  país: 'País',
  admin1: 'Província',
  admin2: 'Distrito',
  admin3: 'Posto administrativo',
  ownership: 'Propriedade',
  owner: 'Propriedade',
  lat: 'Latitude',
  long: 'Longitude',
  lon: 'Longitude',
  lng: 'Longitude',
  ll_source: 'Fonte das coordenadas',
  latitude: 'Latitude',
  longitude: 'Longitude',
  facility: 'Estabelecimento',
  facility_type: 'Tipo de estabelecimento',
  facilitytype: 'Tipo de estabelecimento',
  level: 'Nível',
  nivel: 'Nível',
  fid: 'Identificador',
  aerodrome: 'Aeródromo',
  aerodromo: 'Aeródromo',
  airport: 'Aeroporto',
  aeroporto: 'Aeroporto',
  icao: 'Código ICAO',
  iata: 'Código IATA',
  runway: 'Pista',
  operator: 'Operador',
  status: 'Estado',
  elev: 'Elevação',
  elevation: 'Elevação',
  description: 'Descrição',
  desc: 'Descrição',
  notes: 'Notas',
  remark: 'Observações',
  code: 'Código',
  area: 'Área',
  length: 'Comprimento',
  perimeter: 'Perímetro',
  value: 'Valor',
  count: 'Contagem',
  total: 'Total',
  year: 'Ano',
  date: 'Data',
  region: 'Região',
  state: 'Estado',
  city: 'Cidade',
  town: 'Localidade',
  village: 'Aldeia',
  class: 'Classe',
  category: 'Categoria',
  layer: 'Camada',
  elev_ft: 'Elevação (pés)',
  elev_m: 'Elevação (m)',
  country_code: 'Código do país',
  iso: 'Código ISO',
  name_en: 'Nome (inglês)',
  name_pt: 'Nome (português)',
  feature: 'Elemento',
  features: 'Elementos',
  objectid_1: 'Identificador',
  management: 'Gestão',
  pa_nome: 'Nome da área protegida',
  'pa nome': 'Nome da área protegida',
  camada: 'Camada',
  pop_cntry: 'População do país',
  pop_country: 'População do país',
  pop_cntry_: 'População do país',
  cntry: 'País',
  country_name: 'Nome do país',
  viajantest: 'Viajantes',
  viajantes: 'Viajantes',
  travelers: 'Viajantes',
  traveller: 'Viajante',
  continent: 'Continente',
  subregion: 'Sub-região',
  sub_region: 'Sub-região',
  gdp: 'PIB',
  gdp_cap: 'PIB per capita',
  gdp_pc: 'PIB per capita',
}

const EN_KEY_WORDS: Record<string, string> = {
  name: 'Nome',
  type: 'Tipo',
  class: 'Classe',
  code: 'Código',
  area: 'Área',
  length: 'Comprimento',
  width: 'Largura',
  height: 'Altura',
  level: 'Nível',
  status: 'Estado',
  date: 'Data',
  year: 'Ano',
  count: 'Quantidade',
  total: 'Total',
  min: 'Mínimo',
  max: 'Máximo',
  avg: 'Média',
  mean: 'Média',
  sum: 'Soma',
  id: 'Identificador',
  desc: 'Descrição',
  lat: 'Latitude',
  lon: 'Longitude',
  long: 'Longitude',
  country: 'País',
  cntry: 'País',
  region: 'Região',
  district: 'Distrito',
  province: 'Província',
  owner: 'Proprietário',
  source: 'Fonte',
  pop: 'População',
  population: 'População',
  viajante: 'Viajante',
  viajantes: 'Viajantes',
  test: 'Teste',
  continent: 'Continente',
  subregion: 'Sub-região',
}

const ADMIN_ROLE_PATTERNS: Array<{ role: FieldMeta['adminRole']; label: string; test: RegExp }> = [
  {
    role: 'provincia',
    label: 'Província',
    test: /^(prov(incia|íncia)?(_nome|_name)?|province|adm1|name_1|nome_prov|prov_nome|regiao|região)$/i,
  },
  {
    role: 'distrito',
    label: 'Distrito',
    test: /^(dist(rito)?(_nome|_name)?|district|adm2|name_2|municipio|município|concelho)$/i,
  },
  {
    role: 'posto',
    label: 'Posto administrativo',
    test: /^(adm3|name_3|posto_admin|posto_adm|posto_distrital)$/i,
  },
  { role: 'categoria', label: 'Categoria', test: /^(tipo|type|class|categoria|classe|layer|camada)$/i },
]

/** Estilo “destaque verde” — visível em todos os mapas base (como o preview simples). */
export const HIGHLIGHT_STYLES: Record<
  BaseMapKind,
  { stroke: string; fill: string; weight: number; fillOpacity: number; lineOpacity: number }
> = {
  osm: { stroke: '#064E2C', fill: '#064E2C', weight: 2.5, fillOpacity: 0.28, lineOpacity: 0.98 },
  topo: { stroke: '#04361F', fill: '#064E2C', weight: 2.8, fillOpacity: 0.32, lineOpacity: 0.98 },
  dark: { stroke: '#B8E6C8', fill: '#22c55e', weight: 3, fillOpacity: 0.42, lineOpacity: 1 },
  sat: { stroke: '#ffffff', fill: '#064E2C', weight: 3, fillOpacity: 0.38, lineOpacity: 1 },
}

function isSkippableKey(key: string) {
  const k = key.toLowerCase()
  if (SKIP_KEYS.has(k)) return true
  if (k.endsWith('_id') || k.startsWith('id_')) return true
  return false
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function inferAdminRole(key: string): FieldMeta['adminRole'] | undefined {
  const k = key.toLowerCase()
  for (const p of ADMIN_ROLE_PATTERNS) {
    if (p.test.test(k) || p.test.test(k.replace(/[\s-]/g, '_'))) return p.role
  }
  if (/^post_name$/i.test(k) || /facility|estabelec|us_nome|health_unit|nome_unidade/i.test(k)) return undefined
  if (/prov/i.test(k) && !/improv/i.test(k)) return 'provincia'
  if (/dist/i.test(k) || /municip/i.test(k)) return 'distrito'
  if (/^adm3$|^name_3$/i.test(k)) return 'posto'
  return undefined
}

export function labelFromKey(key: string) {
  const lower = key.toLowerCase().trim().replace(/\s+/g, '_')
  if (PT_LABELS[lower]) return PT_LABELS[lower]
  const admin = ADMIN_ROLE_PATTERNS.find((p) => p.role && inferAdminRole(key) === p.role)
  if (admin) return admin.label

  const normalized = key
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/__/g, '_')
    .toLowerCase()
  if (PT_LABELS[normalized]) return PT_LABELS[normalized]

  const parts = normalized.split(/[_\s-]+/).filter(Boolean)
  if (parts.length > 0 && parts.every((p) => EN_KEY_WORDS[p])) {
    return parts.map((p) => EN_KEY_WORDS[p]).join(' ')
  }

  const words = parts.map((w) => {
    return (
      EN_KEY_WORDS[w] ||
      (w.length <= 3 && /^[a-z]+$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
    )
  })
  return words.join(' ') || key
}

function guessHigherIsWorse(key: string) {
  const k = key.toLowerCase()
  if (/(taxa|stress|deficit|gap|burden|risk|failure|mortality|teci|hssi|ghad|chvi|ohzrp|imss|sdcfr|pdbrs)/.test(k))
    return true
  if (/(score|indice|index|readiness|efficiency|cascade|completion|confidence|resilience|uai|hccr|hser|rfhn|ddhri)/.test(k))
    return false
  return true
}

export function isValidLonLat(lng: number, lat: number) {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

function visitCoords(coords: unknown, visit: (lng: number, lat: number) => void) {
  if (!coords) return
  if (typeof (coords as number[])[0] === 'number' && typeof (coords as number[])[1] === 'number') {
    const [lng, lat] = coords as [number, number]
    visit(lng, lat)
    return
  }
  if (Array.isArray(coords)) {
    for (const c of coords) visitCoords(c, visit)
  }
}

export function featureHasValidGeometry(feature: GeoFeature): boolean {
  const geom = feature.geometry
  if (!geom?.coordinates) return false
  let valid = false
  visitCoords(geom.coordinates, (lng, lat) => {
    if (isValidLonLat(lng, lat)) valid = true
  })
  return valid
}

export function sanitizeBbox(
  bbox: [number, number, number, number] | null | undefined
): [number, number, number, number] | null {
  if (!bbox || bbox.length < 4) return null
  const [minX, minY, maxX, maxY] = bbox
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null
  if (!isValidLonLat(minX, minY) || !isValidLonLat(maxX, maxY)) return null
  if (minX > maxX || minY > maxY) return null
  const lngSpan = maxX - minX
  const latSpan = maxY - minY
  if (lngSpan > 360 || latSpan > 180) return null
  return [minX, minY, maxX, maxY]
}

export function normalizeGeoJSON(input: unknown): GeoFeature[] {
  if (!input || typeof input !== 'object') return []
  const g = input as { type?: string; features?: GeoFeature[] }
  let list: GeoFeature[] = []
  if (g.type === 'FeatureCollection' && Array.isArray(g.features)) list = g.features
  else if (g.type === 'Feature') list = [g as GeoFeature]
  return list.filter(featureHasValidGeometry)
}

export function getGeometryKind(feature: GeoFeature): GeometryKind {
  const t = feature.geometry?.type || ''
  if (t === 'Point' || t === 'MultiPoint') return 'point'
  if (t === 'LineString' || t === 'MultiLineString') return 'line'
  if (t === 'Polygon' || t === 'MultiPolygon') return 'polygon'
  return 'other'
}

export function analyzeGeometryMix(features: GeoFeature[]) {
  const counts = { point: 0, line: 0, polygon: 0, other: 0 }
  for (const f of features) counts[getGeometryKind(f)] += 1
  return counts
}

export function analyzeGeoFields(features: GeoFeature[]): FieldMeta[] {
  const numericStats = new Map<string, { min: number; max: number; count: number }>()
  const stringValues = new Map<string, Set<string>>()

  for (const f of features) {
    const props = f.properties || {}
    for (const [key, raw] of Object.entries(props)) {
      if (isSkippableKey(key)) continue
      const num = toNumber(raw)
      if (num !== null) {
        const cur = numericStats.get(key)
        if (!cur) numericStats.set(key, { min: num, max: num, count: 1 })
        else {
          cur.min = Math.min(cur.min, num)
          cur.max = Math.max(cur.max, num)
          cur.count += 1
        }
      } else if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
        if (!stringValues.has(key)) stringValues.set(key, new Set())
        stringValues.get(key)!.add(String(raw).trim())
      }
    }
  }

  const numericFields: FieldMeta[] = []
  for (const [key, stats] of Array.from(numericStats.entries())) {
    if (stats.count < 2 || stats.min === stats.max) continue
    numericFields.push({
      key,
      label: labelFromKey(key),
      kind: 'numeric',
      min: stats.min,
      max: stats.max,
      unit: '',
      higherIsWorse: guessHigherIsWorse(key),
      description: `Intervalo de ${stats.min.toLocaleString('pt-BR')} a ${stats.max.toLocaleString('pt-BR')}`,
    })
  }
  numericFields.sort((a, b) => b.max - b.min - (a.max - a.min))

  const stringFields: FieldMeta[] = []
  for (const [key, set] of Array.from(stringValues.entries())) {
    const cats = Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    const role = inferAdminRole(key)
    const maxCats = role ? 250 : 50
    if (cats.length < 2 || cats.length > maxCats) continue
    stringFields.push({
      key,
      label: labelFromKey(key),
      kind: 'string',
      adminRole: role,
      min: 0,
      max: 0,
      unit: '',
      higherIsWorse: false,
      description: `${cats.length} valores distintos`,
      categories: cats,
    })
  }

  stringFields.sort((a, b) => {
    const order = { provincia: 0, distrito: 1, posto: 2, categoria: 3 } as const
    const ar = a.adminRole ? order[a.adminRole] ?? 9 : 9
    const br = b.adminRole ? order[b.adminRole] ?? 9 : 9
    if (ar !== br) return ar - br
    return (a.categories?.length || 0) - (b.categories?.length || 0)
  })

  return [...numericFields, ...stringFields]
}

export function detectAdminFilters(fields: FieldMeta[]) {
  const stringFields = fields.filter((f) => f.kind === 'string' && f.categories?.length)
  const provincia =
    stringFields.find((f) => f.adminRole === 'provincia') ||
    stringFields.find((f) => /^(province|admin1|name_1)$/i.test(f.key))
  const distrito =
    stringFields.find((f) => f.adminRole === 'distrito') ||
    stringFields.find((f) => /^(district|admin2|name_2)$/i.test(f.key))
  const posto = stringFields.find((f) => f.adminRole === 'posto')
  return { provincia, distrito, posto }
}

export function detectCategoryField(fields: FieldMeta[]): FieldMeta | undefined {
  const prefer = [
    'facility_type',
    'facilitytype',
    'tipo',
    'type',
    'class',
    'categoria',
    'ownership',
    'level',
    'nivel',
    'urban_class',
  ]
  for (const key of prefer) {
    const f = fields.find(
      (x) =>
        x.key.toLowerCase() === key &&
        x.kind === 'string' &&
        x.categories &&
        x.categories.length >= 2 &&
        x.categories.length <= 30
    )
    if (f) return f
  }
  const byRole = fields.find(
    (f) =>
      f.adminRole === 'categoria' &&
      f.categories &&
      f.categories.length >= 2 &&
      f.categories.length <= 30
  )
  if (byRole) return byRole

  const stringFields = fields.filter(
    (f) => f.kind === 'string' && f.categories && f.categories.length >= 2 && f.categories.length <= 30
  )
  let best: FieldMeta | undefined
  let bestScore = 0
  for (const f of stringFields) {
    const score = (f.categories || []).filter((c) =>
      FACILITY_COLOR_RULES.some((r) => r.test.test(fixEncodingText(c)))
    ).length
    if (score > bestScore) {
      bestScore = score
      best = f
    }
  }
  return bestScore > 0 ? best : stringFields.find((f) => /tipo|type|class|level|owner/i.test(f.key))
}

function latin1BytesToUtf8(s: string): string {
  try {
    const bytes = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(0) & 0xff
    const decoded = new TextDecoder('utf-8').decode(bytes)
    if (decoded && !decoded.includes('\uFFFD')) return decoded
  } catch {
    /* ignore */
  }
  return s
}

export function fixEncodingText(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s = String(value)
  if (/[ÃÂ]/.test(s) || /[\u0080-\u00bf]/.test(s)) {
    const attempt = latin1BytesToUtf8(s)
    if (attempt.length > 0) s = attempt
  }
  const pairs: Array<[RegExp, string]> = [
    [/Sa\?\?de/gi, 'Saúde'],
    [/sa\?\?de/gi, 'saúde'],
    [/aer\?¬dromo/gi, 'aeródromo'],
    [/Aer\?¬dromo/g, 'Aeródromo'],
    [/aer\?¬porto/gi, 'aeroporto'],
    [/Aer\?¬porto/g, 'Aeroporto'],
    [/\?\¬a/gi, 'ía'],
    [/\?\¬/g, 'í'],
    [/¬a/gi, 'ía'],
    [/¬/g, ''],
    [/\u00ac/g, ''],
    [/\ufffd/g, ''],
    [/Ãº/g, 'ú'],
    [/Ã¡/g, 'á'],
    [/Ã§/g, 'ç'],
    [/Ã£/g, 'ã'],
    [/Ãµ/g, 'õ'],
    [/Ã©/g, 'é'],
    [/Ã­/g, 'í'],
    [/Ã³/g, 'ó'],
    [/Ã¢/g, 'â'],
    [/Ãª/g, 'ê'],
    [/Ã´/g, 'ô'],
    [/Ã /g, 'à'],
  ]
  for (const [re, rep] of pairs) s = s.replace(re, rep)
  return s.trim()
}

export function colorForCategoryValue(value: string): string {
  const v = fixEncodingText(value)
  if (!v) return '#94a3b8'
  for (const rule of FACILITY_COLOR_RULES) {
    if (rule.test.test(v)) return rule.color
  }
  let h = 0
  for (let i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) >>> 0
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length]
}

const PROPERTY_DISPLAY_PRIORITY = [
  'name',
  'nome',
  'title',
  'titulo',
  'post_name',
  'facility',
  'country',
  'admin1',
  'admin2',
  'admin3',
  'province',
  'provincia',
  'district',
  'distrito',
  'tipo',
  'type',
  'ownership',
  'lat',
  'long',
  'lon',
  'latitude',
  'longitude',
  'll_source',
]

export function orderedFeatureProperties(feature: GeoFeature, limit = 20) {
  const props = feature.properties || {}
  const entries = Object.entries(props).filter(([k]) => !k.startsWith('_') && !isSkippableKey(k))
  const used = new Set<string>()
  const ordered: Array<[string, unknown]> = []

  const push = ([k, v]: [string, unknown]) => {
    const lk = k.toLowerCase()
    if (used.has(lk)) return
    used.add(lk)
    ordered.push([k, v])
  }

  for (const key of PROPERTY_DISPLAY_PRIORITY) {
    const hit = entries.find(([k]) => k.toLowerCase() === key)
    if (hit) push(hit)
  }
  for (const e of entries) push(e)
  return ordered.slice(0, limit)
}

export function getFeatureValue(feature: GeoFeature, key: string): number | null {
  return toNumber(feature.properties?.[key])
}

export function getFeatureProperty(feature: GeoFeature, key: string): string {
  const v = feature.properties?.[key]
  if (v === null || v === undefined) return ''
  return fixEncodingText(v)
}

export function lerpColor(a: string, b: string, t: number) {
  const ah = parseInt(a.replace('#', ''), 16)
  const bh = parseInt(b.replace('#', ''), 16)
  const ar = (ah >> 16) & 255
  const ag = (ah >> 8) & 255
  const ab = ah & 255
  const br = (bh >> 16) & 255
  const bg = (bh >> 8) & 255
  const bb = bh & 255
  const rr = Math.round(ar + (br - ar) * t)
  const rg = Math.round(ag + (bg - ag) * t)
  const rb = Math.round(ab + (bb - ab) * t)
  return `#${[rr, rg, rb].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

export function colorForValue(
  value: number | null,
  meta: Pick<FieldMeta, 'min' | 'max' | 'higherIsWorse'>
) {
  if (value === null || !Number.isFinite(value)) return '#94a3b8'
  const t = Math.max(0, Math.min(1, (value - meta.min) / (meta.max - meta.min || 1)))
  if (meta.higherIsWorse) return lerpColor('#22c55e', '#dc2626', t)
  return lerpColor('#dc2626', '#22c55e', t)
}

export function getPathStyle(
  baseMap: BaseMapKind,
  geometry: GeometryKind,
  options: { choroplethColor?: string | null; categoryColor?: string | null; highlight?: boolean }
) {
  const hs = HIGHLIGHT_STYLES[baseMap]
  const color = options.choroplethColor || options.categoryColor || hs.fill
  const dataColor = options.choroplethColor || options.categoryColor
  const stroke =
    dataColor && baseMap === 'sat' ? '#ffffff' : dataColor ? dataColor : hs.stroke

  if (geometry === 'line') {
    return {
      color: dataColor || hs.stroke,
      weight: baseMap === 'sat' ? 3 : 2.5,
      opacity: hs.lineOpacity,
      fill: false as const,
      fillOpacity: 0,
    }
  }

  if (geometry === 'polygon') {
    return {
      color: stroke,
      weight: hs.weight,
      opacity: hs.lineOpacity,
      fillColor: color,
      fillOpacity: dataColor ? 0.58 : hs.fillOpacity,
    }
  }

  return {
    color: stroke,
    weight: hs.weight,
    opacity: hs.lineOpacity,
    fillColor: color,
    fillOpacity: dataColor ? 0.65 : hs.fillOpacity,
  }
}

export function formatValue(value: unknown, unit = '') {
  const n = toNumber(value)
  if (n === null) {
    if (value === null || value === undefined) return '—'
    const text = fixEncodingText(value)
    return text || '—'
  }
  const text = Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  return unit ? `${text}${unit}` : text
}

export function featureSearchText(feature: GeoFeature) {
  const props = feature.properties || {}
  return Object.values(props)
    .map((v) => String(v ?? ''))
    .join(' ')
    .toLowerCase()
}

export function featureTitle(feature: GeoFeature) {
  const p = feature.properties || {}
  const candidates = [
    'nome',
    'name',
    'title',
    'titulo',
    'post_name',
    'district',
    'distrito',
    'province',
    'provincia',
    'província',
    'label',
    'descricao',
    'descrição',
  ]
  for (const key of candidates) {
    for (const [k, v] of Object.entries(p)) {
      if (k.toLowerCase() === key && v !== null && v !== undefined && String(v).trim())
        return fixEncodingText(v)
    }
  }
  const first = Object.entries(p).find(([, v]) => typeof v === 'string' && String(v).trim().length > 0)
  return first ? fixEncodingText(first[1]) : 'Elemento geográfico'
}

export function pointRadiusFromPop(pop: number | null, equalSize: boolean) {
  if (equalSize || pop === null) return 8
  if (pop > 500_000) return 18
  if (pop > 200_000) return 14
  if (pop > 100_000) return 11
  if (pop > 50_000) return 8
  return 6
}

export function detectPopulationKey(fields: FieldMeta[]) {
  const keys = ['pop_2017', 'population', 'pop', 'populacao', 'população']
  for (const k of keys) {
    if (fields.some((f) => f.key === k && f.kind === 'numeric')) return k
  }
  return fields.find((f) => f.kind === 'numeric' && /pop/i.test(f.key))?.key
}

export function geometryLabelPt(kind: GeometryKind) {
  if (kind === 'point') return 'Pontos'
  if (kind === 'line') return 'Linhas'
  if (kind === 'polygon') return 'Polígonos'
  return 'Outros'
}
