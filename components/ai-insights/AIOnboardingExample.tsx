'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Wand2, X } from 'lucide-react'
import { AIChartRenderer } from '@/components/ai-insights/AIChartRenderer'
import {
  ONBOARDING_EXAMPLE_CHART,
  ONBOARDING_EXAMPLE_FINDINGS,
  ONBOARDING_EXAMPLE_NARRATIVE,
} from '@/lib/ai-onboarding-example'

const DISMISS_KEY = 'ai-insights-onboarding-dismissed-v1'

export function AIOnboardingExample({ onTryIt }: { onTryIt: () => void }) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  function dismiss() {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* localStorage indisponível — apenas não persiste a dispensa */
    }
  }

  function handleTryIt() {
    dismiss()
    onTryIt()
  }

  if (dismissed) return null

  return (
    <div className="relative mb-5 rounded-2xl border border-[#CFE3D6] bg-gradient-to-br from-[#F1F8F4] to-white p-4 md:p-5 shadow-sm">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar exemplo"
        className="absolute top-3 right-3 rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#CFE3D6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#064E2C] mb-3">
        <Sparkles className="w-3 h-3" />
        Exemplo com dados reais do portal
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-4 items-center">
        <div>
          <p className="text-sm font-bold text-gray-900 mb-1.5">
            Receitas do turismo internacional em Moçambique
          </p>
          <p className="text-[13px] text-gray-600 leading-relaxed mb-3">{ONBOARDING_EXAMPLE_NARRATIVE}</p>
          <ul className="space-y-1 mb-4">
            {ONBOARDING_EXAMPLE_FINDINGS.map((f, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-600">
                <span className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#F1F8F4] text-[#064E2C] text-[10px] font-bold mt-0.5">
                  {i + 1}
                </span>
                {f}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleTryIt}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#064E2C] to-[#1FA365] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-105 transition-all"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Experimentar com estes dados
          </button>
        </div>
        <div className="min-w-0">
          <AIChartRenderer chart={ONBOARDING_EXAMPLE_CHART} />
        </div>
      </div>
    </div>
  )
}
