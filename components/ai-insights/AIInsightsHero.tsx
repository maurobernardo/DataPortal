'use client'

import Link from 'next/link'

export function AIInsightsHero() {
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
                AI Insights · Lançamento 2026
              </span>
            </div>

            <h1 className="ai-animate-in-1 text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-gray-900 leading-[1.05] tracking-tight mb-5">
              Pergunte aos seus dados.{' '}
              <span className="text-[#064E2C]">Receba decisões.</span>
            </h1>

            <p className="ai-animate-in-2 text-[17px] md:text-[19px] text-gray-600 max-w-xl mb-8 leading-relaxed">
              Transforme 12.847 datasets nacionais e fontes externas em análises accionáveis
              usando linguagem natural. Visualize, preveja, modele cenários — sem SQL, sem GIS,
              sem dependência de equipas técnicas.
            </p>

            <div className="ai-animate-in-2 flex gap-3 items-center mb-8 flex-wrap">
              <Link href="/ai-insights/trial" className="ai-btn ai-btn-ai ai-btn-lg">
                Experimentar grátis →
              </Link>
              <Link href="/ai-insights/demo" className="ai-btn ai-btn-ghost ai-btn-lg">
                Ver demonstração ao vivo
              </Link>
            </div>

            <div className="ai-animate-in-3 flex gap-8 pt-6 border-t border-[#E2E8E5]">
              {[
                { strong: '50', label: 'consultas grátis/mês' },
                { strong: '14 dias', label: 'trial Pro completo' },
                { strong: 'Sem cartão', label: 'de crédito' },
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

          {/* Right: live demo card */}
          <AIHeroDemoCard />
        </div>
      </div>
    </section>
  )
}

function AIHeroDemoCard() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#E2E8E5] bg-[#0B1B14] text-white p-6 shadow-[0_10px_30px_rgba(6,78,44,0.12)] ring-1 ring-black/5">

      {/* Header */}
      <div
        className="flex justify-between items-center pb-4 mb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          ✦ AI Insights · Live
        </span>
        <span className="flex items-center gap-1.5" style={{ fontSize: 11, opacity: 0.6 }}>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--pd-green-500)', animation: 'ai-pulse 2s ease-in-out infinite' }}
          />
          Generating insight
        </span>
      </div>

      {/* Prompt */}
      <div
        className="rounded-xl p-3 mb-4 border border-white/10 bg-white/5 text-[14px]"
      >
        <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Pergunta do utilizador
        </div>
        Como evoluiu o acesso a água potável em Sofala vs. Manica entre 2018 e 2024,
        e qual a projecção até 2030?
      </div>

      {/* Response */}
      <p className="mb-4" style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.9 }}>
        Analisando{' '}
        <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: 'rgba(31,163,101,0.2)', color: 'var(--pd-green-100)' }}>
          3 datasets
        </span>{' '}
        do INE e DNAAS + dados harmonizados do{' '}
        <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: 'rgba(31,163,101,0.2)', color: 'var(--pd-green-100)' }}>
          Banco Mundial
        </span>
        . Sofala registou crescimento de{' '}
        <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: 'rgba(31,163,101,0.2)', color: 'var(--pd-green-100)' }}>
          +18.4%
        </span>{' '}
        vs. Manica{' '}
        <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: 'rgba(31,163,101,0.2)', color: 'var(--pd-green-100)' }}>
          +11.2%
        </span>
        . Projecção até 2030 sugere convergência se mantida a tendência actual.
      </p>

      {/* Chart */}
      <div
        className="rounded-lg p-3 mb-3"
        style={{ height: 160, background: 'rgba(255,255,255,0.03)' }}
      >
        <svg viewBox="0 0 400 140" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="hgrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1FA365" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1FA365" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hgrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6B4FBB" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6B4FBB" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,90 L57,82 L114,75 L171,65 L228,58 L285,50 L342,42 L342,140 L0,140 Z" fill="url(#hgrad1)" />
          <path d="M0,90 L57,82 L114,75 L171,65 L228,58 L285,50 L342,42" fill="none" stroke="#1FA365" strokeWidth="2" />
          <path d="M342,42 L399,30" fill="none" stroke="#1FA365" strokeWidth="2" strokeDasharray="3,3" />
          <path d="M0,100 L57,96 L114,92 L171,88 L228,82 L285,78 L342,72 L342,140 L0,140 Z" fill="url(#hgrad2)" opacity="0.6" />
          <path d="M0,100 L57,96 L114,92 L171,88 L228,82 L285,78 L342,72" fill="none" stroke="#6B4FBB" strokeWidth="2" />
          <path d="M342,72 L399,62" fill="none" stroke="#6B4FBB" strokeWidth="2" strokeDasharray="3,3" />
          <rect x="342" y="0" width="58" height="140" fill="rgba(107,79,187,0.08)" />
          <text x="370" y="14" fill="rgba(255,255,255,0.5)" fontSize="9" textAnchor="middle">Projecção</text>
          <line x1="0" y1="125" x2="400" y2="125" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          {['2018','2021','2024','2030'].map((yr, i) => (
            <text key={yr} x={[0, 170, 320, 380][i]} y="138" fill="rgba(255,255,255,0.4)" fontSize="9">{yr}</text>
          ))}
        </svg>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: '↓ Exportar PDF', primary: true },
          { label: '⚏ Adicionar ao dashboard' },
          { label: '⌥ Refinar análise' },
          { label: '⎘ Partilhar' },
        ].map(({ label, primary }) => (
          <button
            key={label}
            className="rounded-lg border text-white cursor-pointer text-xs py-1.5 px-2.5"
            style={{
              background: primary ? '#064E2C' : 'rgba(255,255,255,0.06)',
              borderColor: primary ? '#064E2C' : 'rgba(255,255,255,0.08)',
              fontSize: 11,
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
