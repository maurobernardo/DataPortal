import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import ExcelJS from 'exceljs'
import { inferColumnType } from '@/components/alf/alf-preview-utils'
import { fixEncodingText } from './geo-preview-interactive'

export type TablePreview = { type: 'table'; columns: string[]; rows: string[][]; delimiter: string }
export type GeoPreview = {
  type: 'geo'
  geojson: any
  bbox: [number, number, number, number] | null
  featureCount: number
}
export type NonePreview = { type: 'none' }
export type ErrorPreview = { error: string }
export type DatasetPreview = TablePreview | GeoPreview | NonePreview | ErrorPreview

type DatasetRow = {
  dataType: string
  filePath?: string | null
}

function sniffDelimiter(sampleLine: string) {
  const candidates = [',', ';', '\t', '|'] as const
  let best = ','
  let bestCount = -1
  for (const c of candidates) {
    const count = sampleLine.split(c).length
    if (count > bestCount) {
      bestCount = count
      best = c
    }
  }
  return best
}

function csvSplit(line: string, delimiter: string) {
  return line.split(delimiter).map((s) => s.trim().replace(/^"(.*)"$/, '$1'))
}

function computeBBoxFromGeoJSON(geojson: any): [number, number, number, number] | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  const visitCoords = (coords: any) => {
    if (!coords) return
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const x = coords[0], y = coords[1]
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      return
    }
    for (const c of coords) visitCoords(c)
  }

  const features = geojson?.type === 'FeatureCollection' ? geojson.features : []
  for (const f of features) visitCoords(f?.geometry?.coordinates)

  if (!Number.isFinite(minX)) return null
  return [minX, minY, maxX, maxY]
}

function bboxLooksLikeLonLat(bbox: [number, number, number, number] | null) {
  if (!bbox) return false
  const [minX, minY, maxX, maxY] = bbox
  return (
    Number.isFinite(minX) && Number.isFinite(minY) &&
    Number.isFinite(maxX) && Number.isFinite(maxY) &&
    minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90
  )
}

function parseTabular(raw: string, maxRows: number) {
  const lines = raw.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return { columns: [], rows: [], delimiter: ',' }
  const delimiter = sniffDelimiter(lines[0])
  const columns = csvSplit(lines[0], delimiter)
  const rows = lines.slice(1, maxRows + 1).map((l) => csvSplit(l, delimiter))
  return { columns, rows, delimiter }
}

function parseJsonTabular(raw: string, maxRows: number) {
  const parsed = JSON.parse(raw) as unknown
  let records: Record<string, unknown>[] = []

  if (Array.isArray(parsed)) {
    records = parsed.filter((r) => r && typeof r === 'object' && !Array.isArray(r)) as Record<string, unknown>[]
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    const candidate = obj.data ?? obj.records ?? obj.rows ?? obj.items ?? obj.results
    if (Array.isArray(candidate)) {
      records = candidate.filter((r) => r && typeof r === 'object' && !Array.isArray(r)) as Record<
        string,
        unknown
      >[]
    }
  }

  if (records.length === 0) return null

  const columns = Object.keys(records[0])
  if (columns.length === 0) return null

  const rows = records.slice(0, maxRows).map((row) =>
    columns.map((col) => {
      const v = row[col]
      if (v == null) return ''
      if (typeof v === 'object') return JSON.stringify(v)
      return String(v)
    })
  )

  return { columns, rows, delimiter: '' }
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return ''
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((r) => r.text).join('')
    if ('text' in value) return String((value as { text: unknown }).text)
    if ('result' in value) return String((value as { result: unknown }).result ?? '')
    if (value instanceof Date) return value.toISOString()
    return String(value)
  }
  return String(value)
}

/**
 * Quando o workbook tem várias folhas (ex.: uma folha "README"/capa seguida das folhas
 * de dados reais), a primeira folha nem sempre é a que interessa. Pontua cada folha pelo
 * volume de conteúdo tabular real (nº de colunas × linhas não vazias em sequência a partir
 * da linha 2) e escolhe a mais rica, mantendo a primeira folha como escolha por defeito.
 */
function pickBestWorksheet(worksheets: ExcelJS.Worksheet[]): ExcelJS.Worksheet | undefined {
  if (worksheets.length <= 1) return worksheets[0]

  let best = worksheets[0]
  let bestScore = -1
  for (const ws of worksheets) {
    if (!ws || ws.columnCount < 2) continue
    const colCount = Math.min(ws.columnCount, 20)
    let nonEmptyRows = 0
    const scanLimit = Math.min(ws.rowCount, 200)
    for (let r = 2; r <= scanLimit; r++) {
      const row = ws.getRow(r)
      let hasValue = false
      for (let c = 1; c <= colCount; c++) {
        const v = row.getCell(c).value
        if (v != null && v !== '') {
          hasValue = true
          break
        }
      }
      if (hasValue) nonEmptyRows++
      else break
    }
    const score = nonEmptyRows * colCount
    if (score > bestScore) {
      bestScore = score
      best = ws
    }
  }
  return best
}

async function parseExcel(buf: Buffer, maxRows: number) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buf as any)
  const worksheet = pickBestWorksheet(workbook.worksheets)
  if (!worksheet || worksheet.rowCount === 0) return { columns: [], rows: [], delimiter: '' }

  const colCount = worksheet.columnCount
  const headerRow = worksheet.getRow(1)
  const columns: string[] = []
  for (let c = 1; c <= colCount; c++) {
    const raw = cellToString(headerRow.getCell(c).value)
    columns.push(raw || `col_${c}`)
  }

  const rows: string[][] = []
  const lastRow = Math.min(worksheet.rowCount, maxRows + 1)
  for (let r = 2; r <= lastRow; r++) {
    const row = worksheet.getRow(r)
    const rowValues: string[] = []
    for (let c = 1; c <= colCount; c++) {
      rowValues.push(cellToString(row.getCell(c).value))
    }
    rows.push(rowValues)
  }

  return { columns, rows, delimiter: '' }
}

/**
 * Reproduz a lógica usada na pré-visualização da página de detalhe do dataset
 * (mesma extração de tabelas/GeoJSON), com limites de linhas/feições configuráveis
 * para reutilização noutros contextos (ex.: amostra para análise por IA).
 */
export async function getDatasetPreview(
  dataset: DatasetRow,
  opts: { maxRows?: number; maxFeatures?: number } = {}
): Promise<DatasetPreview> {
  const maxRows = opts.maxRows ?? 50
  const maxFeatures = opts.maxFeatures ?? 500

  if (!dataset.filePath) {
    return { error: 'Arquivo indisponível' }
  }

  const absPath = join(process.cwd(), 'public', dataset.filePath)
  if (!existsSync(absPath)) {
    return { error: 'Arquivo não encontrado no servidor' }
  }

  const lower = String(dataset.filePath).toLowerCase()
  const isTabular = dataset.dataType === 'alfanumerico'
  const isGeo = dataset.dataType === 'geoespacial'

  if (isTabular) {
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.ods')) {
      const buf = await readFile(absPath)
      try {
        const { columns, rows, delimiter } = await parseExcel(buf, maxRows)
        return { type: 'table', columns, rows, delimiter }
      } catch {
        // Formatos legados (.xls binário, .ods) não são suportados pelo parser actual.
        return { error: 'Pré-visualização não disponível para este formato de ficheiro.' }
      }
    }

    if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) {
      const raw = await readFile(absPath, 'utf8')
      const { columns, rows, delimiter } = parseTabular(raw, maxRows)
      return { type: 'table', columns, rows, delimiter }
    }

    if (lower.endsWith('.json')) {
      try {
        const raw = await readFile(absPath, 'utf8')
        const parsed = parseJsonTabular(raw, maxRows)
        if (parsed && parsed.columns.length > 0) {
          return { type: 'table', ...parsed }
        }
      } catch {
        /* não é JSON tabular */
      }
    }

    try {
      const raw = await readFile(absPath, 'utf8')
      const { columns, rows, delimiter } = parseTabular(raw, maxRows)
      if (columns.length > 0) {
        return { type: 'table', columns, rows, delimiter }
      }
    } catch {
      // binário não legível
    }

    return { error: 'Formato não suportado para pré-visualização. Faça o download para abrir.' }
  }

  if (isGeo && (lower.endsWith('.geojson') || lower.endsWith('.json'))) {
    const raw = await readFile(absPath, 'utf8')
    const geojson = JSON.parse(raw)
    const features = geojson?.type === 'FeatureCollection' ? geojson.features : []
    const clipped = { ...geojson, features: features.slice(0, maxFeatures) }
    const rawBbox = computeBBoxFromGeoJSON(clipped)
    const bbox = bboxLooksLikeLonLat(rawBbox) ? rawBbox : null
    return { type: 'geo', geojson: clipped, bbox, featureCount: features.length }
  }

  if (isGeo && lower.endsWith('.zip')) {
    const buf = await readFile(absPath)
    const g = globalThis as any
    if (!g.self) g.self = g

    // Alguns utilizadores metem um .geojson dentro do .zip (em vez de shapefile) — verifica-se
    // isso primeiro, senão o shpjs falha silenciosamente à procura de .shp/.dbf.
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(buf)
    const geojsonEntry = Object.values(zip.files).find(
      (f: any) => !f.dir && /\.(geojson|json)$/i.test(f.name)
    ) as any
    if (geojsonEntry) {
      const raw = await geojsonEntry.async('string')
      const geojson = JSON.parse(raw)
      const features = geojson?.type === 'FeatureCollection' ? geojson.features : []
      const clipped = { ...geojson, features: features.slice(0, maxFeatures) }
      const rawBbox = computeBBoxFromGeoJSON(clipped)
      const bbox = bboxLooksLikeLonLat(rawBbox) ? rawBbox : null
      return { type: 'geo', geojson: clipped, bbox, featureCount: features.length }
    }

    const shpModule = await import('shpjs')
    const shp = (shpModule as any).default || shpModule
    const geojson = await shp(buf)
    const featureCollection = Array.isArray(geojson)
      ? { type: 'FeatureCollection', features: geojson.flatMap((g: any) => g?.features || []) }
      : geojson
    const features = featureCollection?.type === 'FeatureCollection' ? featureCollection.features : []
    // shpjs lê o .dbf sem respeitar sempre o .cpg (codepage) do shapefile: nomes com acentos
    // chegam como "Sa??de" em vez de "Saúde". Corrige-se aqui, uma única vez à entrada, para que
    // tudo o que consome este preview (mapa, motor de análise) receba texto já limpo — em vez de
    // cada consumidor ter de repetir a mesma correcção.
    const featuresCorrigidas = features.slice(0, maxFeatures).map((f: any) => ({
      ...f,
      properties: Object.fromEntries(
        Object.entries(f?.properties || {}).map(([k, v]) => [k, typeof v === 'string' ? fixEncodingText(v) : v])
      ),
    }))
    const clipped = { ...featureCollection, features: featuresCorrigidas }
    const rawBbox = computeBBoxFromGeoJSON(clipped)
    const bbox = bboxLooksLikeLonLat(rawBbox) ? rawBbox : null
    return { type: 'geo', geojson: clipped, bbox, featureCount: features.length }
  }

  if (isGeo && (lower.endsWith('.kml') || lower.endsWith('.gpx'))) {
    return { error: 'Pré-visualização de KML/GPX não suportada. Faça o download para visualizar.' }
  }

  if (isGeo && (lower.endsWith('.tif') || lower.endsWith('.tiff'))) {
    return { error: 'Pré-visualização de raster (TIFF) não suportada. Faça o download para visualizar num SIG.' }
  }

  return { type: 'none' }
}

/**
 * Amostra tabular (colunas + linhas) para consumo por IA. Para datasets geoespaciais,
 * a "tabela" é derivada dos atributos (properties) de cada feição.
 */
export async function getDatasetTableSample(
  dataset: DatasetRow,
  maxRows = 150
): Promise<{ columns: string[]; rows: string[][] } | null> {
  const preview = await getDatasetPreview(dataset, { maxRows, maxFeatures: maxRows })

  if ('type' in preview && preview.type === 'table') {
    return { columns: preview.columns, rows: preview.rows }
  }

  if ('type' in preview && preview.type === 'geo') {
    const features: any[] = Array.isArray(preview.geojson?.features) ? preview.geojson.features : []
    if (features.length === 0) return null

    const columnSet = new Set<string>()
    for (const f of features.slice(0, maxRows)) {
      Object.keys(f?.properties || {}).forEach((k) => columnSet.add(k))
    }
    const columns: string[] = Array.from(columnSet)
    if (columns.length === 0) return null

    const rows: string[][] = features.slice(0, maxRows).map((f: any) =>
      columns.map((col: string) => {
        const v = f?.properties?.[col]
        if (v == null) return ''
        if (typeof v === 'object') return JSON.stringify(v)
        return String(v)
      })
    )
    return { columns, rows }
  }

  return null
}

export type GeoThumbnail = { type: 'geo'; bbox: [number, number, number, number]; paths: [number, number][][] }
export type AlfSeriesThumbnail = { type: 'alf-series'; column: string; values: number[] }
export type AlfDistThumbnail = { type: 'alf-dist'; str: number; num: number; date: number }
export type NoneThumbnail = { type: 'none' }
export type DatasetThumbnail = GeoThumbnail | AlfSeriesThumbnail | AlfDistThumbnail | NoneThumbnail | ErrorPreview

function decimateRing(ring: [number, number][], maxPoints = 40): [number, number][] {
  if (!Array.isArray(ring) || ring.length <= maxPoints) return ring
  const stride = Math.ceil(ring.length / maxPoints)
  const out: [number, number][] = []
  for (let i = 0; i < ring.length; i += stride) out.push(ring[i])
  return out
}

function extractThumbnailPaths(geometry: any, maxPointsPerRing = 40): [number, number][][] {
  if (!geometry) return []
  const { type, coordinates } = geometry
  const paths: [number, number][][] = []
  if (type === 'Point' && Array.isArray(coordinates)) {
    paths.push([coordinates as [number, number]])
  } else if (type === 'MultiPoint' || type === 'LineString') {
    paths.push(decimateRing(coordinates, maxPointsPerRing))
  } else if (type === 'MultiLineString' || type === 'Polygon') {
    for (const ring of coordinates) paths.push(decimateRing(ring, maxPointsPerRing))
  } else if (type === 'MultiPolygon') {
    for (const poly of coordinates) for (const ring of poly) paths.push(decimateRing(ring, maxPointsPerRing))
  }
  return paths
}

/**
 * Miniatura leve para os cartões do catálogo — reutiliza getDatasetPreview com limites
 * apertados (poucas feições / linhas) para manter o custo baixo mesmo com várias dezenas
 * de cartões visíveis ao mesmo tempo.
 */
export async function getDatasetThumbnailData(dataset: DatasetRow): Promise<DatasetThumbnail> {
  const preview = await getDatasetPreview(dataset, { maxRows: 50, maxFeatures: 15 })

  if ('error' in preview) return { error: preview.error }

  if (preview.type === 'geo') {
    if (!preview.bbox) return { type: 'none' }
    const features: any[] = Array.isArray(preview.geojson?.features) ? preview.geojson.features : []
    const paths: [number, number][][] = []
    for (const f of features.slice(0, 15)) {
      paths.push(...extractThumbnailPaths(f?.geometry))
      if (paths.length > 60) break
    }
    return { type: 'geo', bbox: preview.bbox, paths: paths.slice(0, 60) }
  }

  if (preview.type === 'table') {
    for (let i = 0; i < preview.columns.length; i++) {
      const values = preview.rows.map((r) => r[i] ?? '')
      if (inferColumnType(values) === 'num') {
        const nums = values
          .map((v) => Number.parseFloat(String(v).replace(',', '.')))
          .filter((n) => Number.isFinite(n))
        if (nums.length >= 3) {
          return { type: 'alf-series', column: preview.columns[i], values: nums.slice(0, 30) }
        }
      }
    }
    let str = 0, num = 0, date = 0
    for (let i = 0; i < preview.columns.length; i++) {
      const t = inferColumnType(preview.rows.map((r) => r[i] ?? ''))
      if (t === 'str') str++
      else if (t === 'num') num++
      else date++
    }
    if (str + num + date === 0) return { type: 'none' }
    return { type: 'alf-dist', str, num, date }
  }

  return { type: 'none' }
}
