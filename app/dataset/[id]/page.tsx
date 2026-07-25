// Forçar SSR para evitar erro de static paths
export const dynamic = 'force-dynamic'

import { findDatasetById } from '@/lib/db'
import { notFound } from 'next/navigation'
import { incrementView } from './actions'
import { GeoDatasetDetailView } from '@/components/geo/GeoDatasetDetailView'
import { AlfDatasetDetailView } from '@/components/alf/AlfDatasetDetailView'
import '@/app/geo-catalog.css'

async function getDataset(id: number) {
  return await findDatasetById(id)
}

export default async function DatasetPage({
  params,
}: {
  params: { id: string }
}) {
  const id = parseInt(params.id)
  const dataset = await getDataset(id)

  if (!dataset) {
    notFound()
  }

  await incrementView(id)

  if (dataset.dataType === 'alfanumerico') {
    return <AlfDatasetDetailView dataset={dataset} />
  }

  return <GeoDatasetDetailView dataset={dataset} />
}
