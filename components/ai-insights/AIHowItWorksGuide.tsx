'use client'

import { useEffect, useState } from 'react'
import {
  BellRing,
  ChevronDown,
  ChevronUp,
  Columns2,
  Eye,
  FileDown,
  HelpCircle,
  LayoutDashboard,
  MessageSquareText,
  MousePointerClick,
  Sparkles,
} from 'lucide-react'

const STEPS = [
  {
    icon: MousePointerClick,
    title: 'Escolha os dados',
    desc: 'Clique em "Seleccionar" em até 3 cards do catálogo. Combine um dataset geoespacial com um tabular para cruzar informação.',
  },
  {
    icon: MessageSquareText,
    title: 'Faça a pergunta',
    desc: 'Escreva em português o que quer saber sobre os dados seleccionados.',
  },
  {
    icon: Sparkles,
    title: 'Receba a análise',
    desc: 'Em segundos: narrativa, gráfico, mapa ou previsão, sempre com as fontes oficiais citadas.',
  },
  {
    icon: LayoutDashboard,
    title: 'Guarde e organize',
    desc: 'Cada análise guardada fica em "Meus dashboards", pronta a rever, comparar ou partilhar.',
  },
] as const

const DASHBOARD_FEATURES = [
  { icon: Eye, label: 'Ver detalhes', desc: 'Reabra a análise completa numa página dedicada.' },
  { icon: Columns2, label: 'Comparar', desc: 'Veja duas análises guardadas lado a lado.' },
  { icon: FileDown, label: 'Exportar PDF', desc: 'Descarregue um relatório com narrativa, gráfico e mapa.' },
  { icon: BellRing, label: 'Alertas', desc: 'Seja avisado quando um dataset-fonte for actualizado.' },
] as const

const STORAGE_KEY = 'ai-insights-guide-collapsed-v1'

export function AIHowItWorksGuide() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      setCollapsed(false)
    }
  }, [])

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* localStorage indisponível — apenas não persiste a preferência */
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-[#E2E8E5] bg-[#FAFBFA] overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 hover:bg-white/70 transition-colors"
      >
        <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-800">
          <HelpCircle className="w-4 h-4 text-[#064E2C] shrink-0" />
          Como funciona o AI Insights
        </span>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 sm:px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5 relative">
            <div
              className="hidden lg:block absolute top-4 h-px bg-gradient-to-r from-[#064E2C]/25 via-[#6B4FBB]/25 to-[#064E2C]/25"
              style={{ left: '12.5%', right: '12.5%' }}
            />
            {STEPS.map((step, i) => {
              const StepIcon = step.icon
              return (
                <div key={step.title} className="relative">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="relative z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-[#064E2C] to-[#6B4FBB] text-white text-xs font-bold shadow-sm shrink-0">
                      {i + 1}
                    </span>
                    <StepIcon className="w-4 h-4 text-[#064E2C] shrink-0" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-1">{step.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-5 pt-5 border-t border-[#E2E8E5]">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-3">
              Depois de guardar, em "Meus dashboards" pode
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DASHBOARD_FEATURES.map((f) => {
                const FeatureIcon = f.icon
                return (
                  <div key={f.label} className="rounded-xl border border-[#E2E8E5] bg-white px-3 py-2.5">
                    <FeatureIcon className="w-4 h-4 text-[#6B4FBB] mb-1.5" />
                    <p className="text-xs font-bold text-gray-800">{f.label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
