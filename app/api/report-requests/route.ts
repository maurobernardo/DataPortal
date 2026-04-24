import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/security'
import { createReportRequest, findReportById } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = rateLimit(`report-request:${ip}`, 20, 60 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas solicitações. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const body = await request.json()
    const reportId = Number(body?.reportId)

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return NextResponse.json({ error: 'reportId inválido' }, { status: 400 })
    }

    // Verifica se o relatório existe
    const report = await findReportById(reportId)

    if (!report) {
      return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 })
    }

    await createReportRequest(report.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating report request:', error)
    return NextResponse.json({ error: 'Erro ao registrar request de relatório' }, { status: 500 })
  }
}



