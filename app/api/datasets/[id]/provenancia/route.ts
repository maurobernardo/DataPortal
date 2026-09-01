import { NextRequest, NextResponse } from 'next/server'
import { listarVersoesPublicas } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * Ficha de proveniência pública (PLANO-INTELIGENCIA-PORTAL.md): qualquer visitante pode ver quando
 * este dataset mudou e o que mudou (título/ano por versão), sem precisar de sessão de admin — só o
 * "quem editou" fica reservado ao painel administrativo.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
  }
  try {
    const versoes = await listarVersoesPublicas(id)
    return NextResponse.json({ versoes })
  } catch (erro) {
    logger.error('erro_obter_provenancia_publica', { error: erro, id })
    return NextResponse.json({ error: 'Não foi possível obter o histórico deste dataset' }, { status: 500 })
  }
}
