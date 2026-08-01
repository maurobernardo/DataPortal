import { NextRequest, NextResponse } from 'next/server'
import { isValidEmail, normalizeEmail, normalizeText, rateLimit } from '@/lib/security'
import { hasMailConfig, sendContactEmail } from '@/lib/mailer'
import { createMapRequest, recordMapStat } from '@/lib/db'
import { findMapBySlug } from '@/lib/maps-catalog'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimit(`map-request:${ip}`, 20, 60 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas solicitações. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const body = await request.json()
    const slug = normalizeText(body?.slug, 80)
    const name = normalizeText(body?.name, 120)
    const email = normalizeEmail(body?.email)
    const message = normalizeText(body?.message, 5000)

    const map = findMapBySlug(slug)
    if (!map) {
      return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 })
    }

    if (!name || !email) {
      return NextResponse.json({ error: 'Preencha nome e email.' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    }

    await createMapRequest({ slug, name, email, message: message || null })
    await recordMapStat(slug, 'request')

    if (hasMailConfig()) {
      await sendContactEmail({
        fromName: name,
        fromEmail: email,
        subject: `Pedido de informação: ${map.title}`,
        message: message || '(sem mensagem adicional)',
      })
    } else {
      logger.warn('smtp_nao_configurado_pedido_de_mapa_guardado_apenas_na_bd')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('error_creating_map_request', { error })
    return NextResponse.json({ error: 'Erro ao enviar pedido' }, { status: 500 })
  }
}
