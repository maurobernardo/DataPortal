export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { processarLote } from '@/lib/relatorios/verificacao-periodica'

/**
 * Repete periodicamente as verificações de relatórios já feitas manualmente uma vez (ver
 * verificacao-periodica.ts) — apanha quando o dataset de referência muda depois de o relatório já
 * ter sido validado. Mesmo desenho e mesmo CRON_SECRET dos outros crons do portal:
 *   POST /api/cron/verificacao-relatorios?token=CRON_SECRET&relatorios=5
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

  const relatorios = Math.min(15, Math.max(1, Number(req.nextUrl.searchParams.get('relatorios') || 5)))
  const resultados = await processarLote(relatorios)

  return NextResponse.json({
    relatorios_processados: resultados.length,
    resultados,
  })
}

export async function GET(req: NextRequest) {
  return correr(req)
}

export async function POST(req: NextRequest) {
  return correr(req)
}
