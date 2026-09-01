import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { verificarQualidadeDataset } from '@/lib/analysis/inteligencia-catalogo'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const id = Number.parseInt(params.id, 10)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const resultado = await verificarQualidadeDataset(id)
    return NextResponse.json(resultado)
  } catch (error) {
    logger.error('erro_verificar_qualidade_dataset', { error })
    return NextResponse.json({ error: 'Erro ao verificar qualidade' }, { status: 500 })
  }
}
