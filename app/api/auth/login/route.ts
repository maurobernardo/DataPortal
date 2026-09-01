import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  comparePassword,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signPending2faToken,
  signSessionToken,
} from '@/lib/auth'
import { findUserByEmail, purgarContasComPedidoDeEliminacaoExpirado, resolveUserRole, updateUserRole } from '@/lib/db'
import { isValidEmail, normalizeEmail, normalizeText, rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = normalizeEmail(body?.email)
    const password = normalizeText(body?.password, 256)

    // Sem infra de agendamento (cron) neste portal: aproveita o tráfego natural de logins para
    // purgar, de vez em quando, contas cujo prazo de graça de eliminação já expirou. Nunca
    // bloqueia o login em si (fire-and-forget) e a consulta interna é barata quando não há nada
    // para purgar, que é o caso normal.
    purgarContasComPedidoDeEliminacaoExpirado().catch((error) => logger.error('erro_purgar_contas_eliminadas', { error }))

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimit(`login:${ip}:${email}`, 10, 15 * 60 * 1000)
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

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const isPasswordValid = await comparePassword(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    if (user.active === false || user.active === 0) {
      return NextResponse.json(
        { error: 'Esta conta foi desactivada. Contacte a equipa do portal para mais informação.' },
        { status: 403 }
      )
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

    if (user.totp_enabled) {
      const pendingToken = signPending2faToken(user.id)
      return NextResponse.json({ needsTotp: true, pendingToken })
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
    logger.error('login_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
