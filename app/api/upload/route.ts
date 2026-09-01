import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { getCurrentAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'

// Formatos aceites pelo portal: geoespaciais, alfanuméricos e imagens de pré-visualização.
// Apenas extensões desta lista podem ser gravadas em disco.
const ALLOWED_EXTENSIONS = new Set([
  '.zip', '.geojson', '.json', '.tif', '.tiff', '.shp', '.shx', '.dbf', '.prj', '.kml', '.kmz', '.gpkg',
  '.csv', '.xlsx', '.xls', '.ods', '.xml', '.txt', '.tsv',
  '.png', '.jpg', '.jpeg', '.webp', '.gif',
  // Relatórios: nenhum dos 13 registados tinha ficheiro, e a causa era esta lista, não falta de
  // vontade de ninguém — .pdf nunca esteve na allowlist, por isso todo carregamento de relatório
  // falhava em silêncio antes de chegar ao disco.
  '.pdf',
])

/** Extrai e valida a extensão do nome original — rejeita qualquer coisa fora de `.[a-z0-9]{1,6}` para impedir path traversal via nome de ficheiro manipulado. */
function getSafeExtension(originalName: string): string | null {
  const lower = originalName.toLowerCase()
  const dotIndex = lower.lastIndexOf('.')
  if (dotIndex === -1) return null
  const ext = lower.slice(dotIndex)
  if (!/^\.[a-z0-9]{1,6}$/.test(ext)) return null
  if (!ALLOWED_EXTENSIONS.has(ext)) return null
  return ext
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo (máximo 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 100MB' },
        { status: 400 }
      )
    }

    const fileExtension = getSafeExtension(file.name)
    if (!fileExtension) {
      return NextResponse.json(
        { error: 'Tipo de ficheiro não suportado.' },
        { status: 400 }
      )
    }

    // Criar diretório de uploads se não existir
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Gerar nome único para o arquivo (extensão já validada contra a allowlist acima)
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `${timestamp}-${randomString}${fileExtension}`
    const filePath = join(uploadsDir, fileName)

    // Salvar arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Retornar caminho relativo para salvar no banco
    const relativePath = `/uploads/${fileName}`
    const fileSize = formatFileSize(file.size)

    return NextResponse.json({
      success: true,
      filePath: relativePath,
      fileName: file.name,
      fileSize: fileSize,
      originalSize: file.size,
    })
  } catch (error) {
    logger.error('upload.failed', { error })
    return NextResponse.json(
      { error: 'Erro ao fazer upload do arquivo.' },
      { status: 500 }
    )
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
