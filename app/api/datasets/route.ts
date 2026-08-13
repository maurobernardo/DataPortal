export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createDataset, findCategoryById, findDatasets, setDatasetPreviewMeta } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import { getDatasetPreview } from '@/lib/dataset-preview'
import { notifyUsersOfNewContent } from '@/lib/notifications'
import { logger } from '@/lib/logger'

const ALLOWED_DATA_TYPES = new Set(['geoespacial', 'alfanumerico'])

function isValidDataType(value: unknown): value is 'geoespacial' | 'alfanumerico' {
  return typeof value === 'string' && ALLOWED_DATA_TYPES.has(value)
}

function isZipPath(filePath: unknown) {
  return typeof filePath === 'string' && filePath.toLowerCase().endsWith('.zip')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('dataType');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const source = searchParams.get('source');
    const format = searchParams.get('format');
    const year = searchParams.get('year');
    const yearFrom = searchParams.get('yearFrom');
    const yearTo = searchParams.get('yearTo');
    const sortOrder = searchParams.get('sortOrder');
    const offset = parseInt(searchParams.get('offset') || '0');
    const take = parseInt(searchParams.get('take') || '10');

    const datasets = await findDatasets({
      dataType: dataType || undefined,
      categoryId: category ? parseInt(category) : undefined,
      search: search || undefined,
      source: source || undefined,
      format: format || undefined,
      year: year ? parseInt(year) : undefined,
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined,
      sortOrder: sortOrder || undefined,
      offset,
      take,
    })

    return NextResponse.json(datasets);
  } catch (error) {
    logger.error('error_fetching_datasets', { error: error });
    return NextResponse.json(
      { error: 'Erro ao buscar datasets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const data = await request.json()

    const dataType = isValidDataType(data.dataType) ? data.dataType : 'geoespacial'
    const categoryId = Number.parseInt(String(data.categoryId), 10)
    if (!Number.isFinite(categoryId)) {
      return NextResponse.json({ error: 'categoryId inválido' }, { status: 400 })
    }

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

    if (!data.title || !data.description || !data.format) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    // Dataset.filePath é NOT NULL no schema: não permitir vazio em criação
    if (!data.filePath || typeof data.filePath !== 'string') {
      return NextResponse.json({ error: 'Faça upload do arquivo antes de salvar' }, { status: 400 })
    }

    // Shapefile deve ser cadastrado como .zip para evitar inconsistência (.shp sozinho não contém DBF/SHX/PRJ)
    if (dataType === 'geoespacial' && String(data.format).toLowerCase() === 'shapefile' && !isZipPath(data.filePath)) {
      return NextResponse.json({ error: 'Para Shapefile, envie um arquivo .zip' }, { status: 400 })
    }

    const dataset = await createDataset({
      title: data.title,
      description: data.description,
      categoryId,
      source: data.source || '',
      year: data.year || new Date().getFullYear(),
      format: data.format,
      fileSize: data.fileSize || '',
      filePath: data.filePath || '',
      geometry: data.geometry || null,
      coverage: data.coverage || null,
      minimumUnit: data.minimumUnit || null,
      keywords: data.keywords || null,
      dataType,
    })

    if (dataset) {
      try {
        const preview = await getDatasetPreview(dataset)
        const available = 'type' in preview && (preview.type === 'table' || preview.type === 'geo')
        const bbox = 'type' in preview && preview.type === 'geo' ? preview.bbox : null
        await setDatasetPreviewMeta(dataset.id, { previewAvailable: available, bbox })
      } catch (error) {
        logger.error('error_computing_preview_meta_on_create', { error, datasetId: dataset.id })
      }

      notifyUsersOfNewContent('dataset', dataset.title, `/dataset/${dataset.id}`).catch((error) => {
        logger.error('error_notifying_users_of_new_dataset', { error, datasetId: dataset.id })
      })
    }

    return NextResponse.json(dataset)
  } catch (error: any) {
    logger.error('error_creating_dataset', { error: error })
    return NextResponse.json(
      { error: 'Erro ao criar dataset' },
      { status: 500 }
    )
  }
}