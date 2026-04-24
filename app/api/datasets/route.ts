import { NextRequest, NextResponse } from 'next/server'
import { createDataset, findDatasets } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const source = searchParams.get('source');
    const format = searchParams.get('format');
    const year = searchParams.get('year');
    const sortOrder = searchParams.get('sortOrder');
    const offset = parseInt(searchParams.get('offset') || '0');
    const take = parseInt(searchParams.get('take') || '10');

    const datasets = await findDatasets({
      categoryId: category ? parseInt(category) : undefined,
      search: search || undefined,
      source: source || undefined,
      format: format || undefined,
      year: year ? parseInt(year) : undefined,
      sortOrder: sortOrder || undefined,
      offset,
      take,
    })

    return NextResponse.json(datasets);
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar datasets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const data = await request.json()

    if (!data.title || !data.description || !data.categoryId || !data.format) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    const dataset = await createDataset({
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

    return NextResponse.json(dataset)
  } catch (error: any) {
    console.error('Error creating dataset:', error)
    return NextResponse.json(
      { error: 'Erro ao criar dataset' },
      { status: 500 }
    )
  }
}




