import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifyPending2faToken,
} from '@/lib/auth'
import { consumeUserTotpBackupCode, findUserById, resolveUserRole } from '@/lib/db'
import { normalizeText, rateLimit } from '@/lib/security'
import { parseBackupCodes, verifyTotpToken } from '@/lib/totp'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const pendingToken = normalizeText(body?.pendingToken, 2000)
    const code = normalizeText(body?.code, 20)

    const pending = verifyPending2faToken(pendingToken)
    if (!pending) {
      return NextResponse.json({ error: 'Sessão de verificação expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    const rl = await rateLimit(`totp-login:${pending.userId}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const user = await findUserById(pending.userId)
    if (!user || !user.totp_enabled || !user.totp_secret) {
      return NextResponse.json({ error: 'Verificação em duas etapas não está activa.' }, { status: 400 })
    }

    const cleanCode = code.replace(/\s+/g, '')
    let verified = await verifyTotpToken(cleanCode, user.totp_secret)

    if (!verified) {
      const backupCodes = parseBackupCodes(user.totp_backup_codes)
      const normalizedInput = cleanCode.toUpperCase()
      if (backupCodes.includes(normalizedInput)) {
        verified = true
        await consumeUserTotpBackupCode(
          user.id,
          backupCodes.filter((c) => c !== normalizedInput)
        )
      }
    }

    if (!verified) {
      return NextResponse.json({ error: 'Código inválido.' }, { status: 401 })
    }

    const role = await resolveUserRole(user.id, user.email)
    const token = signSessionToken({ userId: user.id, email: user.email, role })
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions())

    return NextResponse.json({
      success: true,
      redirectTo: role === 'admin' ? '/dashboard' : '/',
      user: { id: user.id, email: user.email, name: user.name, role },
    })
  } catch (error) {
    logger.error('2fa_login_verify_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
