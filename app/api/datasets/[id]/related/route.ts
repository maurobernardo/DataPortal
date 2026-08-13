export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { findDatasetById, findRelatedDatasets } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const datasetId = Number.parseInt(params.id, 10)
    if (!Number.isFinite(datasetId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const dataset = await findDatasetById(datasetId)
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset não encontrado' }, { status: 404 })
    }

    const related = await findRelatedDatasets(dataset)

    return NextResponse.json(
      { related },
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' } }
    )
  } catch (error) {
    logger.error('error_finding_related_datasets', { error })
    return NextResponse.json({ error: 'Erro ao procurar datasets relacionados' }, { status: 500 })
  }
}