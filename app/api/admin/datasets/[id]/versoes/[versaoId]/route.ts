import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { restaurarVersaoDataset } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest, { params }: { params: { id: string; versaoId: string } }) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const versaoId = Number.parseInt(params.versaoId, 10)
    if (!Number.isFinite(versaoId)) {
      return NextResponse.json({ error: 'ID de versão inválido' }, { status: 400 })
    }

    const resultado = await restaurarVersaoDataset(versaoId, admin.email)
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.erro }, { status: 404 })
    }

    await logAudit({
      actorEmail: admin.email,
      action: 'restaurar_versao_dataset',
      entityType: 'dataset',
      entityId: resultado.id,
      details: `Restaurado a partir da versão #${versaoId}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('erro_restaurar_versao_dataset', { error })
    return NextResponse.json({ error: 'Erro ao restaurar versão' }, { status: 500 })
  }
}
