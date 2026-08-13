import { NextRequest, NextResponse } from 'next/server'
import { clearUserOtp, findUserByEmail, findUserByVerificationToken, markEmailVerified } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/mailer'
import { isValidEmail, normalizeEmail, normalizeText, rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim()

    if (!token) {
      return NextResponse.json({ error: 'Token em falta' }, { status: 400 })
    }

    const user = await findUserByVerificationToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Link de confirmação inválido ou expirado' }, { status: 400 })
    }

    if (user.email_verified) {
      return NextResponse.json({ success: true, message: 'Email já confirmado.' })
    }

    const expires = user.verification_expires ? new Date(user.verification_expires) : null
    if (!expires || expires.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Link de confirmação inválido ou expirado' }, { status: 400 })
    }

    await markEmailVerified(user.id)
    await clearUserOtp(user.id)
    sendWelcomeEmail(user.email, user.name).catch((error) => {
      logger.error('error_sending_welcome_email', { error, email: user.email })
    })

    return NextResponse.json({ success: true, message: 'Email confirmado com sucesso.' })
  } catch (error) {
    logger.error('verify_email_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = normalizeEmail(body?.email)
    const code = normalizeText(body?.code, 6)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimit(`verify-email:${ip}:${email}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    if (!email || !code) {
      return NextResponse.json({ error: 'Email e código são obrigatórios' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    const user = await findUserByEmail(email)

    if (!user) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: 'Email já confirmado.' })
    }

    if (!user.otp_code || user.otp_code !== code) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 401 })
    }

    const otpExpires = user.otp_expires ? new Date(user.otp_expires) : null
    if (!otpExpires || otpExpires.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Código expirado. Reenvie a verificação.' }, { status: 401 })
    }

    await markEmailVerified(user.id)
    await clearUserOtp(user.id)
    sendWelcomeEmail(user.email, user.name).catch((error) => {
      logger.error('error_sending_welcome_email', { error, email: user.email })
    })

    return NextResponse.json({ success: true, message: 'Email confirmado com sucesso! Já pode entrar.' })
  } catch (error) {
    logger.error('verify_email_post_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
