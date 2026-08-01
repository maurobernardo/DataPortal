import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { findFavoriteDatasets } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    const datasets = await findFavoriteDatasets(session.userId)
    return NextResponse.json(datasets)
  } catch (error) {
    logger.error('error_listing_favorites', { error })
    return NextResponse.json({ error: 'Erro ao carregar favoritos' }, { status: 500 })
  }
}
