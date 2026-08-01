export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { findDatasetById } from '@/lib/db'
import { getDatasetThumbnailData } from '@/lib/dataset-preview'
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

    const thumbnail = await getDatasetThumbnailData(dataset)
    return NextResponse.json(thumbnail, {
      headers: { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=1800' },
    })
  } catch (error) {
    logger.error('error_generating_dataset_thumbnail', { error })
    return NextResponse.json({ error: 'Erro ao gerar miniatura' }, { status: 500 })
  }
}
