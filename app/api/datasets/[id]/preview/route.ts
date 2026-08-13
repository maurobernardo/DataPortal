export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { findDatasetById, setDatasetPreviewMeta } from '@/lib/db'
import { getDatasetPreview } from '@/lib/dataset-preview'
import { computeGeoInsights } from '@/lib/geo-intelligence'
import { registarAcesso } from '@/lib/origem'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const datasetId = Number.parseInt(params.id, 10)
    if (!Number.isFinite(datasetId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const dataset = await findDatasetById(datasetId)
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset não encontrado' }, { status: 404 })
    }

    const preview = await getDatasetPreview(dataset)
    registarAcesso(request, 'vista_dataset', { referenciaId: datasetId }).catch(() => {})

    // Backfill preguiçoso do badge/bbox em cache. Reavalia sempre que a flag ainda não existe OU
    // está marcada como indisponível mas a geração acabou de funcionar agora — um "não disponível"
    // registado antes já não pode ser corrigido de outra forma, um "disponível" nunca regride.
    const available = 'type' in preview && (preview.type === 'table' || preview.type === 'geo')
    if (dataset.previewAvailable == null || (dataset.previewAvailable == false && available)) {
      const bbox = 'type' in preview && preview.type === 'geo' ? preview.bbox : null
      setDatasetPreviewMeta(datasetId, { previewAvailable: available, bbox }).catch((error) => {
        logger.error('error_backfilling_preview_meta', { error, datasetId })
      })
    }

    const responseBody =
      'type' in preview && preview.type === 'geo'
        ? { ...preview, insights: computeGeoInsights(preview.geojson) }
        : preview

    return NextResponse.json(responseBody, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' },
    })
  } catch (error) {
    logger.error('error_generating_dataset_preview', { error: error })
    return NextResponse.json({ error: 'Erro ao gerar pré-visualização' }, { status: 500 })
  }
}
