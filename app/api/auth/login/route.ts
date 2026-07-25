import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { comparePassword, getSessionCookieOptions, SESSION_COOKIE_NAME, signSessionToken } from '@/lib/auth'
import { findUserByEmail, resolveUserRole, updateUserRole } from '@/lib/db'
import { isValidEmail, normalizeEmail, normalizeText, rateLimit } from '@/lib/security'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = normalizeEmail(body?.email)
    const password = normalizeText(body?.password, 256)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = rateLimit(`login:${ip}:${email}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const user = await findUserByEmail(email)

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const isPasswordValid = await comparePassword(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error: 'Confirme o seu email antes de entrar. Verifique a sua caixa de entrada ou reenvie o código.',
          needsVerification: true,
        },
        { status: 403 }
      )
    }

    const role = await resolveUserRole(user.id, user.email)
    if (role === 'admin' && user.role !== 'admin') {
      await updateUserRole(user.id, 'admin')
    }
    const token = signSessionToken({ userId: user.id, email: user.email, role })
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions())

    return NextResponse.json({
      success: true,
      redirectTo:
        role === 'admin'
          ? '/dashboard'
          : '/',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
