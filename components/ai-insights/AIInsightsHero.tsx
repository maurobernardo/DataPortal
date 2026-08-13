import Link from 'next/link'
import { ArrowRight, MessageSquareText, LineChart } from 'lucide-react'
import { AIChartRenderer } from '@/components/ai-insights/AIChartRenderer'
import {
  ONBOARDING_EXAMPLE_CHART,
  ONBOARDING_EXAMPLE_NARRATIVE,
  ONBOARDING_EXAMPLE_QUESTION,
} from '@/lib/ai-onboarding-example'

type AIInsightsHeroProps = {
  totalDatasets: number
  totalCategories: number
}

export function AIInsightsHero({ totalDatasets, totalCategories }: AIInsightsHeroProps) {
  return (
    <section className="font-body-stack relative z-10 overflow-hidden border-b border-[#E2E8E5] bg-gradient-to-b from-[#f8faf8] to-[#f2f7f3] pt-10 pb-12 md:pt-12 md:pb-16 lg:pt-14 lg:pb-20">
      <div className="pointer-events-none absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-[radial-gradient(circle,_rgba(6,78,44,0.08)_0%,_transparent_70%)] opacity-80" />

      <div className="ai-section-inner relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-4 py-1.5 mb-8 ai-animate-in">
              <span className="w-2 h-2 rounded-full bg-[#064E2C]" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C]">
                AI Insights · Disponível agora
              </span>
            </div>

            <h1 className="ai-animate-in-1 text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-gray-900 leading-[1.05] tracking-tight mb-5">
              Pergunte aos seus dados.{' '}
              <span className="text-[#064E2C]">Receba decisões.</span>
            </h1>

            <p className="ai-animate-in-2 text-[17px] md:text-[19px] text-gray-600 max-w-xl mb-8 leading-relaxed">
              Escreva a pergunta como escreveria a um colega. Em segundos tem o gráfico, o mapa ou a
              previsão certa, tirados dos {totalDatasets} datasets oficiais do portal, com fonte e ano
              sempre citados. Sem SQL, sem GIS, sem folhas de cálculo.
            </p>

            <div className="ai-animate-in-2 flex gap-4 items-center mb-8 flex-wrap">
              <Link href="/analise/nova" className="group ai-btn ai-btn-primary ai-btn-lg">
                Experimentar grátis
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/analise/nova"
                className="text-sm font-semibold text-gray-500 hover:text-[#064E2C] underline underline-offset-4 decoration-gray-300 hover:decoration-[#064E2C] transition-colors"
              >
                Ver demonstração ao vivo
              </Link>
            </div>

            <div className="ai-animate-in-3 flex gap-8 pt-6 border-t border-[#E2E8E5]">
              {[
                { strong: String(totalDatasets), label: 'datasets oficiais' },
                { strong: String(totalCategories), label: 'categorias temáticas' },
                { strong: '3', label: 'datasets cruzáveis por pergunta' },
              ].map(({ strong, label }) => (
                <div key={label} className="text-[13px] text-gray-600">
                  <strong className="block text-lg font-bold text-gray-900">
                    {strong}
                  </strong>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: real demonstration card */}
          <AIRealDemoCard />
        </div>
      </div>
    </section>
  )
}

/**
 * Antes: cartão escuro isolado com 4 itens repetindo o mesmo tile de ícone roxo — uma lista de
 * promessas, não uma prova. Substituído por UMA demonstração real: a mesma pergunta+resposta já
 * usadas no exemplo de onboarding (dados reais do dataset "Mozambique Turismo", World Bank WDI),
 * não texto inventado para este card.
 */
function AIRealDemoCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-[#E2E8E5] bg-white shadow-[0_20px_50px_rgba(6,78,44,0.10)]">
      <div className="flex items-center gap-2 px-6 pt-6 pb-4 border-b border-[#E2E8E5]">
        <LineChart className="w-4 h-4 text-[#064E2C]" aria-hidden />
        <span className="text-[13px] font-bold uppercase tracking-widest text-[#064E2C]">
          Exemplo com dados reais do portal
        </span>
      </div>

      <div className="p-6">
        <div className="flex items-start gap-2.5 mb-4">
          <span className="shrink-0 inline-flex items-center justify-center size-7 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] text-[#064E2C]">
            <MessageSquareText className="w-3.5 h-3.5" aria-hidden />
          </span>
          <p className="text-[14.5px] font-semibold text-gray-900 leading-snug pt-1">
            {ONBOARDING_EXAMPLE_QUESTION}
          </p>
        </div>

        <div className="rounded-xl border border-[#E2E8E5] bg-[#FAFBFA] p-3 mb-4">
          <AIChartRenderer chart={ONBOARDING_EXAMPLE_CHART} />
        </div>

        <p className="text-[12.5px] text-gray-600 leading-relaxed mb-5">{ONBOARDING_EXAMPLE_NARRATIVE}</p>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 pt-4 border-t border-[#E2E8E5] flex-wrap">
          <span>Sem SQL</span>
          <span aria-hidden>·</span>
          <span>Fonte sempre citada</span>
          <span aria-hidden>·</span>
          <span>Segundos, não dias</span>
        </div>
      </div>
    </div>
  )
}
