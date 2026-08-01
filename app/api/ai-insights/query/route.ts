import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { findDatasetById, logAiInsightQuery } from '@/lib/db'
import { getDatasetTableSample } from '@/lib/dataset-preview'
import { hasAnthropicConfig } from '@/lib/ai'
import {
  AiValidationError,
  analyzeDatasets,
  type ConversationTurn,
  type DatasetContext,
} from '@/lib/ai-insights'
import { resolveChoroplethBoundary } from '@/lib/ai-choropleth'
import { normalizeText } from '@/lib/security'
import { logger } from '@/lib/logger'

const MAX_DATASETS = 3
const MAX_QUESTION_LENGTH = 500
const SAMPLE_ROWS = 150
const MAX_HISTORY_TURNS = 3

function parseHistory(raw: unknown): ConversationTurn[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(-MAX_HISTORY_TURNS)
    .map((entry) => ({
      question: normalizeText((entry as any)?.question, MAX_QUESTION_LENGTH),
      narrative: normalizeText((entry as any)?.narrative, 2000),
    }))
    .filter((t) => t.question && t.narrative)
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
    }

    if (!hasAnthropicConfig()) {
      return NextResponse.json(
        { error: 'Serviço de IA não configurado. Contacte o administrador.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const question = normalizeText(body?.question, MAX_QUESTION_LENGTH)
    const rawIds: unknown[] = Array.isArray(body?.dataset_ids) ? body.dataset_ids : []
    const datasetIds = Array.from(
      new Set(
        rawIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    )
    const history = parseHistory(body?.history)

    if (!question) {
      return NextResponse.json({ error: 'Pergunta é obrigatória' }, { status: 400 })
    }
    if (datasetIds.length === 0) {
      return NextResponse.json({ error: 'Seleccione pelo menos um dataset' }, { status: 400 })
    }
    if (datasetIds.length > MAX_DATASETS) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_DATASETS} datasets por consulta` },
        { status: 400 }
      )
    }

    const datasets = await Promise.all(datasetIds.map((id) => findDatasetById(id)))
    if (datasets.some((d) => !d)) {
      return NextResponse.json({ error: 'Um ou mais datasets não foram encontrados' }, { status: 404 })
    }

    const contexts: DatasetContext[] = await Promise.all(
      datasets.map(async (dataset) => {
        const d = dataset!
        const sample = await getDatasetTableSample(d, SAMPLE_ROWS)
        return {
          id: d.id,
          title: d.title,
          source: d.source ?? null,
          year: d.year ?? null,
          category: d.category?.name ?? null,
          dataType: d.dataType ?? null,
          geometry: d.geometry ?? null,
          coverage: d.coverage ?? null,
          sample,
        }
      })
    )

    const result = await analyzeDatasets(question, contexts, history)

    try {
      await logAiInsightQuery({
        userId: session.userId,
        question,
        datasetIds,
      })
    } catch (logError) {
      logger.error('ai_insight_usage_log_error', { error: logError })
    }

    const sources = contexts.map((c) => ({
      id: c.id,
      title: c.title,
      source: c.source,
      year: c.year,
    }))

    let mapPayload: (typeof result)['map'] & {
      geojson?: any
      nameProperty?: string
      boundaryDatasetTitle?: string
    } = result.map as any

    if (result.map) {
      try {
        const boundary = await resolveChoroplethBoundary(result.map.unit_type, datasetIds)
        if (boundary) {
          mapPayload = {
            ...result.map,
            geojson: boundary.geojson,
            nameProperty: boundary.nameProperty,
            boundaryDatasetTitle: boundary.datasetTitle,
          }
        }
      } catch (mapError) {
        logger.error('choropleth_boundary_resolution_error', { error: mapError })
      }
    }

    return NextResponse.json({ ...result, map: mapPayload, sources })
  } catch (error) {
    if (error instanceof AiValidationError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    logger.error('ai_insights_query_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
