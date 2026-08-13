export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { findDatasetById } from '@/lib/db'
import { getDatasetPreview } from '@/lib/dataset-preview'
import { logger } from '@/lib/logger'

/**
 * Endpoint estável de GeoJSON completo (sem o limite de 500 feições da pré-visualização),
 * pensado para ser usado diretamente em QGIS/ArcGIS ("adicionar camada a partir de URL").
 * Não é um servidor WFS — apenas devolve o ficheiro convertido para GeoJSON.
 */
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

    if (dataset.dataType !== 'geoespacial') {
      return NextResponse.json({ error: 'Apenas disponível para datasets geoespaciais' }, { status: 400 })
    }

    const preview = await getDatasetPreview(dataset, { maxFeatures: 1_000_000 })
    if (!('type' in preview) || preview.type !== 'geo') {
      const error = 'error' in preview ? preview.error : 'Sem geometria disponível para este dataset'
      return NextResponse.json({ error }, { status: 404 })
    }

    const fileName = `${String(dataset.title).replace(/[^a-zA-Z0-9.-]/g, '_')}.geojson`
    return new NextResponse(JSON.stringify(preview.geojson), {
      headers: {
        'Content-Type': 'application/geo+json',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=600, stale-while-revalidate=1800',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    logger.error('error_exporting_dataset_geojson', { error })
    return NextResponse.json({ error: 'Erro ao gerar GeoJSON' }, { status: 500 })
  }
}
