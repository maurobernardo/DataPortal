export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin, getCurrentUser } from '@/lib/auth'
import { guardarEstadoVerificacao, guardarReferenciaVerificacao, obterDigesto, temAcesso } from '@/lib/relatorios/persistencia'
import { serieDoPortal } from '@/lib/relatorios/dados-portal'
import { verificarAfirmacao } from '@/lib/relatorios/verificar-afirmacao'
import { logger } from '@/lib/logger'

/**
 * Verifica as afirmações numéricas do digesto contra um dataset do portal.
 *
 * Não faz chamada ao modelo (só agregação sobre dados já carregados) — mas devolve as próprias
 * afirmações numéricas extraídas do digesto, que é conteúdo pago, por isso a regra de acesso tem
 * de ser a mesma do `/digesto`: mesmo sendo "grátis" de calcular, continua a ser conteúdo de quem
 * pagou pela análise. A versão anterior desta rota não pedia sessão nenhuma (raciocínio: "não é
 * uma chamada à IA, não custa dinheiro"), e por isso qualquer pessoa, mesmo sem conta, conseguia
 * ver os números do resumo de um relatório sem nunca o ter desbloqueado — encontrado ao vivo em
 * produção. O dataset e o nível geográfico continuam a ser escolhidos por quem pede: automatizar
 * essa escolha exigiria associar cada "tema" de afirmação a um dataset do catálogo, o que é um
 * problema de descoberta em si e fica fora do que esta ronda entrega.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ erro: 'Identificador inválido' }, { status: 400 })

  const sessao = await getCurrentUser()
  const admin = sessao ? await getCurrentAdmin() : null
  const podeVer = !!admin || (sessao ? await temAcesso(id, sessao.userId) : false)
  if (!podeVer) return NextResponse.json({ erro: 'Sem acesso a este relatório' }, { status: 403 })

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

    // Esta escolha (dataset + colunas) fica como referência: é o que permite ao lote periódico
    // (verificacao-periodica.ts) repetir sozinha a MESMA comparação mais tarde, sem precisar de
    // ninguém a escolher de novo, e apanhar se o dataset mudar depois de hoje.
    try {
      await guardarReferenciaVerificacao({
        reportId: id,
        datasetId,
        nivelGeo,
        colunaMetrica: corpo?.colunaMetrica || undefined,
        colunaIndicador: corpo?.colunaIndicador || undefined,
        valorIndicador: corpo?.valorIndicador || undefined,
        colunaTempo: corpo?.colunaTempo || undefined,
        unidadeMetrica: corpo?.unidadeMetrica || undefined,
      })
      const confirma = resultados.filter((r: any) => r.veredicto.estado === 'confirma').length
      const diverge = resultados.filter((r: any) => r.veredicto.estado === 'diverge').length
      const naoComparavel = resultados.length - confirma - diverge
      await guardarEstadoVerificacao(id, {
        totalAfirmacoes: resultados.length,
        totalConfirma: confirma,
        totalDiverge: diverge,
        totalNaoComparavel: naoComparavel,
        estado: diverge > 0 ? 'divergente' : 'ok',
      })
    } catch (erroReferencia: any) {
      // Guardar a referência é um extra (permite o lote periódico); uma falha aqui não pode
      // impedir quem pediu a verificação agora de ver o resultado que já tem.
      logger.error('erro_guardar_referencia_verificacao', { error: erroReferencia, reportId: id })
    }

    return NextResponse.json({ resultados })
  } catch (erro: any) {
    logger.error('erro_verificar_relatorio', { error: erro, reportId: id, datasetId })
    return NextResponse.json({ erro: 'Não foi possível verificar contra este dataset' }, { status: 500 })
  }
}
