export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { findDatasets } from '@/lib/db'

/** Tecto de segurança: o catálogo tem dezenas de datasets, nunca milhares — este limite protege
 *  contra um pedido de exportação acidentalmente sem filtro nenhum sobrecarregar a base de dados. */
const MAX_EXPORT = 2000

function escapeCsv(value: unknown): string {
  const texto = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

/** Exporta os metadados do catálogo filtrado (mesmos filtros do ecrã) em CSV, para quem precisa
 *  de uma lista de datasets fora do portal (planeamento, partilha, cruzamento noutra ferramenta) —
 *  sem ter de copiar linha a linha ou descarregar cada dataset individualmente. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dataType = searchParams.get('dataType')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const source = searchParams.get('source')
    const format = searchParams.get('format')
    const year = searchParams.get('year')
    const yearFrom = searchParams.get('yearFrom')
    const yearTo = searchParams.get('yearTo')
    const sortOrder = searchParams.get('sortOrder')

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
      offset: 0,
      take: MAX_EXPORT,
    })

    const colunas = ['id', 'titulo', 'categoria', 'fonte', 'ano', 'formato', 'visualizacoes', 'downloads', 'url']
    const linhas = (datasets as any[]).map((d) =>
      [
        d.id,
        d.title,
        d.category?.name ?? '',
        d.source ?? '',
        d.year ?? '',
        d.format ?? '',
        d.views ?? 0,
        d.downloads ?? 0,
        `${request.nextUrl.origin}/dataset/${d.id}`,
      ]
        .map(escapeCsv)
        .join(',')
    )
    const csv = '﻿' + [colunas.join(','), ...linhas].join('\r\n')

    const nomeFicheiro = `catalogo-${dataType || 'todos'}-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomeFicheiro}"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao exportar catálogo' }, { status: 500 })
  }
}
