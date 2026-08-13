'use client'

import { useEffect, useRef } from 'react'
import {
  BellRing,
  Eye,
  FileDown,
  LayoutDashboard,
  LineChart,
  MessageSquareText,
  MousePointerClick,
  Wand2,
  X,
} from 'lucide-react'
import { AIChartRenderer } from '@/components/ai-insights/AIChartRenderer'
import {
  ONBOARDING_EXAMPLE_CHART,
  ONBOARDING_EXAMPLE_FINDINGS,
  ONBOARDING_EXAMPLE_NARRATIVE,
} from '@/lib/ai-onboarding-example'

const STEPS = [
  {
    icon: MessageSquareText,
    title: 'Faça a pergunta',
    desc: 'Escreva em português o que quer saber.',
  },
  {
    icon: MousePointerClick,
    title: 'Escolha os dados',
    desc: 'Seleccione até 3 datasets. Combine um geoespacial com um tabular para cruzar informação.',
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
  { icon: LayoutDashboard, label: 'Minhas análises', desc: 'Todas as análises ficam listadas, prontas a reabrir.' },
  { icon: BellRing, label: 'Guardar', desc: 'Marque um dashboard para o encontrar depois.' },
  { icon: Eye, label: 'Exportar HTML', desc: 'Ficheiro autónomo com mapas e gráficos incluídos.' },
  { icon: FileDown, label: 'Exportar PDF', desc: 'Relatório pronto a imprimir ou partilhar.' },
] as const

/**
 * "Como funciona" e o exemplo com dados reais viviam sempre abertos no topo da página (~900px
 * antes de qualquer acção possível). Ficam aqui, num painel lateral só visível a pedido — o fluxo
 * principal (pergunta + datasets) fica na primeira dobra.
 */
export function ComoFuncionaDrawer({
  onClose,
  onTryIt,
}: {
  onClose: () => void
  onTryIt: () => void
}) {
  const painelRef = useRef<HTMLDivElement>(null)
  const tituloId = 'como-funciona-titulo'

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    painelRef.current?.focus()

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !painelRef.current) return
      const focaveis = painelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      if (focaveis.length === 0) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', aoTeclar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = ''
      anterior?.focus()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
      />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="como-funciona-panel relative h-full w-full sm:max-w-[460px] bg-white shadow-2xl overflow-y-auto focus:outline-none"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E2E8E5] bg-white px-5 py-4">
          <h2 id={tituloId} className="text-base font-bold text-[var(--pd-ink-900)]">
            Como funciona
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C]"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          <ol className="space-y-4">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon
              return (
                <li key={step.title} className="flex gap-3">
                  <span className="relative shrink-0 inline-flex size-8 items-center justify-center rounded-full bg-[#064E2C] text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-gray-900">
                      <StepIcon className="size-3.5 text-[#064E2C]" aria-hidden />
                      {step.title}
                    </p>
                    <p className="text-[12.5px] text-gray-500 leading-relaxed mt-0.5">{step.desc}</p>
                  </div>
                </li>
              )
            })}
          </ol>

          <div className="border-t border-[#E2E8E5] pt-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-3">
              Depois de guardar, em &quot;Minhas análises&quot; pode
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {DASHBOARD_FEATURES.map((f) => {
                const FeatureIcon = f.icon
                return (
                  <div key={f.label} className="rounded-xl border border-[#E2E8E5] bg-[#FAFBFA] px-3 py-2.5">
                    <FeatureIcon className="size-4 text-[#064E2C] mb-1.5" aria-hidden />
                    <p className="text-xs font-bold text-gray-800">{f.label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-[#E2E8E5] pt-5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#064E2C] mb-3">
              <LineChart className="size-3" aria-hidden />
              Exemplo com dados reais do portal
            </div>
            <p className="text-[13px] font-bold text-gray-900 mb-1.5">
              Receitas do turismo internacional em Moçambique
            </p>
            <p className="text-[12.5px] text-gray-600 leading-relaxed mb-3">{ONBOARDING_EXAMPLE_NARRATIVE}</p>
            <ul className="space-y-1 mb-4">
              {ONBOARDING_EXAMPLE_FINDINGS.map((f, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-gray-600">
                  <span className="shrink-0 inline-flex items-center justify-center size-4 rounded-full bg-[#F1F8F4] text-[#064E2C] text-[10px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mb-4">
              <AIChartRenderer chart={ONBOARDING_EXAMPLE_CHART} />
            </div>
            <button
              type="button"
              onClick={onTryIt}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#064E2C] px-4 py-3 text-[13px] font-bold text-white hover:bg-[#04361F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#064E2C]"
            >
              <Wand2 className="size-4" aria-hidden />
              Experimentar com estes dados
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
