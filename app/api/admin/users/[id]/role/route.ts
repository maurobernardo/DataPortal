import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { updateUserRole } from '@/lib/db'
import { logger } from '@/lib/logger'

const VALID_ROLES = new Set(['admin', 'user'])

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const targetId = Number.parseInt(params.id, 10)
    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const role = body?.role
    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'role inválido (admin | user)' }, { status: 400 })
    }

    if (targetId === admin.userId && role !== 'admin') {
      return NextResponse.json({ error: 'Não pode remover o seu próprio acesso de administrador.' }, { status: 400 })
    }

    await updateUserRole(targetId, role)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('error_updating_user_role', { error })
    return NextResponse.json({ error: 'Erro ao atualizar papel do utilizador' }, { status: 500 })
  }
}
