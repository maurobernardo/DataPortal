import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { verificarQualidadeConteudo } from '@/lib/analysis/inteligencia-catalogo'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * Verificação de qualidade ao cadastrar, antes de "Criar Dataset" (PLANO-INTELIGENCIA-PORTAL.md):
 * o admin não precisa de guardar primeiro e só depois ir a "editar" para saber se o ficheiro tem
 * problemas — o botão já aparece logo a seguir ao upload, no próprio formulário de criação.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const filePath = typeof body?.filePath === 'string' ? body.filePath : null
  const dataType = body?.dataType === 'alfanumerico' ? 'alfanumerico' : 'geoespacial'
  if (!filePath) {
    return NextResponse.json({ error: 'Faça upload de um ficheiro primeiro' }, { status: 400 })
  }

  try {
    const resultado = await verificarQualidadeConteudo({
      filePath,
      dataType,
      description: body?.description || null,
      source: body?.source || null,
      year: body?.year ? Number(body.year) : null,
      keywords: body?.keywords || null,
    })
    return NextResponse.json(resultado)
  } catch (erro) {
    logger.error('erro_verificar_qualidade_previa', { error: erro })
    return NextResponse.json({ error: 'Não foi possível verificar a qualidade agora.' }, { status: 502 })
  }
}
