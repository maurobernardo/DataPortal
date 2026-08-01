import { NextResponse } from 'next/server'
import { findAiInsightTileByShareToken } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  try {
    const row = await findAiInsightTileByShareToken(params.token)
    if (!row) {
      return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
    }

    let result: unknown = null
    try {
      result = JSON.parse(row.resultJson)
    } catch {
      result = null
    }

    return NextResponse.json({
      title: row.title,
      question: row.question,
      result,
      createdAt: row.createdAt,
    })
  } catch (error) {
    logger.error('shared_ai_insight_tile_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
