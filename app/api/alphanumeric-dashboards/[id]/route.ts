import { NextRequest, NextResponse } from 'next/server'
import {
  deleteAlphanumericDashboard,
  findAlphanumericDashboardById,
  updateAlphanumericDashboard,
} from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const id = Number.parseInt(params.id, 10)
    const data = await request.json()
    if (!data.name || !data.dashboardUrl) {
      return NextResponse.json({ error: 'Nome e link do dashboard são obrigatórios' }, { status: 400 })
    }

    const updated = await updateAlphanumericDashboard(id, {
      name: String(data.name),
      dashboardUrl: String(data.dashboardUrl),
      description: data.description ? String(data.description) : null,
      previewImagePath: data.previewImagePath ? String(data.previewImagePath) : null,
      category: data.category ? String(data.category) : null,
      lastDataUpdate: data.lastDataUpdate ? String(data.lastDataUpdate) : null,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Dashboard não encontrado' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    logger.error('error_updating_alphanumeric_dashboard', { error: error })
    return NextResponse.json({ error: 'Erro ao atualizar dashboard alfanumérico' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const id = Number.parseInt(params.id, 10)
    const existing = await findAlphanumericDashboardById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Dashboard não encontrado' }, { status: 404 })
    }

    await deleteAlphanumericDashboard(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('error_deleting_alphanumeric_dashboard', { error: error })
    return NextResponse.json({ error: 'Erro ao excluir dashboard alfanumérico' }, { status: 500 })
  }
}

