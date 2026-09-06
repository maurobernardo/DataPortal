import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCurrentUser, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST() {
  // Lido ANTES de limpar o cookie: depois de limpo já não há sessão nenhuma para identificar quem
  // estava a sair.
  const sessao = await getCurrentUser()

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    ...getSessionCookieOptions(),
    maxAge: 0,
  })

  if (sessao) {
    logAudit({ actorEmail: sessao.email, action: 'logout', entityType: 'user', entityId: sessao.userId })
  }

  return NextResponse.json({ success: true })
}
