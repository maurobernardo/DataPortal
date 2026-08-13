export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { findFavoriteDatasetIds } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ ids: [] })
    }

    const ids = await findFavoriteDatasetIds(session.userId)
    return NextResponse.json({ ids })
  } catch (error) {
    logger.error('error_listing_favorite_ids', { error })
    return NextResponse.json({ ids: [] })
  }
}