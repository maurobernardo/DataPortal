import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { obterEstadosVerificacao } from '@/lib/relatorios/persistencia'

export const dynamic = 'force-dynamic'

/**
 * Estado da última reverificação automática (ver lib/relatorios/verificacao-periodica.ts) para os
 * relatórios indicados — usado pela lista de administração para mostrar um selo sem esperar por um
 * clique em "Verificar" para cada um.
 */
export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
  }

  const idsParam = request.nextUrl.searchParams.get('ids') || ''
  const ids = idsParam
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))

  const estados = await obterEstadosVerificacao(ids)
  const resultado: Record<number, unknown> = {}
  for (const [id, estado] of Array.from(estados.entries())) {
    resultado[id] = estado
  }

  return NextResponse.json({ estados: resultado })
}
