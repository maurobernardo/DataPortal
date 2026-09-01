import { NextRequest, NextResponse } from 'next/server'
import { executarRelatoriosDevidos } from '@/lib/relatorios-agendados'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * Ponto de entrada para o disparo diário da exportação agendada de relatórios. O Next.js não tem
 * agendador embutido, por isso isto tem de ser chamado de fora uma vez por dia (Tarefas Agendadas
 * do Windows, cron do servidor, ou um cron job do serviço de hosting) com:
 *   GET /api/cron/relatorios-agendados?token=CRON_SECRET
 * CRON_SECRET é definido no .env; sem ele configurado, a rota recusa-se a correr.
 */
export async function GET(request: NextRequest) {
  const segredoConfigurado = process.env.CRON_SECRET?.trim()
  if (!segredoConfigurado) {
    return NextResponse.json({ error: 'CRON_SECRET não está configurado' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const tokenFornecido = searchParams.get('token') || request.headers.get('x-cron-secret')
  if (tokenFornecido !== segredoConfigurado) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const resultado = await executarRelatoriosDevidos()
    return NextResponse.json(resultado)
  } catch (erro) {
    logger.error('erro_cron_relatorios_agendados', { error: erro })
    return NextResponse.json({ error: 'Falha ao processar relatórios agendados' }, { status: 500 })
  }
}
