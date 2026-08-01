import { NextRequest, NextResponse } from 'next/server'
import { findAlphanumericDashboardById, incrementAlphanumericDashboardViews } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number.parseInt(params.id, 10)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const existing = await findAlphanumericDashboardById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Dashboard não encontrado' }, { status: 404 })
    }

    const updated = await incrementAlphanumericDashboardViews(id)
    return NextResponse.json({
      views: updated?.views ?? 0,
      message: 'Clique em «Ver mais» registado',
    })
  } catch (error) {
    logger.error('error_incrementing_dashboard_views', { error: error })
    return NextResponse.json({ error: 'Erro ao registar visualização' }, { status: 500 })
  }
}
