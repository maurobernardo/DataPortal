import { NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { clearUserResetCode, findUserByEmail, updateUserPassword } from '@/lib/db'
import { isStrongPassword, isValidEmail, normalizeEmail, normalizeText, rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = normalizeEmail(body?.email)
    const code = normalizeText(body?.code, 6)
    const newPassword = normalizeText(body?.newPassword, 256)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimit(`reset-password:${ip}:${email}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    if (!isStrongPassword(newPassword)) {
      return NextResponse.json(
        {
          error:
            'A senha deve ter no mínimo 12 caracteres, incluindo maiúscula, minúscula, número e símbolo.',
        },
        { status: 400 }
      )
    }

    const user = await findUserByEmail(email)

    if (!user || !user.reset_code || user.reset_code !== code) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 401 })
    }

    const resetExpires = user.reset_expires ? new Date(user.reset_expires) : null
    if (!resetExpires || resetExpires.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Código expirado. Solicite um novo.' }, { status: 401 })
    }

    const passwordHash = await hashPassword(newPassword)
    await updateUserPassword(user.id, passwordHash)
    await clearUserResetCode(user.id)

    return NextResponse.json({ success: true, message: 'Senha redefinida com sucesso! Já pode entrar.' })
  } catch (error) {
    logger.error('reset_password_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
