import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { findEntityFavoriteIds, type EntityType } from '@/lib/db'
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
      return NextResponse.json({ ids: [] })
    }

    const ids = await findEntityFavoriteIds(session.userId, entityType)
    return NextResponse.json({ ids })
  } catch (error) {
    logger.error('error_listing_entity_favorite_ids', { error })
    return NextResponse.json({ ids: [] })
  }
}
