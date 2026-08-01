import { NextResponse } from 'next/server'
import { checkDatabaseHealth } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = await checkDatabaseHealth()

  return NextResponse.json(
    {
      status: db.ok ? 'ok' : 'degraded',
      database: db.ok ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    },
    { status: db.ok ? 200 : 503 }
  )
}
