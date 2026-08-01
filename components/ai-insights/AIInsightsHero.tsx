import Link from 'next/link'
import { ArrowRight, BarChart3, MessageSquareText, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'

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
              <Link href="/ai-insights/workspace" className="group ai-btn ai-btn-ai ai-btn-lg ai-btn-hero">
                Experimentar grátis
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/ai-insights/workspace"
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

          {/* Right: real capabilities card */}
          <AIRealCapabilitiesCard totalDatasets={totalDatasets} totalCategories={totalCategories} />
        </div>
      </div>
    </section>
  )
}

function AIRealCapabilitiesCard({ totalDatasets, totalCategories }: AIInsightsHeroProps) {
  const items = [
    {
      icon: MessageSquareText,
      title: 'Linguagem natural',
      desc: 'Pergunte como perguntaria a um colega, sem SQL nem filtros complicados. Só a sua pergunta, em português.',
    },
    {
      icon: BarChart3,
      title: 'Visualização automática',
      desc: 'Em segundos, a IA escolhe o gráfico ou mapa certo para a sua pergunta, sem abrir Excel nem GIS.',
    },
    {
      icon: TrendingUp,
      title: 'Previsões de tendência',
      desc: 'Veja para onde a tendência aponta, com cenários hipotéticos e uma banda de incerteza sempre à vista.',
    },
    {
      icon: ShieldCheck,
      title: 'Fontes sempre citadas',
      desc: 'Cada resposta traz o dataset, a fonte e o ano exactos, verificados pelo servidor e nunca inventados pela IA.',
    },
  ]

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0B1B14] text-white p-6 md:p-7 shadow-[0_20px_50px_rgba(6,78,44,0.22)]">
      <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#6B4FBB] opacity-20 blur-[80px]" />

      <div className="relative flex items-center gap-2 pb-4 mb-5 border-b border-white/10">
        <Sparkles className="w-4 h-4 text-[#9B85D9]" />
        <span className="text-[13px] font-bold uppercase tracking-widest text-white/75">
          O que o AI Insights faz hoje
        </span>
      </div>

      <div className="relative grid grid-cols-1 gap-4 mb-5">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-3">
            <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#6B4FBB]/15 border border-[#6B4FBB]/25 text-[#B9A6EA]">
              <Icon className="w-4.5 h-4.5" />
            </span>
            <div>
              <p className="text-sm font-bold">{title}</p>
              <p className="text-xs text-white/65 leading-relaxed mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative rounded-xl p-4 bg-white/5 border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-extrabold">{totalDatasets}</p>
            <p className="text-[11px] text-white/60">datasets analisáveis</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-2xl font-extrabold">{totalCategories}</p>
            <p className="text-[11px] text-white/60">categorias</p>
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-[10px] text-white/45 mt-3 pt-3 border-t border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3DDC84] animate-pulse" />
          Contagem em tempo real: actualiza a cada novo dataset publicado no portal.
        </p>
      </div>
    </div>
  )
}
