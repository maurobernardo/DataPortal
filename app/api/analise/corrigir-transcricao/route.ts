import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { corrigirTranscricaoVoz } from '@/lib/analysis/transcricao'
import { rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const sessao = await getCurrentUser()
  if (!sessao) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const rl = await rateLimit(`transcricao:${sessao.userId}`, 30, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente daqui a pouco.' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const texto = typeof body?.texto === 'string' ? body.texto : ''
  if (!texto.trim()) {
    return NextResponse.json({ error: 'Texto em falta' }, { status: 400 })
  }
  if (texto.length > 1000) {
    return NextResponse.json({ error: 'Texto demasiado longo' }, { status: 400 })
  }

  try {
    const resultado = await corrigirTranscricaoVoz(texto)
    return NextResponse.json(resultado)
  } catch (erro) {
    logger.error('erro_corrigir_transcricao_voz', { error: erro })
    return NextResponse.json({ error: 'Não foi possível corrigir o texto agora.' }, { status: 502 })
  }
}
