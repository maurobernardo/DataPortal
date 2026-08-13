export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'fs'
import { join } from 'path'
import archiver from 'archiver'
import { createStatistic, findDatasetsByIds, incrementDatasetDownloads } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { recordDailyUsageAndMaybeAlertAdmins } from '@/lib/notifications'
import { registarAcesso } from '@/lib/origem'
import { logger } from '@/lib/logger'

const MAX_BATCH = 20

/** Downloads temporariamente desactivados a pedido do administrador (geoespaciais e alfanuméricos). */
const DOWNLOADS_DESACTIVADOS = true

export async function POST(request: NextRequest) {
  if (DOWNLOADS_DESACTIVADOS) {
    return NextResponse.json({ error: 'O download de dados está temporariamente indisponível.' }, { status: 423 })
  }
  try {
    const body = await request.json().catch(() => null)
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((v: unknown) => Number.parseInt(String(v), 10)).filter((n: number) => Number.isFinite(n))
      : []

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Nenhum dataset selecionado' }, { status: 400 })
    }
    if (ids.length > MAX_BATCH) {
      return NextResponse.json({ error: `Máximo de ${MAX_BATCH} ficheiros por descarregamento` }, { status: 400 })
    }

    const datasets = await findDatasetsByIds(ids)
    const withFiles = datasets.filter((d: any) => d.filePath && existsSync(join(process.cwd(), 'public', d.filePath)))

    if (withFiles.length === 0) {
      return NextResponse.json({ error: 'Nenhum dos ficheiros selecionados está disponível' }, { status: 404 })
    }

    const archive = archiver('zip', { zlib: { level: 6 } })
    const chunks: Buffer[] = []
    archive.on('data', (chunk: Buffer) => chunks.push(chunk))
    archive.on('warning', (warn) => logger.warn('batch_download.archive_warning', { warn }))

    const done = new Promise<void>((resolve, reject) => {
      archive.on('end', () => resolve())
      archive.on('error', (err) => reject(err))
    })

    const usedNames = new Set<string>()
    for (const dataset of withFiles) {
      const absPath = join(process.cwd(), 'public', dataset.filePath)
      const originalName = String(dataset.filePath).split('/').pop() || `dataset-${dataset.id}`
      const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : ''
      let safeName = `${String(dataset.title).replace(/[^a-zA-Z0-9.-]/g, '_')}${ext}`
      let suffix = 1
      while (usedNames.has(safeName)) {
        safeName = `${String(dataset.title).replace(/[^a-zA-Z0-9.-]/g, '_')}_${suffix++}${ext}`
      }
      usedNames.add(safeName)
      archive.file(absPath, { name: safeName })
    }

    archive.finalize()
    await done
    const zipBuffer = Buffer.concat(chunks)

    const session = await getCurrentUser()
    await Promise.all(
      withFiles.map(async (dataset: any) => {
        await incrementDatasetDownloads(dataset.id)
        await createStatistic(dataset.id, 'download', session?.userId)
        recordDailyUsageAndMaybeAlertAdmins('downloads')
        await registarAcesso(request, 'download', { referenciaId: dataset.id, utilizadorId: session?.userId })
      })
    )

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="datasets.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    logger.error('error_batch_downloading', { error })
    return NextResponse.json({ error: 'Erro ao gerar o ficheiro zip' }, { status: 500 })
  }
}
