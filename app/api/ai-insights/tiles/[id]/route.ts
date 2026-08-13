export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { deleteAiInsightTile, findAiInsightTileById } from '@/lib/db'
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

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
    }

    const id = Number.parseInt(params.id, 10)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const tile = await findAiInsightTileById(id, session.userId)
    if (!tile) {
      return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ tile: serializeTile(tile) })
  } catch (error) {
    logger.error('get_ai_insight_tile_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
    }

    const id = Number.parseInt(params.id, 10)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await deleteAiInsightTile(id, session.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('delete_ai_insight_tile_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}