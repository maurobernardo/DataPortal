export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { correrBackup } from '@/lib/backup/rotacao'
import { logger } from '@/lib/logger'
import { hasAuthMailConfig, sendBackupFalhouEmail } from '@/lib/mailer'

/**
 * Backup diário/semanal/mensal da base de dados. Pensado para ser chamado UMA VEZ POR DIA por um
 * cron job do cPanel — decide sozinho, pela data de hoje, quais os níveis a gerar:
 *   - diário: sempre
 *   - semanal: aos domingos
 *   - mensal: no dia 1 de cada mês
 * Mesmo desenho e mesmo CRON_SECRET dos outros crons do portal:
 *   POST /api/cron/backup?token=CRON_SECRET
 */
async function correr(req: NextRequest) {
  const segredoConfigurado = process.env.CRON_SECRET?.trim()
  if (!segredoConfigurado) {
    return NextResponse.json({ error: 'CRON_SECRET não está configurado' }, { status: 500 })
  }
  const fornecido = req.nextUrl.searchParams.get('token') || req.headers.get('x-cron-secret')
  if (fornecido !== segredoConfigurado) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const hoje = new Date()
  const niveis: ('diario' | 'semanal' | 'mensal')[] = ['diario']
  if (hoje.getUTCDay() === 0) niveis.push('semanal')
  if (hoje.getUTCDate() === 1) niveis.push('mensal')

  const resultados: Record<string, unknown> = {}
  for (const nivel of niveis) {
    try {
      resultados[nivel] = await correrBackup(nivel)
    } catch (error) {
      const mensagemErro = error instanceof Error ? error.message : String(error)
      logger.error('cron.backup.falhou', { nivel, error })
      resultados[nivel] = { erro: mensagemErro }

      if (hasAuthMailConfig()) {
        const destinatarios = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean)
        for (const destinatario of destinatarios) {
          sendBackupFalhouEmail(destinatario, nivel, mensagemErro).catch((e) =>
            logger.error('cron.backup.erro_enviar_alerta', { error: e })
          )
        }
      }
    }
  }

  return NextResponse.json({ niveis_processados: niveis, resultados })
}

export async function GET(req: NextRequest) {
  return correr(req)
}

export async function POST(req: NextRequest) {
  return correr(req)
}
