import { NextRequest, NextResponse } from 'next/server'
import { deleteDataset, findDatasetById, updateDataset } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const id = parseInt(params.id)
    const data = await request.json()

    const dataset = await updateDataset(id, {
      title: data.title,
      description: data.description,
      categoryId: parseInt(data.categoryId),
      source: data.source || '',
      year: data.year || new Date().getFullYear(),
      format: data.format,
      fileSize: data.fileSize || '',
      filePath: data.filePath || '',
      geometry: data.geometry || null,
      coverage: data.coverage || null,
      minimumUnit: data.minimumUnit || null,
      keywords: data.keywords || null,
      dataType: data.dataType || 'geoespacial',
    })

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(dataset)
  } catch (error: any) {
    console.error('Error updating dataset:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar dataset' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const id = parseInt(params.id)

    const existing = await findDatasetById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Dataset não encontrado' },
        { status: 404 }
      )
    }

    await deleteDataset(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting dataset:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir dataset' },
      { status: 500 }
    )
  }
}




