import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAiInsightTile, findAiInsightTilesByUser } from '@/lib/db'
import { normalizeText } from '@/lib/security'
import { logger } from '@/lib/logger'

function serializeTile(row: any) {
  let datasetIds: number[] = []
  let result: unknown = null
  try {
    datasetIds = JSON.parse(row.datasetIds)
  } catch {
    datasetIds = []
  }
  try {
    result = JSON.parse(row.resultJson)
  } catch {
    result = null
  }
  return {
    id: row.id,
    title: row.title,
    question: row.question,
    datasetIds,
    result,
    shareToken: row.shareToken,
    createdAt: row.createdAt,
  }
}

export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
    }

    const rows = await findAiInsightTilesByUser(session.userId)
    return NextResponse.json({ tiles: rows.map(serializeTile) })
  } catch (error) {
    logger.error('list_ai_insight_tiles_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
    }

    const body = await request.json()
    const title = normalizeText(body?.title, 150) || 'Análise sem título'
    const question = normalizeText(body?.question, 500)
    const datasetIds: unknown[] = Array.isArray(body?.dataset_ids) ? body.dataset_ids : []
    const result = body?.result

    if (!question || !result || typeof result !== 'object') {
      return NextResponse.json({ error: 'Dados insuficientes para guardar a análise' }, { status: 400 })
    }

    // O "map" pode trazer um GeoJSON de fronteiras administrativas embutido (para o render
    // interactivo em directo) que pode ultrapassar o limite de pacote do MySQL. Ao guardar,
    // mantemos apenas unit_type/values — o componente de mapa já tem um fallback em lista
    // ordenada quando não há geojson, por isso a análise guardada continua utilizável.
    const resultRecord = result as Record<string, unknown>
    const map = resultRecord.map as Record<string, unknown> | null | undefined
    const sanitizedResult =
      map && typeof map === 'object'
        ? { ...resultRecord, map: { unit_type: map.unit_type, values: map.values } }
        : resultRecord

    const tile = await createAiInsightTile({
      userId: session.userId,
      title,
      question,
      datasetIds: datasetIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)),
      result: sanitizedResult,
    })

    return NextResponse.json({ tile: tile ? serializeTile(tile) : null })
  } catch (error) {
    logger.error('create_ai_insight_tile_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
