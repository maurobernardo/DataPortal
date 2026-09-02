export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { listarAcessosDoRelatorio } from '@/lib/relatorios/persistencia'

/**
 * Quem desbloqueou este relatório, para a vistoria de uso no admin (/admin/relatorios-uso).
 * Pedido só quando um admin expande um relatório específico, não em cada carregamento da lista.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ erro: 'Acesso reservado a administradores' }, { status: 403 })

  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ erro: 'Identificador inválido' }, { status: 400 })

  const acessos = await listarAcessosDoRelatorio(id)
  return NextResponse.json({ acessos })
}
