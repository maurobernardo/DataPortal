import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { clearUserOtp, findUserById } from '@/lib/db'
import { getSessionCookieOptions, SESSION_COOKIE_NAME, signSessionToken } from '@/lib/auth'
import { normalizeText, rateLimit } from '@/lib/security'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const userId = Number(body?.userId)
    const code = normalizeText(body?.code, 6)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = rateLimit(`verify-2fa:${ip}:${userId}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    if (!userId || !code) {
      return NextResponse.json({ error: 'Código e utilizador são obrigatórios' }, { status: 400 })
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    const user = await findUserById(userId)

    if (!user || !user.emailVerified) {
      return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 })
    }

    if (!user.otp_code || user.otp_code !== code) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 401 })
    }

    const otpExpires = user.otp_expires ? new Date(user.otp_expires) : null
    if (!otpExpires || otpExpires.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Código expirado. Faça login novamente.' }, { status: 401 })
    }

    await clearUserOtp(user.id)

    const role = user.role === 'admin' ? 'admin' : 'user'
    const token = signSessionToken({ userId: user.id, email: user.email, role })
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions())

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('Verify 2FA error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
