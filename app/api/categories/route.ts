import { NextRequest, NextResponse } from 'next/server'
import { createCategory, findAllCategories } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const categories = await findAllCategories()

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar categorias' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
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
    console.error('Error creating category:', error)
    if (error?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Categoria já existe' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar categoria' },
      { status: 500 }
    )
  }
}

