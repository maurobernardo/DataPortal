export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { processarLote } from '@/lib/qualidade/detectar-contradicoes'

/**
 * Detecção periódica de contradições entre datasets do catálogo (ver detectar-contradicoes.ts).
 *
 * Mesmo desenho e mesmo CRON_SECRET dos outros crons do portal (ver analises-vivas):
 *   POST /api/cron/contradicoes?token=CRON_SECRET&pares=5
 *
 * Um lote pequeno por chamada — comparar duas tabelas inteiras (agregação por unidade
 * administrativa, para cada coluna candidata) não é grátis, e encadear dezenas de pares numa só
 * invocação é a forma certa de bater no limite de tempo a meio e perder o registo de onde ficou.
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

  const pares = Math.min(10, Math.max(1, Number(req.nextUrl.searchParams.get('pares') || 3)))
  const resultados = await processarLote(pares)

  return NextResponse.json({
    pares_processados: resultados.length,
    resultados,
  })
}

export async function GET(req: NextRequest) {
  return correr(req)
}

export async function POST(req: NextRequest) {
  return correr(req)
}
