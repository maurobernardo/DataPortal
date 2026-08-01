import { NextResponse } from 'next/server'
import { findCategoriesByDataType } from '@/lib/db'
import { logger } from '@/lib/logger'

/** Categorias públicas para dashboards alfanuméricos (tipo `dashboard` na tabela Category). */
export async function GET() {
  try {
    const rows = await findCategoriesByDataType('dashboard')
    const items = rows.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name }))
    return NextResponse.json(items)
  } catch (error) {
    logger.error('error_fetching_dashboard_categories', { error: error })
    return NextResponse.json({ error: 'Erro ao buscar categorias de dashboard' }, { status: 500 })
  }
}
