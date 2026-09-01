export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { obterDigesto, guardarDigesto } from '@/lib/relatorios/persistencia'
import { traduzirDigesto } from '@/lib/relatorios/traduzir-digesto'
import { TraducaoInfielError } from '@/lib/analysis/traducao'
import { logger } from '@/lib/logger'

/**
 * A versão inglesa do digesto, gerada a pedido e guardada. Exige sessão (não admin): é uma chamada
 * ao modelo, e o portal já segue esta regra noutros pontos que custam dinheiro por pedido
 * (ai-insights/query, a tradução de análises).
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ erro: 'Identificador inválido' }, { status: 400 })

  const jaFeito = await obterDigesto(id, 'en')
  if (jaFeito) return NextResponse.json({ digesto: jaFeito, reaproveitado: true })

  const original = await obterDigesto(id, 'pt')
  if (!original) return NextResponse.json({ erro: 'Este relatório ainda não tem digesto para traduzir' }, { status: 409 })

  try {
    const traduzido = await traduzirDigesto(original)
    await guardarDigesto(id, 'en', traduzido)
    return NextResponse.json({ digesto: traduzido })
  } catch (erro: any) {
    if (erro instanceof TraducaoInfielError) {
      logger.error('traducao_digesto_infiel', { reportId: id, perdidos: erro.perdidos })
      return NextResponse.json(
        { erro: 'A tradução foi recusada porque alterou números do original. O digesto em português continua válido.' },
        { status: 422 }
      )
    }
    logger.error('erro_traduzir_digesto', { error: erro, reportId: id })
    return NextResponse.json({ erro: 'Não foi possível traduzir agora' }, { status: 500 })
  }
}
