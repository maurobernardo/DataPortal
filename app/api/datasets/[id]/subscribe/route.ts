export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  findDatasetById,
  isSubscribedToDatasetUpdates,
  subscribeToDatasetUpdates,
  unsubscribeFromDatasetUpdates,
} from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
    }
    const datasetId = Number.parseInt(params.id, 10)
    if (!Number.isFinite(datasetId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    const subscribed = await isSubscribedToDatasetUpdates(session.userId, datasetId)
    return NextResponse.json({ subscribed })
  } catch (error) {
    logger.error('get_dataset_subscription_error', { error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
    }
    const datasetId = Number.parseInt(params.id, 10)
    if (!Number.isFinite(datasetId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    const dataset = await findDatasetById(datasetId)
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset não encontrado' }, { status: 404 })
    }
    await subscribeToDatasetUpdates(session.userId, datasetId)
    return NextResponse.json({ subscribed: true })
  } catch (error) {
    logger.error('subscribe_dataset_updates_error', { error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
    }
    const datasetId = Number.parseInt(params.id, 10)
    if (!Number.isFinite(datasetId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    await unsubscribeFromDatasetUpdates(session.userId, datasetId)
    return NextResponse.json({ subscribed: false })
  } catch (error) {
    logger.error('unsubscribe_dataset_updates_error', { error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}