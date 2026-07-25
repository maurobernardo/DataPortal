import { NextRequest, NextResponse } from 'next/server'
import { createReport, findAllReports } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const coverage = searchParams.get('coverage')
    const partners = searchParams.get('partners')

    const all = await findAllReports()
    const reports = all.filter((r: any) => {
      if (year && String(r.year) !== String(year)) return false
      if (coverage && !String(r.coverage || '').toLowerCase().includes(String(coverage).toLowerCase())) return false
      if (partners && !String(r.partners || '').toLowerCase().includes(String(partners).toLowerCase())) return false
      return true
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar relatórios' },
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

    const data = await request.json()

    if (!data.title || !data.year || !data.coverage) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    const report = await createReport({
      title: data.title,
      year: data.year,
      coverage: data.coverage,
      author: data.author || null,
      partners: data.partners || null,
      filePath: data.filePath || null,
      fileSize: data.fileSize || null,
      detailsText: data.detailsText || null,
    })

    return NextResponse.json(report)
  } catch (error: any) {
    console.error('Error creating report:', error)
    return NextResponse.json(
      { error: 'Erro ao criar relatório' },
      { status: 500 }
    )
  }
}







