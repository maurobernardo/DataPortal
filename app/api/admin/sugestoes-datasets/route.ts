import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/auth'
import {
  agruparPorPalavraChave,
  classificarPerguntasPendentes,
  enriquecerComFontesExternas,
  gerarSugestoes,
  gerarSugestoesTiposPorCategoria,
  listarSugestoesTiposPorCategoria,
  marcarSugestaoEmAvaliacao,
} from '@/lib/analysis/sugestoes-datasets'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUserProfile()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const [palavrasChave, sugestoesInfo, tiposPorCategoria] = await Promise.all([
    agruparPorPalavraChave(),
    gerarSugestoes(),
    listarSugestoesTiposPorCategoria(),
  ])
  return NextResponse.json({ palavrasChave, tiposPorCategoria, ...sugestoesInfo })
}

/** Dispara a classificação por modelo (Fase 2) e a análise de cobertura por categoria (Fase 5) —
 *  só sob pedido explícito do admin, nunca automático. */
export async function POST() {
  const user = await getCurrentUserProfile()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const [resultado, cobertura] = await Promise.all([
    classificarPerguntasPendentes(),
    gerarSugestoesTiposPorCategoria(),
  ])
  return NextResponse.json({ ...resultado, ...cobertura })
}

/** Fase 4/5: acções por sugestão, sempre sob pedido explícito do admin.
 *  acao "marcar": cria um pedido real no fluxo de Contacto/Serviços já existente.
 *  acao "enriquecer": pesquisa fontes externas reais sobre o tema (Sonnet + web search). */
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUserProfile()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const tema = body?.tema
  const acao = body?.acao || 'marcar'
  if (!tema || typeof tema !== 'string') {
    return NextResponse.json({ error: 'Tema em falta' }, { status: 400 })
  }

  const { sugestoes } = await gerarSugestoes()
  const sugestao = sugestoes.find((s) => s.tema === tema)
  if (!sugestao) {
    return NextResponse.json({ error: 'Sugestão não encontrada (pode já ter deixado de ter procura suficiente)' }, { status: 404 })
  }

  if (acao === 'enriquecer') {
    try {
      const resultado = await enriquecerComFontesExternas(tema, sugestao)
      return NextResponse.json(resultado)
    } catch (erro: any) {
      logger.error('erro_enriquecer_sugestao_dataset', { error: erro, tema })
      return NextResponse.json(
        { error: erro?.message || 'Não foi possível pesquisar fontes externas.' },
        { status: 502 }
      )
    }
  }

  await marcarSugestaoEmAvaliacao(tema, sugestao, { name: user.name, email: user.email })
  return NextResponse.json({ ok: true })
}
