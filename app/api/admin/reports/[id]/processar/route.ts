export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { processarRelatorio, reservarProcessamento, RelatorioNaoProcessavelError } from '@/lib/relatorios/processar'

/**
 * Processa o PDF de um relatório a partir do painel administrativo.
 *
 * Existe a par de `/api/reports/[id]/analisar` (a mesma operação, para quem lê o relatório e
 * paga por ela): esta rota serve para a equipa preparar um relatório com antecedência, sem
 * esperar por um leitor. A lógica de extracção e digesto é a mesma nas duas.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ erro: 'Acesso reservado a administradores' }, { status: 403 })

  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ erro: 'Identificador inválido' }, { status: 400 })

  if (!(await reservarProcessamento(id))) {
    return NextResponse.json({ erro: 'Este relatório já está a ser processado' }, { status: 409 })
  }

  try {
    const resultado = await processarRelatorio(id)
    return NextResponse.json(resultado)
  } catch (erro: any) {
    if (erro instanceof RelatorioNaoProcessavelError) {
      return NextResponse.json({ erro: erro.message }, { status: 409 })
    }
    return NextResponse.json({ erro: 'Falha ao processar o relatório' }, { status: 500 })
  }
}
