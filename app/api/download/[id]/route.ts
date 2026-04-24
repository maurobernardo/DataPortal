import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import {
  createStatistic,
  findDatasetById,
  incrementDatasetDownloads,
} from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const datasetId = parseInt(params.id)
    
    const dataset = await findDatasetById(datasetId)

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o arquivo existe
    if (!dataset.filePath) {
      return NextResponse.json(
        { error: 'Arquivo não disponível' },
        { status: 404 }
      )
    }

    const filePath = join(process.cwd(), 'public', dataset.filePath)
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Arquivo não encontrado no servidor' },
        { status: 404 }
      )
    }

    // Ler o arquivo
    const fileBuffer = await readFile(filePath)
    // Usar o título do dataset como nome do arquivo para download, mantendo a extensão original
    const originalFileName = dataset.filePath.split('/').pop() || `dataset-${datasetId}`
    const fileExtension = originalFileName.split('.').pop()?.toLowerCase() || 
                         (dataset.format.toLowerCase() === 'geotiff' ? 'tiff' : 
                         dataset.format.toLowerCase() === 'shapefile/csv' ? 'csv' :
                         dataset.format.toLowerCase() === 'shapefile' ? 'shp' :
                         dataset.format.toLowerCase())
    const fileName = `${dataset.title.replace(/[^a-zA-Z0-9.-]/g, '_')}.${fileExtension}`

    // Incrementar contador de downloads
    await incrementDatasetDownloads(datasetId)

    // Registrar estatística
    await createStatistic(datasetId, 'download')

    // Retornar o arquivo para download
    const contentType = fileName.endsWith('.zip') ? 'application/zip' :
                      fileName.endsWith('.tif') || fileName.endsWith('.tiff') ? 'image/tiff' :
                      fileName.endsWith('.shp') ? 'application/octet-stream' : // Shapefiles são binários
                      fileName.endsWith('.csv') ? 'text/csv' :
                      'application/octet-stream' // tipo padrão
    
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('Error downloading file:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer download do arquivo' },
      { status: 500 }
    )
  }
}













