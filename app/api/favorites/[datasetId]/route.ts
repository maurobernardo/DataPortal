import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { addDatasetFavorite, findDatasetById, removeDatasetFavorite } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function POST(_request: NextRequest, { params }: { params: { datasetId: string } }) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    const datasetId = Number.parseInt(params.datasetId, 10)
    if (!Number.isFinite(datasetId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const dataset = await findDatasetById(datasetId)
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset não encontrado' }, { status: 404 })
    }

    await addDatasetFavorite(session.userId, datasetId)
    return NextResponse.json({ favorited: true })
  } catch (error) {
    logger.error('error_adding_favorite', { error })
    return NextResponse.json({ error: 'Erro ao adicionar favorito' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { datasetId: string } }) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    const datasetId = Number.parseInt(params.datasetId, 10)
    if (!Number.isFinite(datasetId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await removeDatasetFavorite(session.userId, datasetId)
    return NextResponse.json({ favorited: false })
  } catch (error) {
    logger.error('error_removing_favorite', { error })
    return NextResponse.json({ error: 'Erro ao remover favorito' }, { status: 500 })
  }
}
