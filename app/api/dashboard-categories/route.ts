import { NextResponse } from 'next/server'
import { findCategoriesByDataType } from '@/lib/db'

/** Categorias públicas para dashboards alfanuméricos (tipo `dashboard` na tabela Category). */
export async function GET() {
  try {
    const rows = await findCategoriesByDataType('dashboard')
    const items = rows.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name }))
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching dashboard categories:', error)
    return NextResponse.json({ error: 'Erro ao buscar categorias de dashboard' }, { status: 500 })
  }
}
