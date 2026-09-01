export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { guardarTraducao, obterAnalise, obterTraducao } from '@/lib/analysis/persistencia'
import { TraducaoInfielError, traduzirNarrativa } from '@/lib/analysis/traducao'
import { logger } from '@/lib/logger'

/**
 * A versão inglesa de uma análise, gerada a pedido e guardada.
 *
 * A pedido, e não em toda a análise: a esmagadora maioria nunca vai precisar, e duplicar o custo de
 * cada análise para servir uma minoria seria caro sem motivo. Guardada, porque a segunda pessoa a
 * pedir o mesmo relatório não deve pagar a mesma tradução outra vez.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const analise = await obterAnalise(params.id)
  if (!analise) return NextResponse.json({ erro: 'Análise não encontrada' }, { status: 404 })
  if (!analise.publico && analise.utilizador_id !== sessao.userId) {
    return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  }
  return NextResponse.json({ traducao: await obterTraducao(params.id) })
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const analise = await obterAnalise(params.id)
  if (!analise) return NextResponse.json({ erro: 'Análise não encontrada' }, { status: 404 })
  if (!analise.publico && analise.utilizador_id !== sessao.userId) {
    return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  }
  if (!analise.narrativa?.resolvida) {
    return NextResponse.json({ erro: 'Análise sem narrativa publicável' }, { status: 409 })
  }

  const jaFeita = await obterTraducao(params.id)
  if (jaFeita) return NextResponse.json({ traducao: jaFeita, reaproveitada: true })

  try {
    const traducao = await traduzirNarrativa(analise.narrativa.resolvida, analise.pergunta)
    await guardarTraducao(params.id, traducao)
    return NextResponse.json({ traducao })
  } catch (erro: any) {
    if (erro instanceof TraducaoInfielError) {
      // Não se guarda, e diz-se porquê. Publicar uma tradução com números alterados seria pior do
      // que não ter tradução nenhuma: o relatório continuaria a parecer impecável.
      logger.error('traducao_infiel', { analiseId: params.id, perdidos: erro.perdidos })
      return NextResponse.json(
        {
          erro:
            'A tradução foi recusada porque alterou números do original. O relatório em português ' +
            'continua válido; tente novamente.',
          numeros: erro.perdidos.slice(0, 8),
        },
        { status: 422 }
      )
    }
    logger.error('erro_traduzir_analise', { error: erro, analiseId: params.id })
    return NextResponse.json({ erro: 'Não foi possível traduzir agora' }, { status: 500 })
  }
}
