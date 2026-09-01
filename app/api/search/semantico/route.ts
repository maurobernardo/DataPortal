import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { findDatasetById } from '@/lib/db'
import { buscaSemanticaCatalogo } from '@/lib/analysis/inteligencia-catalogo'
import { rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'

/** Busca semântica sobre o catálogo inteiro: cada pedido custa uma chamada ao modelo, por isso
 *  exige sessão iniciada e tem limite de utilização, tal como o AI Insights. */
export async function POST(request: NextRequest) {
  try {
    const sessao = await getCurrentUser()
    if (!sessao) {
      return NextResponse.json({ error: 'Precisa de sessão iniciada para usar a busca inteligente' }, { status: 401 })
    }

    const rl = await rateLimit(`busca-semantica:${sessao.userId}`, 20, 60 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Limite de buscas inteligentes por hora atingido. Tente novamente mais tarde.' },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const pergunta = String(body?.pergunta || '').trim()
    if (!pergunta || pergunta.length < 4) {
      return NextResponse.json({ error: 'Escreva o que procura com um pouco mais de detalhe' }, { status: 400 })
    }

    const resultados = await buscaSemanticaCatalogo(pergunta)
    const datasets = (
      await Promise.all(
        resultados.map(async (r) => {
          const dataset = await findDatasetById(r.datasetId)
          if (!dataset) return null
          return {
            id: dataset.id,
            title: dataset.title,
            dataType: dataset.dataType,
            category: dataset.category?.name || null,
            motivo: r.motivo,
          }
        })
      )
    ).filter(Boolean)

    return NextResponse.json({ datasets })
  } catch (error) {
    logger.error('erro_busca_semantica', { error })
    return NextResponse.json({ error: 'Erro ao processar a busca inteligente' }, { status: 500 })
  }
}
