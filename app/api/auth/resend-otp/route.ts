import { NextResponse } from 'next/server'
import { generateOtp } from '@/lib/auth'
import { findUserById, setUserOtp } from '@/lib/db'
import { sendOtpEmail } from '@/lib/mailer'
import { isValidEmail, normalizeEmail, rateLimit } from '@/lib/security'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const userId = Number(body?.userId)
    const email = normalizeEmail(body?.email)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = rateLimit(`otp-resend:${ip}:${email}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    if (!userId || !email) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const user = await findUserById(userId)

    if (!user || user.email !== email || !user.emailVerified) {
      return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 })
    }

    const otp = generateOtp()
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000)

    await setUserOtp(user.id, otp, otpExpires)
    await sendOtpEmail(user.email, otp)

    return NextResponse.json({
      success: true,
      message: 'Novo código enviado para o seu email.',
    })
  } catch (error) {
    console.error('Resend OTP error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
