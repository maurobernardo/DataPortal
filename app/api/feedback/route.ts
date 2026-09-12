import { NextRequest, NextResponse } from 'next/server'
import { isValidEmail, normalizeEmail, normalizeText, rateLimit } from '@/lib/security'
import { hasMailConfig, sendFeedbackEmail } from '@/lib/mailer'
import { createFeedback } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { registarAcesso } from '@/lib/origem'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimit(`feedback:${ip}`, 5, 60 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas mensagens enviadas. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const session = await getCurrentUser()
    const body = await request.json()
    const nome = normalizeText(body?.nome, 150)
    const email = normalizeEmail(body?.email)
    const mensagem = normalizeText(body?.mensagem, 5000)
    const paginaOrigem = normalizeText(body?.paginaOrigem, 500)

    if (!nome || !email || !mensagem) {
      return NextResponse.json(
        { error: 'Preencha todos os campos obrigatórios.' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    }

    await createFeedback({
      userId: session?.userId || null,
      nome,
      email,
      mensagem,
      paginaOrigem,
    })
    await registarAcesso(request, 'contacto', { utilizadorId: session?.userId })

    if (hasMailConfig()) {
      await sendFeedbackEmail({ fromName: nome, fromEmail: email, message: mensagem })
    } else {
      logger.warn('smtp_nao_configurado_feedback_salvo_apenas_na_base_de_dados')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('error_sending_feedback', { error })
    return NextResponse.json(
      { error: 'Erro interno ao enviar feedback.' },
      { status: 500 }
    )
  }
}
