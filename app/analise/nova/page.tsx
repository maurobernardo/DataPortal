import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { findDatasets } from '@/lib/db'
import { NovaAnaliseClient, type DatasetParaEscolha } from '@/components/analise/NovaAnaliseClient'
import { AIHowToGuide } from '@/components/ai-insights/AIHowToGuide'
// Importada AQUI, na página, e não só dentro do componente de cliente: num carregamento fresco
// desta rota (vindo do login, por exemplo) a folha do componente ainda não entrou no primeiro
// pacote, e o ecrã aparecia sem estilo nenhum. Quem chegava por navegação a partir do dashboard
// não via o problema, porque a folha já lá estava dessa rota.
import '@/app/ai-insights.css'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams?: { [key: string]: string | string[] | undefined }
}

export default async function PaginaNovaAnalise({ searchParams }: Props) {
  const sessao = await getCurrentUser()
  if (!sessao) {
    // Preserva ?datasets=... (vindo do botão "Analisar" nos catálogos) no regresso pós-login,
    // para o utilizador não ter de escolher o dataset outra vez depois de iniciar sessão.
    const qs = new URLSearchParams()
    for (const [chave, valor] of Object.entries(searchParams || {})) {
      if (typeof valor === 'string') qs.set(chave, valor)
    }
    const destino = qs.toString() ? `/analise/nova?${qs.toString()}` : '/analise/nova'
    redirect(`/login?next=${encodeURIComponent(destino)}`)
  }

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

  return (
    <>
      <AIHowToGuide />
      <NovaAnaliseClient datasets={datasets} />
    </>
  )
}
