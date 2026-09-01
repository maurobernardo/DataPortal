export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { obterAnalise } from '@/lib/analysis/persistencia'
import { apagarAnotacao, criarAnotacao, listarAnotacoes, MAX_CARACTERES } from '@/lib/analysis/anotacoes'

/**
 * Anotações de uma análise.
 *
 * O acesso segue a mesma regra do resto da análise: quem pode ver a análise pode ver as notas. Uma
 * análise partilhada com o público tem notas públicas, e é preciso que seja evidente para quem
 * escreve, por isso o aviso está no próprio painel e não só aqui.
 */
async function analiseAcessivel(id: string, userId: number) {
  const analise = await obterAnalise(id)
  if (!analise) return null
  if (!analise.publico && analise.utilizador_id !== userId) return null
  return analise
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!(await analiseAcessivel(params.id, sessao.userId))) {
    return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  }
  return NextResponse.json({ anotacoes: await listarAnotacoes(params.id) })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!(await analiseAcessivel(params.id, sessao.userId))) {
    return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  }

  const corpo = await req.json().catch(() => ({}))
  const texto = String(corpo?.texto ?? '').trim()
  if (!texto) return NextResponse.json({ erro: 'Nota vazia' }, { status: 400 })
  if (texto.length > MAX_CARACTERES) {
    return NextResponse.json({ erro: `Máximo de ${MAX_CARACTERES} caracteres` }, { status: 400 })
  }

  const id = await criarAnotacao({
    analiseId: params.id,
    utilizadorId: sessao.userId,
    ancora: String(corpo?.ancora ?? ''),
    texto,
  })
  if (!id) return NextResponse.json({ erro: 'Não foi possível guardar' }, { status: 400 })
  return NextResponse.json({ anotacoes: await listarAnotacoes(params.id) })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const anotacaoId = Number(req.nextUrl.searchParams.get('anotacao'))
  if (!Number.isFinite(anotacaoId)) {
    return NextResponse.json({ erro: 'Anotação não indicada' }, { status: 400 })
  }
  // Sem leitura prévia: a posse é condição da própria instrução de apagar. Uma nota de outra
  // pessoa devolve 403 pelo mesmo caminho que uma nota inexistente, e é o que se quer, porque
  // distinguir as duas diria a quem tenta que a nota existe.
  const apagou = await apagarAnotacao(anotacaoId, sessao.userId)
  if (!apagou) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  return NextResponse.json({ anotacoes: await listarAnotacoes(params.id) })
}
