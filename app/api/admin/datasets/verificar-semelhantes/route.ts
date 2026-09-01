import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { detectarDatasetsSemelhantes } from '@/lib/analysis/inteligencia-catalogo'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * Aviso de duplicados/sobreposição (PLANO-INTELIGENCIA-PORTAL.md): comparação determinística, sem
 * custo de IA — corre ao sair do campo "Título" no DatasetForm, mesmo antes de haver ficheiro
 * carregado, para o admin ver logo se já existe algo parecido.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const titulo = typeof body?.titulo === 'string' ? body.titulo : ''
  const dataType = body?.dataType === 'alfanumerico' ? 'alfanumerico' : 'geoespacial'
  const categoryId = Number.isFinite(Number(body?.categoryId)) ? Number(body.categoryId) : null
  const source = typeof body?.source === 'string' ? body.source : null
  const excluirId = Number.isFinite(Number(body?.excluirId)) ? Number(body.excluirId) : undefined

  if (!titulo.trim()) {
    return NextResponse.json({ semelhantes: [] })
  }

  try {
    const semelhantes = await detectarDatasetsSemelhantes({ titulo, categoryId, source, dataType, excluirId })
    return NextResponse.json({ semelhantes })
  } catch (erro) {
    logger.error('erro_verificar_datasets_semelhantes', { error: erro })
    return NextResponse.json({ semelhantes: [] })
  }
}
