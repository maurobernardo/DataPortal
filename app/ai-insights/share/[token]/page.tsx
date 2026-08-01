import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { findAiInsightTileByShareToken } from '@/lib/db'
import { AIResultView, type AiAnalysisResultWithSources } from '@/components/ai-insights/AIResultView'

export const dynamic = 'force-dynamic'

export default async function AiInsightSharePage({ params }: { params: { token: string } }) {
  const tile = await findAiInsightTileByShareToken(params.token)

  if (!tile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8faf8] to-white px-4">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 mb-2">Análise não encontrada</p>
          <p className="text-sm text-gray-500 mb-4">O link pode ter expirado ou ser inválido.</p>
          <Link href="/ai-insights" className="text-sm font-semibold text-[#064E2C] hover:underline">
            ← Voltar ao Data Portal
          </Link>
        </div>
      </div>
    )
  }

  let result: AiAnalysisResultWithSources | null = null
  try {
    result = JSON.parse(tile.resultJson)
  } catch {
    result = null
  }

  return (
    <div className="font-body-stack min-h-screen bg-gradient-to-b from-[#f8faf8] to-white">
      <header className="border-b border-[#E2E8E5] bg-white">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <Link
            href="/ai-insights"
            className="text-xs font-semibold text-gray-500 hover:text-[#064E2C] inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#6B4FBB]" />
            Data Portal · AI Insights
          </Link>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 mt-2">{tile.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{tile.question}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="rounded-2xl border border-[#E2E8E5] bg-white shadow-sm p-5 md:p-6">
          {result ? (
            <AIResultView result={result} showSaveButton={false} />
          ) : (
            <p className="text-sm text-gray-500">Não foi possível carregar esta análise.</p>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Análise partilhada a partir do{' '}
          <Link href="/ai-insights" className="text-[#064E2C] font-semibold hover:underline">
            Data Portal AI Insights
          </Link>
        </p>
      </main>
    </div>
  )
}
