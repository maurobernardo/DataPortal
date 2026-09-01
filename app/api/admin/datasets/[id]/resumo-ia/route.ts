import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { gerarResumoDataset } from '@/lib/analysis/inteligencia-catalogo'
import { rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const rl = await rateLimit(`resumo-ia:${admin.userId}`, 20, 60 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Muitos pedidos. Tente novamente em instantes.' }, { status: 429 })
    }

    const id = Number.parseInt(params.id, 10)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const resultado = await gerarResumoDataset(id)
    return NextResponse.json(resultado)
  } catch (error) {
    logger.error('erro_gerar_resumo_ia_dataset', { error })
    return NextResponse.json({ error: 'Erro ao gerar resumo' }, { status: 500 })
  }
}
