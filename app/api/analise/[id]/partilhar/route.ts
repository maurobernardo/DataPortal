export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { definirPublico } from '@/lib/analysis/persistencia'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const corpo = await request.json().catch(() => ({}))
  const publico = corpo?.publico !== false

  const alterado = await definirPublico(params.id, sessao.userId, publico)
  if (!alterado) return NextResponse.json({ erro: 'Análise não encontrada' }, { status: 404 })

  return NextResponse.json({ publico })
}
