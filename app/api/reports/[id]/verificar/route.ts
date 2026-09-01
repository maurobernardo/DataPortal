export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { obterDigesto } from '@/lib/relatorios/persistencia'
import { serieDoPortal } from '@/lib/relatorios/dados-portal'
import { verificarAfirmacao } from '@/lib/relatorios/verificar-afirmacao'
import { logger } from '@/lib/logger'

/**
 * Verifica as afirmações numéricas do digesto contra um dataset do portal.
 *
 * Sem chamada ao modelo (só agregação sobre dados já carregados), por isso sem exigir sessão. O
 * dataset e o nível geográfico são escolhidos por quem pede: automatizar essa escolha exigiria
 * associar cada "tema" de afirmação a um dataset do catálogo, o que é um problema de descoberta em
 * si e fica fora do que esta ronda entrega.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ erro: 'Identificador inválido' }, { status: 400 })

  const corpo = await req.json().catch(() => ({}))
  const datasetId = Number(corpo?.datasetId)
  const nivelGeo = corpo?.nivelGeo
  if (!Number.isFinite(datasetId) || !['admin1', 'admin2', 'admin3'].includes(nivelGeo)) {
    return NextResponse.json({ erro: 'Indique datasetId e nivelGeo (admin1, admin2 ou admin3)' }, { status: 400 })
  }

  const digesto = await obterDigesto(id, 'pt')
  if (!digesto?.afirmacoes_numericas?.length) {
    return NextResponse.json({ erro: 'Este relatório não tem afirmações numéricas extraídas' }, { status: 409 })
  }

  try {
    const valoresPortal = await serieDoPortal({
      datasetId,
      nivelGeo,
      colunaMetrica: corpo?.colunaMetrica || undefined,
      colunaIndicador: corpo?.colunaIndicador || undefined,
      valorIndicador: corpo?.valorIndicador || undefined,
      colunaTempo: corpo?.colunaTempo || undefined,
      unidadeMetrica: corpo?.unidadeMetrica || undefined,
      incluirNacional: corpo?.incluirNacional !== false,
    })

    if (valoresPortal.length === 0) {
      return NextResponse.json({
        erro: 'Não foi possível ligar este dataset a unidades administrativas conhecidas, ou o filtro indicado não devolveu linhas',
      }, { status: 422 })
    }

    const resultados = digesto.afirmacoes_numericas.map((a: any) => ({
      afirmacao: a,
      veredicto: verificarAfirmacao(a, valoresPortal),
    }))

    return NextResponse.json({ resultados })
  } catch (erro: any) {
    logger.error('erro_verificar_relatorio', { error: erro, reportId: id, datasetId })
    return NextResponse.json({ erro: 'Não foi possível verificar contra este dataset' }, { status: 500 })
  }
}
