export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { processarLote } from '@/lib/qualidade/detectar-anomalias'

/**
 * Detecção periódica de anomalias dentro de cada dataset alfanumérico (ver detectar-anomalias.ts).
 * Mesmo desenho e mesmo CRON_SECRET dos outros crons do portal:
 *   POST /api/cron/anomalias?token=CRON_SECRET&datasets=5
 */
async function correr(req: NextRequest) {
  const segredoConfigurado = process.env.CRON_SECRET?.trim()
  if (!segredoConfigurado) {
    return NextResponse.json({ error: 'CRON_SECRET não está configurado' }, { status: 500 })
  }
  const fornecido = req.nextUrl.searchParams.get('token') || req.headers.get('x-cron-secret')
  if (fornecido !== segredoConfigurado) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const datasets = Math.min(15, Math.max(1, Number(req.nextUrl.searchParams.get('datasets') || 5)))
  const resultados = await processarLote(datasets)

  return NextResponse.json({
    datasets_processados: resultados.length,
    resultados,
  })
}

export async function GET(req: NextRequest) {
  return correr(req)
}

export async function POST(req: NextRequest) {
  return correr(req)
}
