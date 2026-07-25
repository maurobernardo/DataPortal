import { NextRequest, NextResponse } from 'next/server'
import { deleteCategory, findCategoryById, updateCategory } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const id = parseInt(params.id)
    const { name, description, dataType } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    const category = await updateCategory(id, {
      name,
      description: description || null,
      dataType: dataType || 'geoespacial',
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(category)
  } catch (error: any) {
    console.error('Error updating category:', error)
    if (error?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Já existe uma categoria com este nome para este tipo de dados.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao atualizar categoria' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const id = parseInt(params.id)

    const existing = await findCategoryById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    await deleteCategory(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir categoria' },
      { status: 500 }
    )
  }
}






