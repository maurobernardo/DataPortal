export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { enviarResumoSemanalNovidades } from '@/lib/notifications'
import { logger } from '@/lib/logger'

/**
 * Resumo semanal de novidades para utilizadores normais (ver enviarResumoSemanalNovidades em
 * lib/notifications.ts): pensado para ser chamado UMA VEZ POR SEMANA por um cron job do cPanel.
 * Mesmo desenho e mesmo CRON_SECRET dos outros crons do portal:
 *   POST /api/cron/resumo-semanal?token=CRON_SECRET
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

  try {
    await enviarResumoSemanalNovidades()
    return NextResponse.json({ enviado: true })
  } catch (error) {
    logger.error('cron.resumo_semanal.falhou', { error })
    return NextResponse.json({ error: 'Falha ao enviar o resumo semanal' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return correr(req)
}

export async function POST(req: NextRequest) {
  return correr(req)
}
