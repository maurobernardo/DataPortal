import { db, findDatasets, setDatasetPreviewMeta } from '../lib/db'
import { getDatasetPreview } from '../lib/dataset-preview'

async function main() {
  const datasets = await findDatasets({ take: 10_000 })
  console.log(`A processar ${datasets.length} datasets...`)

  let ok = 0
  let failed = 0

  for (const dataset of datasets) {
    try {
      const preview = await getDatasetPreview(dataset)
      const available = 'type' in preview && (preview.type === 'table' || preview.type === 'geo')
      const bbox = 'type' in preview && preview.type === 'geo' ? preview.bbox : null
      await setDatasetPreviewMeta(dataset.id, { previewAvailable: available, bbox })
      ok++
      console.log(`#${dataset.id} ${dataset.title}: previewAvailable=${available}${bbox ? ` bbox=${bbox.join(',')}` : ''}`)
    } catch (e) {
      failed++
      console.error(`#${dataset.id} ${dataset.title}: erro`, e)
    }
  }

  console.log(`Concluído. ok=${ok} falhas=${failed}`)
}

main()
  .then(() => db.end())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
