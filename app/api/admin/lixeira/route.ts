import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { listarLixeiraDatasets } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
  }

  const datasets = await listarLixeiraDatasets()
  return NextResponse.json({ datasets })
}
