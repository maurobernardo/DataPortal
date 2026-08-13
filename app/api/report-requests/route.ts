import { NextRequest, NextResponse } from 'next/server'
import { isValidEmail, normalizeEmail, normalizeText, rateLimit } from '@/lib/security'
import { hasMailConfig, sendContactEmail } from '@/lib/mailer'
import { createReportRequest, findReportById } from '@/lib/db'
import { registarAcesso } from '@/lib/origem'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimit(`report-request:${ip}`, 20, 60 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas solicitações. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const body = await request.json()
    const reportId = Number(body?.reportId)
    const name = normalizeText(body?.name, 120)
    const email = normalizeEmail(body?.email)
    const message = normalizeText(body?.message, 5000)

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return NextResponse.json({ error: 'reportId inválido' }, { status: 400 })
    }

    // Verifica se o relatório existe
    const report = await findReportById(reportId)

    if (!report) {
      return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 })
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    }

    await createReportRequest(report.id, { name: name || null, email: email || null, message: message || null })
    await registarAcesso(request, 'pedido_relatorio', { referenciaId: report.id })

    if (name && email && hasMailConfig()) {
      await sendContactEmail({
        fromName: name,
        fromEmail: email,
        subject: `Pedido de relatório completo: ${report.title} (${report.year})`,
        message: message || '(sem mensagem adicional)',
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('error_creating_report_request', { error: error })
    return NextResponse.json({ error: 'Erro ao registrar request de relatório' }, { status: 500 })
  }
}



