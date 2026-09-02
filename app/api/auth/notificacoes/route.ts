import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { setPreferenciaNotificacoes } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Grava a resposta ao popup "quer receber notificações do portal?" (mostrado no primeiro login)
 * e também a alternância equivalente na página de perfil. As duas usam este mesmo endpoint.
 */
export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (typeof body?.receber !== 'boolean') {
      return NextResponse.json({ error: 'Valor em falta.' }, { status: 400 })
    }

    await setPreferenciaNotificacoes(session.userId, body.receber)

    return NextResponse.json({ success: true, receberNotificacoes: body.receber })
  } catch (error) {
    logger.error('update_notification_preference_error', { error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
