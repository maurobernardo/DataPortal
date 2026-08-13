import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { findDatasets } from '@/lib/db'
import { NovaAnaliseClient, type DatasetParaEscolha } from '@/components/analise/NovaAnaliseClient'

export const dynamic = 'force-dynamic'

export default async function PaginaNovaAnalise() {
  const sessao = await getCurrentUser()
  if (!sessao) redirect('/login?next=/analise/nova')

  const datasetRows = await findDatasets({ take: 1000 })
  const datasets: DatasetParaEscolha[] = (datasetRows as any[]).map((d) => ({
    id: d.id,
    title: d.title,
    dataType: d.dataType,
    source: d.source ?? null,
    year: d.year ?? null,
    format: d.format ?? null,
    description: d.description ?? null,
    category: d.category?.id ? { id: d.category.id, name: d.category.name } : null,
  }))

  return <NovaAnaliseClient datasets={datasets} />
}
