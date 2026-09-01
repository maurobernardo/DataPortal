import { NextResponse } from 'next/server'
import { getCurrentAdminSemExigir2FA } from '@/lib/auth'
import { findUserById, setUserTotpSecret } from '@/lib/db'
import { generateBackupCodes, generateTotpQrCode, generateTotpSecret } from '@/lib/totp'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const admin = await getCurrentAdminSemExigir2FA()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 })
    }

    const user = await findUserById(admin.userId)
    if (!user) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 })
    }

    const secret = generateTotpSecret()
    const backupCodes = generateBackupCodes()
    await setUserTotpSecret(user.id, secret, backupCodes)
    const qrCodeDataUrl = await generateTotpQrCode(user.email, secret)

    return NextResponse.json({ secret, qrCodeDataUrl, backupCodes })
  } catch (error) {
    logger.error('2fa_setup_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
