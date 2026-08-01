import { NextResponse } from 'next/server'
import { comparePassword, getCurrentUser, hashPassword } from '@/lib/auth'
import { findUserById, updateUserPassword } from '@/lib/db'
import { isStrongPassword, normalizeText, rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    const rl = await rateLimit(`change-password:${session.userId}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const body = await request.json()
    const currentPassword = normalizeText(body?.currentPassword, 256)
    const newPassword = normalizeText(body?.newPassword, 256)

    const user = await findUserById(session.userId)
    if (!user) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 })
    }

    if (!user.password) {
      return NextResponse.json(
        { error: 'Esta conta foi criada via Google/LinkedIn e não tem palavra-passe para alterar.' },
        { status: 400 }
      )
    }

    if (!currentPassword) {
      return NextResponse.json({ error: 'Indique a sua senha actual.' }, { status: 400 })
    }

    const passwordMatches = await comparePassword(currentPassword, user.password)
    if (!passwordMatches) {
      return NextResponse.json({ error: 'A senha actual está incorrecta.' }, { status: 401 })
    }

    if (!isStrongPassword(newPassword)) {
      return NextResponse.json(
        {
          error:
            'A nova senha deve ter no mínimo 12 caracteres, incluindo maiúscula, minúscula, número e símbolo.',
        },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(newPassword)
    await updateUserPassword(user.id, passwordHash)

    return NextResponse.json({ success: true, message: 'Senha alterada com sucesso.' })
  } catch (error) {
    logger.error('change_password_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
