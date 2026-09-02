export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { concederAcesso, obterDigesto } from '@/lib/relatorios/persistencia'
import { processarRelatorio, reservarProcessamento, RelatorioNaoProcessavelError } from '@/lib/relatorios/processar'
import { logger } from '@/lib/logger'

/**
 * Gera o resumo deste relatório, a pedido de quem o está a ler.
 *
 * Exige sessão: é o botão "Analisar" na página pública, e é uma chamada real ao modelo sobre o
 * documento inteiro, com custo a sério. Se outra pessoa já tiver pedido a análise deste mesmo
 * relatório entretanto (ou a equipa já a tiver preparado), reaproveita-se o trabalho já feito em
 * vez de processar outra vez: o CUSTO é por relatório, não por pessoa que o lê.
 *
 * Mas o ACESSO ao resultado é por pessoa, sempre: `concederAcesso` corre em todos os caminhos que
 * terminam com um resumo pronto, incluindo o reaproveitado. Sem isto, a primeira pessoa a pedir a
 * análise desbloquearia o resumo para toda a gente que visitasse a página depois dela, o que é o
 * oposto do que uma funcionalidade paga por pessoa devia fazer.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ erro: 'Identificador inválido' }, { status: 400 })

  const jaPronto = await obterDigesto(id, 'pt')
  if (jaPronto) {
    await concederAcesso(id, sessao.userId)
    return NextResponse.json({ estado: 'pronto', reaproveitado: true })
  }

  if (!(await reservarProcessamento(id))) {
    return NextResponse.json({ estado: 'a_processar' })
  }

  // Um relatório longo (o gatilho real disto: um de 196 páginas) pode levar bem mais de um minuto
  // a processar, e o proxy à frente da aplicação em hosting partilhado costuma ter um limite de
  // tempo bem mais curto do que isso — visto ao vivo: o browser recebia uma página de erro em HTML
  // a meio, mesmo com o processamento a continuar e a terminar bem no servidor. Por isso esta
  // pedida NÃO espera pelo resultado: reserva o processamento (já feito acima), dispara-o e
  // responde já "a processar". A página já sabe perguntar de 4 em 4 segundos se terminou
  // (`EmAnaliseRelatorio`), exactamente para este caso.
  processarRelatorio(id, sessao.userId)
    .then(async (resultado) => {
      if (resultado.estado === 'pronto') await concederAcesso(id, sessao.userId)
    })
    .catch((erro: any) => {
      if (!(erro instanceof RelatorioNaoProcessavelError)) {
        logger.error('erro_analisar_relatorio', { error: erro, reportId: id })
      }
    })

  return NextResponse.json({ estado: 'a_processar' })
}
