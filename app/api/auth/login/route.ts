import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME, generateToken, getAuthCookieOptions } from '@/lib/auth'
import { isValidEmail, normalizeEmail, normalizeText, rateLimit } from '@/lib/security'
import { findUserByEmail } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = normalizeEmail(body?.email)
    const password = normalizeText(body?.password, 256)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    const user = await findUserByEmail(email)

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Gerar token usando a função centralizada
    const token = generateToken({ userId: user.id, email: user.email })

    // Definir cookie
    const cookieStore = await cookies()
    cookieStore.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions())

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
