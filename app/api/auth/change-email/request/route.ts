import { NextResponse } from 'next/server'
import { comparePassword, generateOtp, getCurrentUser } from '@/lib/auth'
import { findUserByEmail, findUserById, setPendingEmailChange } from '@/lib/db'
import { sendEmailChangeVerification } from '@/lib/mailer'
import { isValidEmail, normalizeEmail, normalizeText, rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    const rl = await rateLimit(`change-email-request:${session.userId}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const body = await request.json()
    const newEmail = normalizeEmail(body?.newEmail)
    const currentPassword = normalizeText(body?.currentPassword, 256)

    if (!newEmail || !isValidEmail(newEmail)) {
      return NextResponse.json({ error: 'Indique um email válido.' }, { status: 400 })
    }

    const user = await findUserById(session.userId)
    if (!user) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 })
    }

    if (newEmail === user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Esse já é o seu email actual.' }, { status: 400 })
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

    const existing = await findUserByEmail(newEmail)
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: 'Este email já está associado a outra conta.' }, { status: 409 })
    }

    const code = generateOtp()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    await setPendingEmailChange(user.id, newEmail, code, expiresAt)
    await sendEmailChangeVerification(newEmail, code)

    return NextResponse.json({
      success: true,
      message: 'Enviámos um código de confirmação para o novo email.',
    })
  } catch (error) {
    logger.error('change_email_request_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
