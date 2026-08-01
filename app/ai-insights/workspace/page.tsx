import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth'
import { findAllCategories, findDatasets } from '@/lib/db'
import { AIWorkspaceClient, type WorkspaceCategory, type WorkspaceDataset } from '@/components/ai-insights/AIWorkspaceClient'

export const dynamic = 'force-dynamic'

export default async function AIWorkspacePage() {
  const user = await getCurrentUserProfile()
  if (!user) {
    redirect('/login?next=/ai-insights/workspace')
  }

  const [categoryRows, datasetRows] = await Promise.all([
    findAllCategories(),
    findDatasets({ take: 1000 }),
  ])

  const categories: WorkspaceCategory[] = (categoryRows as any[]).map((c) => ({
    id: c.id,
    name: c.name,
    dataType: c.dataType,
  }))

  const datasets: WorkspaceDataset[] = (datasetRows as any[]).map((d) => ({
    id: d.id,
    title: d.title,
    source: d.source ?? null,
    year: d.year ?? null,
    dataType: d.dataType,
    format: d.format ?? null,
    category: d.category?.id
      ? { id: d.category.id, name: d.category.name, dataType: d.category.dataType }
      : null,
  }))

  return (
    <AIWorkspaceClient
      user={{ id: user.id, name: user.name, email: user.email }}
      categories={categories}
      datasets={datasets}
    />
  )
}
