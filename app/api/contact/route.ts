import { NextRequest, NextResponse } from 'next/server'
import { isValidEmail, normalizeEmail, normalizeText, rateLimit } from '@/lib/security'
import { hasMailConfig, sendContactEmail } from '@/lib/mailer'
import { createContactMessage } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas mensagens enviadas. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const body = await request.json()
    const name = normalizeText(body?.name, 120)
    const email = normalizeEmail(body?.email)
    const subject = normalizeText(body?.subject, 180)
    const message = normalizeText(body?.message, 5000)

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Preencha todos os campos obrigatórios.' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    }

    await createContactMessage({ name, email, subject, message })

    if (hasMailConfig()) {
      await sendContactEmail({
        fromName: name,
        fromEmail: email,
        subject,
        message,
      })
    } else {
      logger.warn('smtp_nao_configurado_mensagem_de_contacto_salva_apenas_na_ba')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('error_sending_contact_message', { error: error })
    return NextResponse.json(
      { error: 'Erro interno ao enviar mensagem.' },
      { status: 500 }
    )
  }
}
