import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { findAllContactMessages, findAllMapRequests, findAllReportRequestsWithDetails } from '@/lib/db'
import { logger } from '@/lib/logger'

const VALID_TYPES = new Set(['report', 'map', 'contact'])

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const type = request.nextUrl.searchParams.get('type')
    if (!type || !VALID_TYPES.has(type)) {
      return NextResponse.json({ error: 'type inválido (report | map | contact)' }, { status: 400 })
    }

    if (type === 'report') {
      return NextResponse.json(await findAllReportRequestsWithDetails())
    }
    if (type === 'map') {
      return NextResponse.json(await findAllMapRequests())
    }
    return NextResponse.json(await findAllContactMessages())
  } catch (error) {
    logger.error('error_listing_admin_requests', { error })
    return NextResponse.json({ error: 'Erro ao carregar solicitações' }, { status: 500 })
  }
}
