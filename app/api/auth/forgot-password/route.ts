import { NextResponse } from 'next/server'
import { generateOtp } from '@/lib/auth'
import { findUserByEmail, setUserResetCode } from '@/lib/db'
import { hasAuthMailConfig, sendPasswordResetEmail } from '@/lib/mailer'
import { isValidEmail, normalizeEmail, rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'

const GENERIC_MESSAGE =
  'Se existir uma conta com este email, enviámos um código de recuperação.'

export async function POST(request: Request) {
  try {
    if (!hasAuthMailConfig()) {
      return NextResponse.json(
        { error: 'Serviço de email não configurado. Contacte o administrador.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const email = normalizeEmail(body?.email)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimit(`forgot-password:${ip}:${email}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const user = await findUserByEmail(email)

    if (user && user.emailVerified) {
      const code = generateOtp()
      const expires = new Date(Date.now() + 15 * 60 * 1000)
      await setUserResetCode(user.id, code, expires)

      try {
        await sendPasswordResetEmail(email, code)
      } catch (mailError) {
        logger.error('forgot_password_mail_error', { error: mailError })
        return NextResponse.json(
          { error: 'Não foi possível enviar o email de recuperação. Tente novamente mais tarde.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE, email })
  } catch (error) {
    logger.error('forgot_password_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
