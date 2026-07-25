import { NextRequest, NextResponse } from 'next/server'
import { createAlphanumericDashboard, findAllAlphanumericDashboards } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const dashboards = await findAllAlphanumericDashboards()
    return NextResponse.json(dashboards)
  } catch (error) {
    console.error('Error fetching alphanumeric dashboards:', error)
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
    })

    return NextResponse.json(dashboard)
  } catch (error) {
    console.error('Error creating alphanumeric dashboard:', error)
    return NextResponse.json({ error: 'Erro ao criar dashboard alfanumérico' }, { status: 500 })
  }
}

