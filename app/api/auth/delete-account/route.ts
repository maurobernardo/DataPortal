import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { comparePassword, getCurrentUser, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth'
import { deleteUserAccountData, findUserById } from '@/lib/db'
import { normalizeText, rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    const rl = await rateLimit(`delete-account:${session.userId}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const currentPassword = normalizeText(body?.currentPassword, 256)

    const user = await findUserById(session.userId)
    if (!user) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 })
    }

    if (user.password) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Indique a sua senha actual.' }, { status: 400 })
      }
      const passwordMatches = await comparePassword(currentPassword, user.password)
      if (!passwordMatches) {
        return NextResponse.json({ error: 'A senha actual está incorrecta.' }, { status: 401 })
      }
    }

    await deleteUserAccountData(user.id)

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, '', { ...getSessionCookieOptions(), maxAge: 0 })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('delete_account_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
