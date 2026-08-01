import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { enableUserTotp, findUserById } from '@/lib/db'
import { normalizeText, rateLimit } from '@/lib/security'
import { verifyTotpToken } from '@/lib/totp'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 })
    }

    const rl = await rateLimit(`2fa-enable:${admin.userId}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const body = await request.json()
    const code = normalizeText(body?.code, 20).replace(/\s+/g, '')

    const user = await findUserById(admin.userId)
    if (!user?.totp_secret) {
      return NextResponse.json({ error: 'Inicie a configuração do 2FA primeiro.' }, { status: 400 })
    }

    if (!(await verifyTotpToken(code, user.totp_secret))) {
      return NextResponse.json({ error: 'Código inválido. Verifique a aplicação autenticadora.' }, { status: 401 })
    }

    await enableUserTotp(user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('2fa_enable_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
