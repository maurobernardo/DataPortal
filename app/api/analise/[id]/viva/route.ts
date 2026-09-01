export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { obterAnalise } from '@/lib/analysis/persistencia'
import { definirViva, listarCorridas, obterViva, proximaCorrida, type Periodicidade } from '@/lib/analysis/viva'
import { recorrerAnalise } from '@/lib/analysis/recorrer'
import { logger } from '@/lib/logger'

const PERIODICIDADES: Periodicidade[] = ['semanal', 'mensal', 'trimestral']

/**
 * Acompanhar uma pergunta ao longo do tempo.
 *
 * Só o DONO da análise pode ligar o acompanhamento, mesmo numa análise pública. Ver é uma coisa;
 * mandar o portal correr trabalho de forma recorrente, por conta de outra pessoa, é outra.
 */
async function exigirDono(id: string, userId: number) {
  const analise = await obterAnalise(id)
  if (!analise) return { erro: NextResponse.json({ erro: 'Análise não encontrada' }, { status: 404 }) }
  if (analise.utilizador_id !== userId) {
    return { erro: NextResponse.json({ erro: 'Só quem criou a análise a pode acompanhar' }, { status: 403 }) }
  }
  return { analise }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const analise = await obterAnalise(params.id)
  if (!analise) return NextResponse.json({ erro: 'Análise não encontrada' }, { status: 404 })
  if (!analise.publico && analise.utilizador_id !== sessao.userId) {
    return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  }

  const viva = await obterViva(params.id)
  return NextResponse.json({
    viva,
    proxima: viva ? proximaCorrida(viva).toISOString() : null,
    corridas: viva ? await listarCorridas(params.id) : [],
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  const dono = await exigirDono(params.id, sessao.userId)
  if (dono.erro) return dono.erro

  const corpo = await req.json().catch(() => ({}))
  const activa = corpo?.activa !== false
  const bruta = String(corpo?.periodicidade || 'mensal') as Periodicidade
  const periodicidade = PERIODICIDADES.includes(bruta) ? bruta : 'mensal'

  await definirViva(params.id, sessao.userId, activa, periodicidade)
  const viva = await obterViva(params.id)
  return NextResponse.json({ viva, proxima: viva ? proximaCorrida(viva).toISOString() : null })
}

/**
 * Correr agora, sem esperar pela data.
 *
 * Uma análise inteira leva de trinta segundos a alguns minutos, e por isso isto não devolve nada
 * até acabar. É aceitável porque é um pedido explícito de quem está a olhar para o ecrã; o
 * acompanhamento automático corre pela rota de manutenção, fora de qualquer pedido de utilizador.
 */
export async function PUT(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  const dono = await exigirDono(params.id, sessao.userId)
  if (dono.erro) return dono.erro

  if (!(await obterViva(params.id))) {
    return NextResponse.json({ erro: 'Esta análise ainda não está a ser acompanhada' }, { status: 409 })
  }

  try {
    const r = await recorrerAnalise(params.id)
    if (!r) return NextResponse.json({ erro: 'Não foi possível voltar a correr' }, { status: 500 })
    return NextResponse.json({ analise_id: r.analiseId, comparacao: r.comparacao })
  } catch (erro: any) {
    logger.error('erro_recorrer_analise', { error: erro, raizId: params.id })
    return NextResponse.json({ erro: 'A nova corrida falhou. A análise anterior continua válida.' }, { status: 500 })
  }
}
