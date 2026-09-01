import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cancelarEliminacaoConta } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    await cancelarEliminacaoConta(session.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('cancel_delete_account_error', { error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
