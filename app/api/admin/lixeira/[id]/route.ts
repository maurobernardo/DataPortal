import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { eliminarDatasetDefinitivamente, restaurarDatasetDaLixeira } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'

/** Restaura um dataset a partir da lixeira. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const lixeiraId = Number.parseInt(params.id, 10)
    if (!Number.isFinite(lixeiraId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const resultado = await restaurarDatasetDaLixeira(lixeiraId)
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.erro }, { status: 409 })
    }

    await logAudit({
      actorEmail: admin.email,
      action: 'restaurar_dataset',
      entityType: 'dataset',
      entityId: resultado.id,
      details: `Restaurado da lixeira (registo #${lixeiraId})`,
    })

    return NextResponse.json({ success: true, id: resultado.id })
  } catch (error) {
    logger.error('erro_restaurar_dataset_lixeira', { error })
    return NextResponse.json({ error: 'Erro ao restaurar dataset' }, { status: 500 })
  }
}

/** Remoção definitiva (irreversível) de um registo já na lixeira. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const lixeiraId = Number.parseInt(params.id, 10)
    if (!Number.isFinite(lixeiraId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await eliminarDatasetDefinitivamente(lixeiraId)

    await logAudit({
      actorEmail: admin.email,
      action: 'eliminar_dataset_definitivamente',
      entityType: 'dataset',
      entityId: lixeiraId,
      details: 'Remoção definitiva a partir da lixeira, sem possibilidade de recuperação',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('erro_eliminar_dataset_definitivamente', { error })
    return NextResponse.json({ error: 'Erro ao eliminar definitivamente' }, { status: 500 })
  }
}
