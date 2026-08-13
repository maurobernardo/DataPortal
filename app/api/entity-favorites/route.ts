export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { findEntityFavorites, type EntityType } from '@/lib/db'
import { logger } from '@/lib/logger'

const VALID_TYPES = new Set(['dashboard', 'report', 'map'])

export async function GET(request: NextRequest) {
  try {
    const entityType = request.nextUrl.searchParams.get('entityType') as EntityType | null
    if (!entityType || !VALID_TYPES.has(entityType)) {
      return NextResponse.json({ error: 'entityType inválido' }, { status: 400 })
    }

    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    const items = await findEntityFavorites(session.userId, entityType)
    return NextResponse.json(items)
  } catch (error) {
    logger.error('error_listing_entity_favorites', { error })
    return NextResponse.json({ error: 'Erro ao carregar favoritos' }, { status: 500 })
  }
}