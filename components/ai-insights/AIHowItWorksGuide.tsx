'use client'

import { useEffect, useState } from 'react'
import {
  BellRing,
  ChevronDown,
  ChevronUp,
  Eye,
  FileDown,
  HelpCircle,
  LayoutDashboard,
  MessageSquareText,
  MousePointerClick,
  LineChart,
} from 'lucide-react'

const STEPS = [
  {
    icon: MessageSquareText,
    title: 'Faça a pergunta',
    desc: 'Escreva em português o que quer saber, no topo desta página.',
  },
  {
    icon: MousePointerClick,
    title: 'Escolha os dados',
    desc: 'Seleccione até 3 datasets nas categorias abaixo. Combine um geoespacial com um tabular para cruzar informação.',
  },
  {
    icon: LineChart,
    title: 'Receba a análise',
    desc: 'Normalmente em menos de um minuto: narrativa, gráficos e mapa, sempre com as fontes citadas.',
  },
  {
    icon: LayoutDashboard,
    title: 'Guarde e exporte',
    desc: 'No dashboard gerado, guarde em "Minhas análises" ou descarregue em HTML/PDF.',
  },
] as const

const DASHBOARD_FEATURES = [
  { icon: LayoutDashboard, label: 'Minhas análises', desc: 'Todas as análises que fizer ficam listadas, prontas a reabrir.' },
  { icon: BellRing, label: 'Guardar', desc: 'Marque um dashboard como guardado para o encontrar depois.' },
  { icon: Eye, label: 'Exportar HTML', desc: 'Ficheiro autónomo com o mesmo aspecto do dashboard, mapas e gráficos incluídos.' },
  { icon: FileDown, label: 'Exportar PDF', desc: 'Relatório pronto a imprimir ou partilhar, igual ao que vê no ecrã.' },
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
              className="hidden lg:block absolute top-4 h-px bg-[#064E2C]/20"
              style={{ left: '12.5%', right: '12.5%' }}
            />
            {STEPS.map((step, i) => {
              const StepIcon = step.icon
              return (
                <div key={step.title} className="relative">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="relative z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#064E2C] text-white text-xs font-bold shadow-sm shrink-0">
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
                    <FeatureIcon className="w-4 h-4 text-[#064E2C] mb-1.5" />
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
