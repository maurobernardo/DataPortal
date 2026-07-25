import { NextResponse } from 'next/server'
import { generateOtp, generateToken } from '@/lib/auth'
import { findUserByEmail, setUserOtp, setUserVerification } from '@/lib/db'
import { hasAuthMailConfig, sendRegistrationVerificationEmail } from '@/lib/mailer'
import { isValidEmail, normalizeEmail, rateLimit } from '@/lib/security'

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
    const rl = rateLimit(`resend-verification:${ip}:${email}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const user = await findUserByEmail(email)

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Este email já está confirmado. Pode entrar.' }, { status: 400 })
    }

    const verificationCode = generateOtp()
    const verificationToken = generateToken()
    const verificationExpires = new Date(Date.now() + 30 * 60 * 1000)

    await setUserOtp(user.id, verificationCode, verificationExpires)
    await setUserVerification(user.id, verificationToken, verificationExpires)

    await sendRegistrationVerificationEmail(email, verificationCode, verificationToken)

    return NextResponse.json({
      success: true,
      message: 'Novo código enviado para o seu email.',
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
