import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { deleteMapOverride, upsertMapOverride } from '@/lib/db'
import { findMapBySlug } from '@/lib/maps-catalog'
import { normalizeText } from '@/lib/security'
import { logger } from '@/lib/logger'

export async function PUT(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    if (!findMapBySlug(params.slug)) {
      return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const badges = Array.isArray(body?.badges)
      ? body.badges.map((b: unknown) => normalizeText(b, 60)).filter(Boolean)
      : []
    const highlights = Array.isArray(body?.highlights)
      ? body.highlights.map((h: unknown) => normalizeText(h, 160)).filter(Boolean)
      : []

    await upsertMapOverride(params.slug, {
      title: normalizeText(body?.title, 255) || null,
      subtitle: normalizeText(body?.subtitle, 255) || null,
      description: normalizeText(body?.description, 2000) || null,
      coverage: normalizeText(body?.coverage, 255) || null,
      category: normalizeText(body?.category, 120) || null,
      badgesJson: badges.length ? JSON.stringify(badges) : null,
      highlightsJson: highlights.length ? JSON.stringify(highlights) : null,
      featured: typeof body?.featured === 'boolean' ? body.featured : null,
      heroStatValue: normalizeText(body?.heroStatValue, 40) || null,
      heroStatLabel: normalizeText(body?.heroStatLabel, 80) || null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('error_saving_map_override', { error })
    return NextResponse.json({ error: 'Erro ao guardar sobreposição do mapa' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }
    await deleteMapOverride(params.slug)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('error_deleting_map_override', { error })
    return NextResponse.json({ error: 'Erro ao repor predefinições do mapa' }, { status: 500 })
  }
}
