import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { listarRelatoriosAgendados, criarRelatorioAgendado } from '@/lib/relatorios-agendados'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  const agendamentos = await listarRelatoriosAgendados()
  return NextResponse.json({ agendamentos })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const nome = typeof body?.nome === 'string' ? body.nome.trim() : ''
  const frequencia = body?.frequencia
  const destinatarios: string[] = Array.isArray(body?.destinatarios)
    ? body.destinatarios.map((e: any) => String(e).trim()).filter(Boolean)
    : []

  if (!nome) {
    return NextResponse.json({ error: 'Dê um nome a este relatório agendado' }, { status: 400 })
  }
  if (frequencia !== 'semanal' && frequencia !== 'mensal') {
    return NextResponse.json({ error: 'Frequência inválida' }, { status: 400 })
  }
  if (destinatarios.length === 0) {
    return NextResponse.json({ error: 'Indique pelo menos um destinatário' }, { status: 400 })
  }
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const invalido = destinatarios.find((e) => !emailValido.test(e))
  if (invalido) {
    return NextResponse.json({ error: `Email inválido: ${invalido}` }, { status: 400 })
  }

  const diaSemana = frequencia === 'semanal' ? Number(body?.diaSemana ?? 1) : null
  const diaMes = frequencia === 'mensal' ? Math.min(28, Math.max(1, Number(body?.diaMes ?? 1))) : null

  try {
    const agendamento = await criarRelatorioAgendado({
      nome,
      frequencia,
      diaSemana,
      diaMes,
      destinatarios,
      filtroCategoria: body?.filtroCategoria || null,
      filtroFormato: body?.filtroFormato || null,
      filtroFonte: body?.filtroFonte || null,
      criadoPor: user.email,
    })
    return NextResponse.json({ agendamento })
  } catch (erro) {
    logger.error('erro_criar_relatorio_agendado', { error: erro })
    return NextResponse.json({ error: 'Não foi possível criar o agendamento' }, { status: 500 })
  }
}
