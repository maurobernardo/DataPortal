export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getMapViewCounts } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const counts = await getMapViewCounts()
    return NextResponse.json(counts, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    })
  } catch (error) {
    logger.error('error_fetching_map_view_counts', { error })
    return NextResponse.json({})
  }
}