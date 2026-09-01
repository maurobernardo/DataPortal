export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { findUserById, setUserActive, updateUserRole } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'

/** Promove/despromove e activa/desactiva contas. Nunca permite a um admin desactivar-se ou
 *  despromover-se a si próprio, para o painel nunca ficar sem nenhum admin capaz de o reabrir. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const userId = Number(params.id)
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Utilizador inválido' }, { status: 400 })
    }

    const alvo = await findUserById(userId)
    if (!alvo) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const acoes: string[] = []

    if (typeof body.role === 'string' && (body.role === 'admin' || body.role === 'user')) {
      if (userId === admin.userId && body.role !== 'admin') {
        return NextResponse.json({ error: 'Não pode remover o seu próprio acesso de administrador' }, { status: 400 })
      }
      await updateUserRole(userId, body.role)
      await logAudit({
        actorEmail: admin.email,
        action: body.role === 'admin' ? 'promover_admin' : 'remover_admin',
        entityType: 'user',
        entityId: userId,
        details: `Alvo: ${alvo.email}`,
      })
      acoes.push('role')
    }

    if (typeof body.active === 'boolean') {
      if (userId === admin.userId && !body.active) {
        return NextResponse.json({ error: 'Não pode desactivar a sua própria conta' }, { status: 400 })
      }
      await setUserActive(userId, body.active)
      await logAudit({
        actorEmail: admin.email,
        action: body.active ? 'activar_conta' : 'desactivar_conta',
        entityType: 'user',
        entityId: userId,
        details: `Alvo: ${alvo.email}`,
      })
      acoes.push('active')
    }

    if (acoes.length === 0) {
      return NextResponse.json({ error: 'Nenhuma alteração pedida' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('error_updating_user_admin', { error })
    return NextResponse.json({ error: 'Erro ao actualizar utilizador' }, { status: 500 })
  }
}
