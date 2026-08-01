'use client'

import { useEffect } from 'react'
import { AlertCircle, ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { AIResultView, type AiAnalysisResultWithSources } from '@/components/ai-insights/AIResultView'

export function AIResultOverlay({
  open,
  onClose,
  loading,
  error,
  result,
  questionAsked,
  datasetTitles,
  onSave,
  saving,
  saved,
}: {
  open: boolean
  onClose: () => void
  loading: boolean
  error: string | null
  result: AiAnalysisResultWithSources | null
  questionAsked: string
  datasetTitles: string[]
  onSave?: () => void
  saving?: boolean
  saved?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEsc)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-[#0B1B14]/60 backdrop-blur-sm px-4 py-6 md:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <button
          type="button"
          onClick={onClose}
          className="group mb-4 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white px-3 py-2.5 pr-5 shadow-lg hover:shadow-xl hover:-translate-x-0.5 transition-all"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#F1F8F4] text-[#064E2C] group-hover:bg-[#064E2C] group-hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </span>
          <span className="text-sm font-bold text-gray-800">Voltar</span>
        </button>

        <div className="rounded-3xl bg-white shadow-2xl overflow-hidden">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#064E2C] via-[#0B6B3A] to-[#1FA365] px-6 py-7 md:px-9 md:py-8 text-white">
            <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/15">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                Análise gerada por IA
              </span>
            </div>
            {questionAsked && (
              <p className="relative text-lg md:text-xl font-bold leading-snug max-w-2xl">"{questionAsked}"</p>
            )}
            {datasetTitles.length > 0 && (
              <p className="relative text-xs text-white/70 mt-3">{datasetTitles.join('  ·  ')}</p>
            )}
          </div>

          <div className="p-5 md:p-8 bg-[#FAFBFA]">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#064E2C]" />
                <p className="text-sm font-medium">A analisar os dados com IA…</p>
                <p className="text-xs text-gray-500">Isto pode demorar alguns segundos.</p>
              </div>
            )}

            {!loading && error && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!loading && !error && result && (
              <AIResultView result={result} onSave={onSave} saving={saving} saved={saved} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
