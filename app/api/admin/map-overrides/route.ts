import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { findAllMapOverrides } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }
    return NextResponse.json(await findAllMapOverrides())
  } catch (error) {
    logger.error('error_listing_map_overrides', { error })
    return NextResponse.json({ error: 'Erro ao carregar sobreposições de mapas' }, { status: 500 })
  }
}
