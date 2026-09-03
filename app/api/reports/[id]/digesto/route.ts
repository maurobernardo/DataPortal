export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin, getCurrentUser } from '@/lib/auth'
import { concederAcesso, obterEstado, obterDigesto, temAcesso, temPedido } from '@/lib/relatorios/persistencia'

/**
 * O digesto de um relatório, só para quem o desbloqueou — e o ESTADO também, não só o conteúdo.
 *
 * O resumo é gerado uma vez (o custo é por relatório: reprocessar o mesmo PDF duas vezes não muda
 * o resultado, só desperdiça dinheiro), mas cada conta tem de pedir a sua própria análise, nunca
 * ver a de outra pessoa de borla. `relatorio_estado` é global (uma linha por relatório) — sem mais
 * nada, uma conta B que nunca clicou em nada via directamente "a processar" ao abrir a página
 * enquanto a conta A tinha uma análise em curso, ou pior, o resumo pronto assim que A terminasse
 * (visto ao vivo em produção). Por isso o `estado` real global só é revelado a quem tem acesso já
 * concedido, é admin, ou já pediu esta análise a si próprio (`temPedido`, gravado no momento em
 * que a própria conta clica em "Analisar"); todas as outras contas veem sempre "pendente", o
 * mesmo que se ninguém tivesse pedido nada, e o botão "Analisar" continua ali para elas pedirem a
 * sua.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ erro: 'Identificador inválido' }, { status: 400 })

  const idioma = req.nextUrl.searchParams.get('idioma') === 'en' ? 'en' : 'pt'
  const estado = await obterEstado(id)

  const sessao = await getCurrentUser()
  const admin = sessao ? await getCurrentAdmin() : null
  let podeVer = !!admin || (sessao ? await temAcesso(id, sessao.userId) : false)
  const pediuEsta = sessao ? await temPedido(id, sessao.userId) : false

  // Auto-conclusão do pedido desta conta: se já pediu, e o processamento (seja de quem for) já
  // terminou, esta é a oportunidade de lhe conceder o acesso que ela própria pediu, sem precisar
  // de voltar a clicar em "Analisar" outra vez só para "confirmar" um trabalho já feito.
  if (sessao && pediuEsta && !podeVer && estado?.estado === 'pronto') {
    await concederAcesso(id, sessao.userId)
    podeVer = true
  }

  const digesto = podeVer ? await obterDigesto(id, idioma) : null
  const estadoRevelado = podeVer || !!admin || pediuEsta ? estado?.estado ?? 'pendente' : 'pendente'

  return NextResponse.json({ digesto, estado: estadoRevelado, mensagem: estado?.mensagem ?? null })
}
