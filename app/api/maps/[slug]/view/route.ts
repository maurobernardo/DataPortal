import { NextRequest, NextResponse } from 'next/server'
import { findMapBySlug } from '@/lib/maps-catalog'
import { getCurrentUser } from '@/lib/auth'
import { recordMapStat } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function POST(_request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const map = findMapBySlug(params.slug)
    if (!map) {
      return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 })
    }

    const session = await getCurrentUser()
    await recordMapStat(params.slug, 'view', session?.userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('error_recording_map_view', { error })
    return NextResponse.json({ error: 'Erro ao registar visualização' }, { status: 500 })
  }
}
