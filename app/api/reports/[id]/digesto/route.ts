export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin, getCurrentUser } from '@/lib/auth'
import { obterEstado, obterDigesto, temAcesso } from '@/lib/relatorios/persistencia'

/**
 * O digesto de um relatório, só para quem o desbloqueou.
 *
 * O resumo é gerado uma vez (o custo é por relatório), mas VER o conteúdo é por pessoa: sem sessão,
 * ou com sessão mas sem nunca ter pedido a análise deste relatório, a resposta não leva o digesto,
 * só o `estado` (para a página saber se deve mostrar "iniciar sessão" ou "analisar"). Um admin vê
 * sempre, para poder confirmar que um processamento correu bem sem ter de pedir acesso a si
 * próprio.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ erro: 'Identificador inválido' }, { status: 400 })

  const idioma = req.nextUrl.searchParams.get('idioma') === 'en' ? 'en' : 'pt'
  const estado = await obterEstado(id)

  const sessao = await getCurrentUser()
  const admin = sessao ? await getCurrentAdmin() : null
  const podeVer = !!admin || (sessao ? await temAcesso(id, sessao.userId) : false)

  const digesto = podeVer ? await obterDigesto(id, idioma) : null

  return NextResponse.json({ digesto, estado: estado?.estado ?? 'pendente', mensagem: estado?.mensagem ?? null })
}
