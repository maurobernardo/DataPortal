import { NextRequest, NextResponse } from 'next/server'
import { deleteDataset, findCategoryById, findDatasetById, findDatasetUpdateSubscriberEmails, updateDataset } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import { hasAuthMailConfig, sendDatasetUpdatedEmail } from '@/lib/mailer'
import { logger } from '@/lib/logger'

const ALLOWED_DATA_TYPES = new Set(['geoespacial', 'alfanumerico'])

function isValidDataType(value: unknown): value is 'geoespacial' | 'alfanumerico' {
  return typeof value === 'string' && ALLOWED_DATA_TYPES.has(value)
}

function isZipPath(filePath: unknown) {
  return typeof filePath === 'string' && filePath.toLowerCase().endsWith('.zip')
}

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
    const data = await request.json()

    const existing = await findDatasetById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Dataset não encontrado' }, { status: 404 })
    }

    const categoryId = Number.parseInt(String(data.categoryId ?? existing.categoryId), 10)
    if (!Number.isFinite(categoryId)) {
      return NextResponse.json({ error: 'categoryId inválido' }, { status: 400 })
    }

    const dataType = isValidDataType(data.dataType) ? data.dataType : (isValidDataType(existing.dataType) ? existing.dataType : 'geoespacial')
    const category = await findCategoryById(categoryId)
    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 400 })
    }
    if (!isValidDataType(category.dataType)) {
      return NextResponse.json({ error: 'Categoria com dataType inválido' }, { status: 400 })
    }
    if (category.dataType !== dataType) {
      return NextResponse.json(
        { error: `Tipo de dados incompatível com a categoria (categoria: ${category.dataType}, dataset: ${dataType})` },
        { status: 400 }
      )
    }

    const nextFilePath = typeof data.filePath === 'string' && data.filePath.trim() ? data.filePath : existing.filePath
    if (!nextFilePath) {
      return NextResponse.json({ error: 'filePath inválido' }, { status: 400 })
    }

    if (dataType === 'geoespacial' && String(data.format ?? existing.format).toLowerCase() === 'shapefile' && !isZipPath(nextFilePath)) {
      return NextResponse.json({ error: 'Para Shapefile, envie um arquivo .zip' }, { status: 400 })
    }

    const dataset = await updateDataset(id, {
      title: data.title ?? existing.title,
      description: data.description ?? existing.description,
      categoryId,
      source: data.source ?? existing.source ?? '',
      year: data.year ?? existing.year ?? new Date().getFullYear(),
      format: data.format ?? existing.format,
      fileSize: data.fileSize ?? existing.fileSize ?? '',
      filePath: nextFilePath,
      geometry: data.geometry || null,
      coverage: data.coverage || null,
      minimumUnit: data.minimumUnit || null,
      keywords: data.keywords || null,
      dataType,
    })

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset não encontrado' },
        { status: 404 }
      )
    }

    if (hasAuthMailConfig()) {
      findDatasetUpdateSubscriberEmails(id)
        .then((emails) =>
          Promise.all(emails.map((email) => sendDatasetUpdatedEmail(email, dataset.title, id)))
        )
        .catch((error) => logger.error('dataset_update_subscriber_email_error', { error }))
    }

    return NextResponse.json(dataset)
  } catch (error: any) {
    logger.error('error_updating_dataset', { error: error })
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
    const user = await getCurrentAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
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
    logger.error('error_deleting_dataset', { error: error })
    return NextResponse.json(
      { error: 'Erro ao excluir dataset' },
      { status: 500 }
    )
  }
}




