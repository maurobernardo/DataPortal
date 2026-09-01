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
    <section className="font-body-stack relative z-10 overflow-hidden pd-photo-hero pt-10 pb-12 md:pt-12 md:pb-16 lg:pt-14 lg:pb-20">
      <div className="pd-photo-hero-bg" style={{ backgroundImage: "url('/images/fundo6.webp')" }} aria-hidden />
      <div className="pd-photo-hero-scrim" aria-hidden />

      <div className="ai-section-inner relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/25 backdrop-blur px-4 py-1.5 mb-8 ai-animate-in">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-white/90">
                AI Insights · Disponível agora
              </span>
            </div>

            <h1 className="ai-animate-in-1 text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-white leading-[1.05] tracking-tight mb-5">
              Pergunte aos seus dados.{' '}
              <span className="text-[#8FD9AE]">Receba decisões.</span>
            </h1>

            <p className="ai-animate-in-2 text-[17px] md:text-[19px] text-white/80 max-w-xl mb-8 leading-relaxed">
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
                className="text-sm font-semibold text-white/70 hover:text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors"
              >
                Ver demonstração ao vivo
              </Link>
            </div>

            <div className="ai-animate-in-3 flex gap-8 pt-6 border-t border-white/20">
              {[
                { strong: String(totalDatasets), label: 'datasets oficiais' },
                { strong: String(totalCategories), label: 'categorias temáticas' },
                { strong: '3', label: 'datasets cruzáveis por pergunta' },
              ].map(({ strong, label }) => (
                <div key={label} className="text-[13px] text-white/70">
                  <strong className="block text-lg font-bold text-white">
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
    <div className="rounded-2xl overflow-hidden border border-white/25 bg-white/12 backdrop-blur-xl shadow-[0_20px_50px_rgba(4,20,12,0.35)]">
      <div className="flex items-center gap-2 px-6 pt-6 pb-4 border-b border-white/15">
        <LineChart className="w-4 h-4 text-[#8FD9AE]" aria-hidden />
        <span className="text-[13px] font-bold uppercase tracking-widest text-white/90">
          Exemplo com dados reais do portal
        </span>
      </div>

      <div className="p-6">
        <div className="flex items-start gap-2.5 mb-4">
          <span className="shrink-0 inline-flex items-center justify-center size-7 rounded-full bg-white/15 border border-white/25 text-white">
            <MessageSquareText className="w-3.5 h-3.5" aria-hidden />
          </span>
          <p className="text-[14.5px] font-semibold text-white leading-snug pt-1">
            {ONBOARDING_EXAMPLE_QUESTION}
          </p>
        </div>

        <div className="rounded-xl border border-white/20 bg-white/60 backdrop-blur-md p-3 mb-4">
          <AIChartRenderer chart={ONBOARDING_EXAMPLE_CHART} transparent />
        </div>

        <p className="text-[12.5px] text-white/75 leading-relaxed mb-5">{ONBOARDING_EXAMPLE_NARRATIVE}</p>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-white/65 pt-4 border-t border-white/15 flex-wrap">
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
