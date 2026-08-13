export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { findDatasetById } from '@/lib/db'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import { logger } from '@/lib/logger'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const datasetId = Number.parseInt(params.id, 10)
    if (!Number.isFinite(datasetId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const dataset = await findDatasetById(datasetId)
    if (!dataset || !dataset.filePath) {
      return NextResponse.json({ error: 'Dataset/arquivo não encontrado' }, { status: 404 })
    }

    const absPath = join(process.cwd(), 'public', dataset.filePath)
    if (!existsSync(absPath)) {
      return NextResponse.json({ error: 'Arquivo não encontrado no servidor' }, { status: 404 })
    }

    const buf = await readFile(absPath)
    const sha256 = createHash('sha256').update(buf).digest('hex')
    return NextResponse.json({ sha256 })
  } catch (error) {
    logger.error('error_computing_checksum', { error: error })
    return NextResponse.json({ error: 'Erro ao calcular checksum' }, { status: 500 })
  }
}