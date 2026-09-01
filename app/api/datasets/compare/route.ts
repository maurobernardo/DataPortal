export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { findDatasetsByIds } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ids = (searchParams.get('ids') || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))
    .slice(0, 3)

  if (ids.length === 0) {
    return NextResponse.json({ datasets: [] })
  }

  const datasets = await findDatasetsByIds(ids)
  return NextResponse.json({
    datasets: (datasets as any[]).map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category?.name ?? null,
      source: d.source,
      year: d.year,
      format: d.format,
      coverage: d.coverage,
      description: d.description,
      keywords: d.keywords,
      views: d.views,
      downloads: d.downloads,
    })),
  })
}
