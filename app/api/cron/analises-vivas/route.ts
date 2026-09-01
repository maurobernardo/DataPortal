export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { listarVivasVencidas } from '@/lib/analysis/viva'
import { recorrerAnalise } from '@/lib/analysis/recorrer'
import { logger } from '@/lib/logger'

/**
 * O acompanhamento automático das análises vivas.
 *
 * O Next.js não tem agendador, por isso isto é chamado de fora (cron do servidor, Tarefas Agendadas
 * do Windows, ou o cron job do alojamento):
 *   POST /api/cron/analises-vivas?token=CRON_SECRET
 *
 * Usa o MESMO `CRON_SECRET` da exportação agendada de relatórios, e aceita o segredo pelos mesmos
 * dois caminhos (`?token=` ou o cabeçalho `x-cron-secret`). A primeira versão inventou uma variável
 * própria, e isso é uma dívida disfarçada de segurança: dois segredos para a mesma função significa
 * que um deles vai ser rodado e o outro esquecido, e a rota esquecida deixa de correr sem ninguém
 * dar por isso até alguém reparar que um painel parou.
 *
 * Corre UMA análise por chamada, por omissão. Cada uma pode levar minutos, e encadear dez numa só
 * chamada é a forma certa de bater no tempo limite a meio da terceira e deixar as sete últimas por
 * fazer, sem registo de que faltaram. Uma de cada vez apanha a fila mais devagar e nunca perde
 * trabalho pelo caminho.
 */
async function correr(req: NextRequest) {
  const segredoConfigurado = process.env.CRON_SECRET?.trim()
  if (!segredoConfigurado) {
    return NextResponse.json({ error: 'CRON_SECRET não está configurado' }, { status: 500 })
  }
  const fornecido = req.nextUrl.searchParams.get('token') || req.headers.get('x-cron-secret')
  if (fornecido !== segredoConfigurado) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const quantas = Math.min(3, Math.max(1, Number(req.nextUrl.searchParams.get('quantas') || 1)))
  const vencidas = await listarVivasVencidas(quantas)
  const feitas: { raiz_id: string; analise_id?: string; erro?: string }[] = []

  for (const viva of vencidas) {
    try {
      const r = await recorrerAnalise(viva.raiz_id)
      feitas.push({ raiz_id: viva.raiz_id, analise_id: r?.analiseId })
    } catch (erro: any) {
      // Uma falha não pode parar a fila nem limpar a marca de "vencida": a próxima chamada volta a
      // apanhar esta análise, que é o comportamento certo para um problema passageiro.
      logger.error('erro_corrida_automatica', { error: erro, raizId: viva.raiz_id })
      feitas.push({ raiz_id: viva.raiz_id, erro: 'falhou' })
    }
  }

  return NextResponse.json({ vencidas: vencidas.length, corridas: feitas })
}

/**
 * GET e POST fazem o mesmo, e é de propósito: a rota irmã dos relatórios responde a GET, e muitos
 * serviços de cron de alojamento partilhado só sabem pedir um URL. Obrigar a POST aqui garantiria
 * que alguém configurava um GET, recebia 405 em silêncio, e descobria semanas depois que o
 * acompanhamento nunca correu.
 */
export async function GET(req: NextRequest) {
  return correr(req)
}

export async function POST(req: NextRequest) {
  return correr(req)
}
