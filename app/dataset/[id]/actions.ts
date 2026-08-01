'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import {
  createStatistic,
  findDatasetById,
  incrementDatasetDownloads,
  incrementDatasetViews,
} from '@/lib/db'
import { recordDailyUsageAndMaybeAlertAdmins } from '@/lib/notifications'

export async function incrementView(datasetId: number) {
  try {
    const session = await getCurrentUser()
    await incrementDatasetViews(datasetId)
    await createStatistic(datasetId, 'view', session?.userId)
    recordDailyUsageAndMaybeAlertAdmins('views')
    revalidatePath(`/dataset/${datasetId}`)
  } catch (error) {
    console.error('Error incrementing view:', error)
  }
}

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

export async function downloadDataset(formData: FormData) {
  const datasetId = parseInt(formData.get('datasetId') as string)

  try {
    const dataset = await findDatasetById(datasetId)

    if (!dataset) {
      throw new Error('Dataset not found')
    }

    // Incrementar contador de downloads
    await incrementDatasetDownloads(datasetId)
    const session = await getCurrentUser()
    await createStatistic(datasetId, 'download', session?.userId)
    recordDailyUsageAndMaybeAlertAdmins('downloads')

    revalidatePath(`/dataset/${datasetId}`)
    revalidatePath('/dashboard')

    // Verificar se o arquivo existe
    if (dataset.filePath) {
      const filePath = join(process.cwd(), 'public', dataset.filePath)
      
      if (existsSync(filePath)) {
        const fileBuffer = await readFile(filePath)
        const fileName = dataset.filePath.split('/').pop() || `dataset-${datasetId}.${dataset.format.toLowerCase()}`
        
        // Retornar o arquivo para download
        return new Response(new Uint8Array(fileBuffer), {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${fileName}"`,
          },
        })
      }
    }

    // Se o arquivo não existir, retornar erro
    throw new Error('Arquivo não encontrado')
  } catch (error) {
    console.error('Error downloading dataset:', error)
    throw error
  }
}

