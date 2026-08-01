import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Columns2 } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth'
import { findAiInsightTileById } from '@/lib/db'
import { AIResultView, type AiAnalysisResultWithSources } from '@/components/ai-insights/AIResultView'

export const dynamic = 'force-dynamic'

export default async function AIDashboardComparePage({
  searchParams,
}: {
  searchParams: { ids?: string }
}) {
  const user = await getCurrentUserProfile()
  if (!user) {
    redirect(`/login?next=/ai-insights/dashboards/compare${searchParams.ids ? `?ids=${searchParams.ids}` : ''}`)
  }

  const ids = (searchParams.ids || '')
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n))
    .slice(0, 2)

  const tiles = await Promise.all(ids.map((id) => findAiInsightTileById(id, user.id)))
  const validTiles = tiles.filter((t): t is NonNullable<typeof t> => Boolean(t))

  return (
    <div className="font-body-stack min-h-screen bg-gradient-to-b from-[#f8faf8] via-white to-white">
      <header className="border-b border-[#E2E8E5] bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link
            href="/ai-insights/workspace"
            className="group inline-flex items-center gap-2 rounded-xl border border-[#E2E8E5] bg-white pl-1.5 pr-3 py-1.5 shadow-sm hover:shadow-md hover:-translate-x-0.5 transition-all"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#F1F8F4] text-[#064E2C] group-hover:bg-[#064E2C] group-hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold text-gray-700">Meus dashboards</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight mt-4">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#064E2C] to-[#6B4FBB] text-white shadow-sm shrink-0">
              <Columns2 className="w-4.5 h-4.5" />
            </span>
            Comparar análises
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {validTiles.length < 2 ? (
          <div className="rounded-2xl border border-[#E2E8E5] bg-white shadow-sm p-6 text-center">
            <p className="text-sm text-gray-500">
              Não foi possível carregar duas análises para comparar. Volte a "Meus dashboards" e
              seleccione duas análises guardadas.
            </p>
            <Link
              href="/ai-insights/workspace"
              className="inline-block mt-3 text-sm font-semibold text-[#064E2C] hover:underline"
            >
              ← Voltar aos meus dashboards
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {validTiles.map((tile) => {
              let result: AiAnalysisResultWithSources | null = null
              try {
                result = JSON.parse(tile.resultJson)
              } catch {
                result = null
              }
              return (
                <div key={tile.id} className="min-w-0">
                  <div className="rounded-2xl border border-[#E2E8E5] bg-white shadow-sm p-4 mb-4">
                    <p className="text-sm font-bold text-gray-900 leading-snug">{tile.title}</p>
                    <p className="text-xs text-gray-500 italic mt-1">"{tile.question}"</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {new Date(tile.createdAt).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {result ? (
                    <AIResultView result={result} showSaveButton={false} />
                  ) : (
                    <div className="rounded-2xl border border-[#E2E8E5] bg-white shadow-sm p-6 text-center">
                      <p className="text-sm text-gray-500">Não foi possível carregar esta análise.</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
