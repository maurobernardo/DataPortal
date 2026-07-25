export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { findDatasetById } from '@/lib/db'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx')

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

function parseTabular(raw: string) {
  const lines = raw.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return { columns: [], rows: [], delimiter: ',' }
  const delimiter = sniffDelimiter(lines[0])
  const columns = csvSplit(lines[0], delimiter)
  const rows = lines.slice(1, 51).map((l) => csvSplit(l, delimiter))
  return { columns, rows, delimiter }
}

function parseJsonTabular(raw: string) {
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

  const rows = records.slice(0, 50).map((row) =>
    columns.map((col) => {
      const v = row[col]
      if (v == null) return ''
      if (typeof v === 'object') return JSON.stringify(v)
      return String(v)
    })
  )

  return { columns, rows, delimiter: '' }
}

function parseExcel(buf: Buffer) {
  const workbook = XLSX.read(buf, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (data.length === 0) return { columns: [], rows: [], delimiter: '' }

  const columns = (data[0] as any[]).map((c: any, i: number) =>
    String(c || `col_${i + 1}`)
  )
  const rows = data.slice(1, 51).map((row: any[]) =>
    columns.map((_: any, i: number) => String(row[i] ?? ''))
  )
  return { columns, rows, delimiter: '' }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const datasetId = Number.parseInt(params.id, 10)
    if (!Number.isFinite(datasetId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const dataset = await findDatasetById(datasetId)
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset não encontrado' }, { status: 404 })
    }

    if (!dataset.filePath) {
      return NextResponse.json({ error: 'Arquivo indisponível' }, { status: 404 })
    }

    const absPath = join(process.cwd(), 'public', dataset.filePath)
    if (!existsSync(absPath)) {
      return NextResponse.json({ error: 'Arquivo não encontrado no servidor' }, { status: 404 })
    }

    const lower = String(dataset.filePath).toLowerCase()
    const isTabular = dataset.dataType === 'alfanumerico'
    const isGeo = dataset.dataType === 'geoespacial'

    // ── TABULAR ──────────────────────────────────────────────────────────────

    if (isTabular) {

      // Excel .xlsx / .xls
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const buf = await readFile(absPath)
        const { columns, rows, delimiter } = parseExcel(buf)
        return NextResponse.json({ type: 'table', columns, rows, delimiter })
      }

      // CSV / TSV / TXT
      if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) {
        const raw = await readFile(absPath, 'utf8')
        const { columns, rows, delimiter } = parseTabular(raw)
        return NextResponse.json({ type: 'table', columns, rows, delimiter })
      }

      // ODS
      if (lower.endsWith('.ods')) {
        const buf = await readFile(absPath)
        const { columns, rows, delimiter } = parseExcel(buf)
        return NextResponse.json({ type: 'table', columns, rows, delimiter })
      }

      // JSON (array de objetos ou wrapper com data/records/rows)
      if (lower.endsWith('.json')) {
        try {
          const raw = await readFile(absPath, 'utf8')
          const parsed = parseJsonTabular(raw)
          if (parsed && parsed.columns.length > 0) {
            return NextResponse.json({ type: 'table', ...parsed })
          }
        } catch {
          /* não é JSON tabular */
        }
      }

      // Fallback — tenta ler como texto
      try {
        const raw = await readFile(absPath, 'utf8')
        const { columns, rows, delimiter } = parseTabular(raw)
        if (columns.length > 0) {
          return NextResponse.json({ type: 'table', columns, rows, delimiter })
        }
      } catch {
        // binário não legível
      }

      return NextResponse.json({
        error: 'Formato não suportado para pré-visualização. Faça o download para abrir.',
      })
    }

    // ── GEO: GeoJSON ──────────────────────────────────────────────────────────

    if (isGeo && (lower.endsWith('.geojson') || lower.endsWith('.json'))) {
      const raw = await readFile(absPath, 'utf8')
      const geojson = JSON.parse(raw)
      const features = geojson?.type === 'FeatureCollection' ? geojson.features : []
      const clipped = { ...geojson, features: features.slice(0, 500) }
      const rawBbox = computeBBoxFromGeoJSON(clipped)
      const bbox = bboxLooksLikeLonLat(rawBbox) ? rawBbox : null
      return NextResponse.json({ type: 'geo', geojson: clipped, bbox, featureCount: features.length })
    }

    // ── GEO: Shapefile ZIP ────────────────────────────────────────────────────

    if (isGeo && lower.endsWith('.zip')) {
      const buf = await readFile(absPath)
      // shpjs depende de `self` em alguns builds; no Node precisamos apontar para globalThis
      const g = globalThis as any
      if (!g.self) g.self = g
      const shpModule = await import('shpjs')
      const shp = (shpModule as any).default || shpModule
      const geojson = await shp(buf)
      const featureCollection = Array.isArray(geojson)
        ? { type: 'FeatureCollection', features: geojson.flatMap((g: any) => g?.features || []) }
        : geojson
      const features = featureCollection?.type === 'FeatureCollection' ? featureCollection.features : []
      const clipped = { ...featureCollection, features: features.slice(0, 500) }
      const rawBbox = computeBBoxFromGeoJSON(clipped)
      const bbox = bboxLooksLikeLonLat(rawBbox) ? rawBbox : null
      return NextResponse.json({ type: 'geo', geojson: clipped, bbox, featureCount: features.length })
    }

    // ── GEO: KML / GPX ───────────────────────────────────────────────────────

    if (isGeo && (lower.endsWith('.kml') || lower.endsWith('.gpx'))) {
      return NextResponse.json({
        error: 'Pré-visualização de KML/GPX não suportada. Faça o download para visualizar.',
      })
    }

    return NextResponse.json({ type: 'none' })

  } catch (error: any) {
    console.error('Error generating dataset preview:', error)
    return NextResponse.json({ error: 'Erro ao gerar pré-visualização' }, { status: 500 })
  }
}