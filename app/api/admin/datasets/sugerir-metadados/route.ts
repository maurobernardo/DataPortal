import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { sugerirMetadadosDataset, detectarDatasetsSemelhantes } from '@/lib/analysis/inteligencia-catalogo'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * Pré-preenchimento ao cadastrar (PLANO-INTELIGENCIA-PORTAL.md): chamado só quando o admin clica
 * em "Sugerir com IA" logo após o upload no DatasetForm — nunca automático. Devolve, na mesma
 * chamada, a sugestão de metadados (IA) e os datasets parecidos já existentes (sem custo de IA,
 * só comparação de texto), para o admin ver os dois avisos de uma vez antes de preencher o resto.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const filePath = typeof body?.filePath === 'string' ? body.filePath : ''
  const dataType = body?.dataType === 'alfanumerico' ? 'alfanumerico' : 'geoespacial'
  const titulo = typeof body?.titulo === 'string' ? body.titulo : ''
  const categoryId = Number.isFinite(Number(body?.categoryId)) ? Number(body.categoryId) : null
  const source = typeof body?.source === 'string' ? body.source : null

  if (!filePath) {
    return NextResponse.json({ error: 'Caminho do ficheiro em falta' }, { status: 400 })
  }

  try {
    const [categoriasRows] = (await db.execute(
      'SELECT DISTINCT name FROM Category WHERE dataType = ? ORDER BY name ASC',
      [dataType]
    )) as [{ name: string }[], unknown]
    const categoriasExistentes = categoriasRows.map((c) => c.name)

    const [sugestao, semelhantes] = await Promise.all([
      sugerirMetadadosDataset({ filePath, dataType, titulo, categoriasExistentes }),
      titulo.trim()
        ? detectarDatasetsSemelhantes({ titulo, categoryId, source, dataType })
        : Promise.resolve([]),
    ])

    return NextResponse.json({ sugestao, semelhantes })
  } catch (erro) {
    logger.error('erro_sugerir_metadados_dataset', { error: erro })
    return NextResponse.json({ error: 'Não foi possível gerar sugestões agora.' }, { status: 502 })
  }
}
