import { NextResponse } from 'next/server'
import { getCurrentUser, getUserInitials } from '@/lib/auth'
import { clearPendingEmailChange, confirmPendingEmailChange, findUserById } from '@/lib/db'
import { normalizeText, rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    const rl = await rateLimit(`change-email-confirm:${session.userId}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const body = await request.json()
    const code = normalizeText(body?.code, 6)

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Código inválido.' }, { status: 400 })
    }

    const user = await findUserById(session.userId)
    if (!user?.pending_email || !user.pending_email_code) {
      return NextResponse.json({ error: 'Não há nenhuma alteração de email pendente.' }, { status: 400 })
    }

    const expiresAt = user.pending_email_expires ? new Date(user.pending_email_expires) : null
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      await clearPendingEmailChange(user.id)
      return NextResponse.json({ error: 'Código expirado. Solicite um novo.' }, { status: 401 })
    }

    if (user.pending_email_code !== code) {
      return NextResponse.json({ error: 'Código incorrecto.' }, { status: 401 })
    }

    await confirmPendingEmailChange(user.id, user.pending_email)
    const updated = await findUserById(user.id)

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        initials: getUserInitials(updated.name, updated.email),
      },
    })
  } catch (error) {
    logger.error('change_email_confirm_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
