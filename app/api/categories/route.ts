export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createCategory, findAllCategories } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const categories = await findAllCategories()

    return NextResponse.json(categories)
  } catch (error) {
    logger.error('error_fetching_categories', { error: error })
    return NextResponse.json(
      { error: 'Erro ao buscar categorias' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const { name, description, dataType } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }
    
    const category = await createCategory({
      name,
      description: description || null,
      dataType: dataType || 'geoespacial',
    })

    return NextResponse.json(category)
  } catch (error: any) {
    logger.error('error_creating_category', { error: error })
    if (error?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Já existe uma categoria com este nome para este tipo de dados.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar categoria' },
      { status: 500 }
    )
  }
}