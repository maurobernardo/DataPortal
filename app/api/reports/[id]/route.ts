import { NextRequest, NextResponse } from 'next/server'
import { deleteReport, findReportById, updateReport } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'

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

    if (!data.title || !data.year || !data.coverage) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    const report = await updateReport(id, {
      title: data.title,
      year: data.year,
      coverage: data.coverage,
      author: data.author || null,
      partners: data.partners || null,
      filePath: data.filePath || null,
      fileSize: data.fileSize || null,
      detailsText: data.detailsText || null,
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Relatório não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(report)
  } catch (error: any) {
    logger.error('error_updating_report', { error: error })
    return NextResponse.json(
      { error: 'Erro ao atualizar relatório' },
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

    const existing = await findReportById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Relatório não encontrado' },
        { status: 404 }
      )
    }

    await deleteReport(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('error_deleting_report', { error: error })
    return NextResponse.json(
      { error: 'Erro ao excluir relatório' },
      { status: 500 }
    )
  }
}







