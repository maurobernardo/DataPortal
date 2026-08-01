import { NextResponse } from 'next/server'
import { getCurrentUser, getUserInitials } from '@/lib/auth'
import { updateUserName, findUserById } from '@/lib/db'
import { normalizeText } from '@/lib/security'
import { logger } from '@/lib/logger'

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
    }

    const body = await request.json()
    const name = normalizeText(body?.name, 120)

    if (!name) {
      return NextResponse.json({ error: 'Indique o seu nome.' }, { status: 400 })
    }

    await updateUserName(session.userId, name)
    const user = await findUserById(session.userId)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        initials: getUserInitials(user.name, user.email),
      },
    })
  } catch (error) {
    logger.error('update_profile_error', { error: error })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
