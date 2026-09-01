import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { actualizarRelatorioAgendado, removerRelatorioAgendado } from '@/lib/relatorios-agendados'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  }
  const body = await request.json().catch(() => null)
  try {
    await actualizarRelatorioAgendado(id, {
      activo: typeof body?.activo === 'boolean' ? body.activo : undefined,
    })
    return NextResponse.json({ ok: true })
  } catch (erro) {
    logger.error('erro_actualizar_relatorio_agendado', { error: erro, id })
    return NextResponse.json({ error: 'Não foi possível actualizar o agendamento' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  }
  try {
    await removerRelatorioAgendado(id)
    return NextResponse.json({ ok: true })
  } catch (erro) {
    logger.error('erro_remover_relatorio_agendado', { error: erro, id })
    return NextResponse.json({ error: 'Não foi possível remover o agendamento' }, { status: 500 })
  }
}
