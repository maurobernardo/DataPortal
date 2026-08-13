import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Brain, LineChart } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth'
import { findAiInsightTileById } from '@/lib/db'
import { AIResultView, type AiAnalysisResultWithSources } from '@/components/ai-insights/AIResultView'
import { AIDashboardDetailActions } from '@/components/ai-insights/AIDashboardDetailActions'

export const dynamic = 'force-dynamic'

export default async function AIDashboardDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUserProfile()
  if (!user) {
    redirect(`/login?next=/ai-insights/dashboards/${params.id}`)
  }

  const id = Number.parseInt(params.id, 10)
  if (!Number.isFinite(id)) {
    notFound()
  }

  const tile = await findAiInsightTileById(id, user.id)
  if (!tile) {
    notFound()
  }

  let result: AiAnalysisResultWithSources | null = null
  try {
    result = JSON.parse(tile.resultJson)
  } catch {
    result = null
  }

  return (
    <div className="font-body-stack min-h-screen bg-gradient-to-b from-[#f8faf8] via-white to-white">
      <header className="border-b border-[#E2E8E5] bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/analise/nova"
            className="group inline-flex items-center gap-2 rounded-xl border border-[#E2E8E5] bg-white pl-1.5 pr-3 py-1.5 shadow-sm hover:shadow-md hover:-translate-x-0.5 transition-all"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#F1F8F4] text-[#064E2C] group-hover:bg-[#064E2C] group-hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold text-gray-700">Meus dashboards</span>
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4 mt-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#064E2C] to-[#6B4FBB] text-white shadow-sm shrink-0">
                  <Brain className="w-4.5 h-4.5" />
                </span>
                {tile.title}
              </h1>
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
                <LineChart className="w-3.5 h-3.5 text-[#6B4FBB] shrink-0" />
                "{tile.question}"
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Guardado em {new Date(tile.createdAt).toLocaleDateString('pt-PT', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <AIDashboardDetailActions tileId={tile.id} shareToken={tile.shareToken} />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {result ? (
          <AIResultView result={result} showSaveButton={false} allowSubscriptions />
        ) : (
          <div className="rounded-2xl border border-[#E2E8E5] bg-white shadow-sm p-6 text-center">
            <p className="text-sm text-gray-500">Não foi possível carregar esta análise.</p>
          </div>
        )}
      </main>
    </div>
  )
}
