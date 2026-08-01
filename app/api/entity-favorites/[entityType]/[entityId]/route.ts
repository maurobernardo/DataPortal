import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { addEntityFavorite, removeEntityFavorite, type EntityType } from '@/lib/db'
import { logger } from '@/lib/logger'

const VALID_TYPES = new Set(['dashboard', 'report', 'map'])

function parseParams(params: { entityType: string; entityId: string }) {
  if (!VALID_TYPES.has(params.entityType)) return null
  const entityId = decodeURIComponent(params.entityId).trim()
  if (!entityId) return null
  return { entityType: params.entityType as EntityType, entityId }
}

export async function POST(_request: NextRequest, { params }: { params: { entityType: string; entityId: string } }) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    const parsed = parseParams(params)
    if (!parsed) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    await addEntityFavorite(session.userId, parsed.entityType, parsed.entityId)
    return NextResponse.json({ favorited: true })
  } catch (error) {
    logger.error('error_adding_entity_favorite', { error })
    return NextResponse.json({ error: 'Erro ao adicionar favorito' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { entityType: string; entityId: string } }) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    const parsed = parseParams(params)
    if (!parsed) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    await removeEntityFavorite(session.userId, parsed.entityType, parsed.entityId)
    return NextResponse.json({ favorited: false })
  } catch (error) {
    logger.error('error_removing_entity_favorite', { error })
    return NextResponse.json({ error: 'Erro ao remover favorito' }, { status: 500 })
  }
}
