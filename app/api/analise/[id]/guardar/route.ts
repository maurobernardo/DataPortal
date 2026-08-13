export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { definirGuardado } from '@/lib/analysis/persistencia'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const corpo = await request.json().catch(() => ({}))
  const guardado = corpo?.guardado !== false

  const alterado = await definirGuardado(params.id, sessao.userId, guardado)
  if (!alterado) return NextResponse.json({ erro: 'Análise não encontrada' }, { status: 404 })

  return NextResponse.json({ guardado })
}
