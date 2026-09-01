import { NextResponse } from 'next/server'
import { comparePassword, getCurrentAdminSemExigir2FA } from '@/lib/auth'
import { disableUserTotp, findUserById } from '@/lib/db'
import { normalizeText, rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdminSemExigir2FA()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 })
    }

    const rl = await rateLimit(`2fa-disable:${admin.userId}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const currentPassword = normalizeText(body?.currentPassword, 256)

    const user = await findUserById(admin.userId)
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

    await disableUserTotp(user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('2fa_disable_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
