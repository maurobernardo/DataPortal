export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAlphanumericDashboard, findAllAlphanumericDashboards } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import { notifyUsersOfNewContent } from '@/lib/notifications'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const dashboards = await findAllAlphanumericDashboards()
    return NextResponse.json(dashboards)
  } catch (error) {
    logger.error('error_fetching_alphanumeric_dashboards', { error: error })
    return NextResponse.json({ error: 'Erro ao buscar dashboards alfanuméricos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const data = await request.json()
    if (!data.name || !data.dashboardUrl) {
      return NextResponse.json({ error: 'Nome e link do dashboard são obrigatórios' }, { status: 400 })
    }

    const dashboard = await createAlphanumericDashboard({
      name: String(data.name),
      dashboardUrl: String(data.dashboardUrl),
      description: data.description ? String(data.description) : null,
      previewImagePath: data.previewImagePath ? String(data.previewImagePath) : null,
      category: data.category ? String(data.category) : null,
      lastDataUpdate: data.lastDataUpdate ? String(data.lastDataUpdate) : null,
    })

    if (dashboard) {
      notifyUsersOfNewContent('dashboard', dashboard.name, '/dashboards-alfanumericos').catch((error) => {
        logger.error('error_notifying_users_of_new_dashboard', { error, dashboardId: dashboard.id })
      })
    }

    return NextResponse.json(dashboard)
  } catch (error) {
    logger.error('error_creating_alphanumeric_dashboard', { error: error })
    return NextResponse.json({ error: 'Erro ao criar dashboard alfanumérico' }, { status: 500 })
  }
}