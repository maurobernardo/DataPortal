'use client'

import { useState } from 'react'

type SidebarItem = {
  icon: string
  name: string
  badge?: string
  active?: boolean
}

type SidebarSection = {
  label: string
  items: SidebarItem[]
}

const DEMO_PROMPTS = [
  { sector: 'Saúde Pública', label: 'Cobertura vacinal por distrito 2024' },
  { sector: 'Agricultura', label: 'Produção de milho vs. precipitação' },
  { sector: 'Economia', label: 'Inflação setorial — projecção 12 meses' },
  { sector: 'Educação', label: 'Taxa de conclusão por género e província' },
]

const WORKSPACE_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: 'Recent',
    items: [
      { icon: '✦', name: 'Cobertura Vacinal', badge: '3m', active: true },
      { icon: '◌', name: 'Produção Agrícola', badge: '2h' },
      { icon: '◌', name: 'Mercado Trabalho', badge: '1d' },
    ],
  },
  {
    label: 'Saved',
    items: [
      { icon: '▦', name: 'Sofala Health' },
      { icon: '▦', name: 'YATLAS Monitor' },
      { icon: '▦', name: 'M&E Quarterly' },
    ],
  },
]

export function AIWorkspaceDemo() {
  const [active, setActive] = useState(0)

  return (
    <section className="font-body-stack relative z-10 overflow-hidden border-t border-[#E2E8E5] bg-gradient-to-b from-[#f8faf8] to-[#f2f7f3] py-16 md:py-24">
      <div className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,_rgba(6,78,44,0.08)_0%,_transparent_70%)] opacity-80" />

      <div className="ai-section-inner relative z-10">
        <div className="grid grid-cols-1 gap-12 lg:gap-14 items-start lg:grid-cols-[minmax(0,320px)_1fr]">

          {/* Left: description + prompt picker */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#064E2C]" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C]">
                Workspace
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-[1.15] mb-4 tracking-tight">
              O canvas onde decisões são{' '}
              <span className="text-[#064E2C]">construídas.</span>
            </h2>
            <p className="text-[15px] text-gray-600 leading-relaxed mb-6">
              Uma área de trabalho colaborativa: prompt, contexto, visualizações geradas,
              narrativa AI, e fontes auditáveis — todas no mesmo plano.
            </p>

            <div className="flex flex-col gap-2">
              {DEMO_PROMPTS.map((p, i) => (
                <button
                  key={p.sector}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`text-left rounded-2xl border px-4 py-3 text-[13px] transition-all duration-300 shadow-sm ${
                    active === i
                      ? 'border-[#064E2C] bg-white shadow-[0_10px_30px_rgba(6,78,44,0.08)] text-gray-900'
                      : 'border-[#E2E8E5] bg-white hover:border-[#CFE3D6] text-gray-800'
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                    {p.sector}
                  </span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: workspace mockup */}
          <WorkspaceMockup activePrompt={DEMO_PROMPTS[active]} />
        </div>
      </div>
    </section>
  )
}

function WorkspaceMockup({ activePrompt }: { activePrompt: { sector: string; label: string } }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-[#E2E8E5] bg-[#0F1F18] shadow-[0_10px_30px_rgba(6,78,44,0.12)] ring-1 ring-black/5"
    >
      {/* Tabs */}
      <div
        className="flex gap-0 pt-2 px-3"
        style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="px-4 py-2.5 text-white"
          style={{ fontSize: 12, borderBottom: '2px solid var(--ai-violet-500)', cursor: 'default' }}
        >
          ✦ {activePrompt.sector} · Análise
        </div>
        <div className="px-4 py-2.5" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
          + New
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="flex justify-between items-center px-4 py-3"
        style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex gap-2 items-center" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          <span>Workspaces</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>{activePrompt.sector}</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <strong style={{ color: 'white' }}>{activePrompt.label}</strong>
        </div>
        <div className="flex gap-1.5">
          {['⎘ Share', '↓ Export', '◷ History'].map((a) => (
            <button
              key={a}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'white',
                fontSize: 11,
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Body: sidebar + canvas + right panel */}
      <div className="flex" style={{ minHeight: 480 }}>

        {/* Sidebar */}
        <div
          className="p-4 hidden lg:block"
          style={{ width: 200, background: 'rgba(0,0,0,0.25)', borderRight: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}
        >
          {WORKSPACE_SIDEBAR_SECTIONS.map((section) => (
            <div key={section.label} className="mb-5">
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontWeight: 600 }}>
                {section.label}
              </div>
              {section.items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md mb-0.5"
                  style={{
                    fontSize: 12,
                    color: item.active ? 'white' : 'rgba(255,255,255,0.65)',
                    background: item.active ? 'rgba(107,79,187,0.15)' : 'transparent',
                    cursor: 'default',
                  }}
                >
                  <span>{item.icon}</span>
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.badge && <span style={{ fontSize: 10, opacity: 0.4, fontFamily: 'monospace' }}>{item.badge}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Main canvas */}
        <div
          className="flex-1 p-5 overflow-auto"
          style={{ background: 'linear-gradient(180deg, rgba(107,79,187,0.03), transparent)' }}
        >
          {/* Prompt bar */}
          <div
            className="flex items-center gap-3 rounded-xl p-3 mb-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(107,79,187,0.3)' }}
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-white text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6B4FBB, #1FA365)' }}
            >
              ✦
            </div>
            <div className="flex-1 text-sm text-white">
              {activePrompt.label}
              <span
                className="inline-block w-px h-3.5 align-middle ml-0.5"
                style={{ background: 'var(--ai-violet-300)', animation: 'ai-blink 1s steps(2) infinite' }}
              />
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>
              Pro · 47/∞
            </span>
          </div>

          {/* Context chips */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { label: '◉ INE Censo 2017', type: 'dataset' },
              { label: '◉ MISAU Saúde 2024', type: 'dataset' },
              { label: '⇄ World Bank Health', type: 'external' },
              { label: '+ Add source', type: 'add' },
            ].map(({ label, type }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${
                    type === 'dataset' ? 'rgba(31,163,101,0.4)'
                    : type === 'external' ? 'rgba(107,79,187,0.4)'
                    : 'rgba(255,255,255,0.08)'
                  }`,
                  color: type === 'dataset' ? 'var(--pd-green-100)'
                    : type === 'external' ? 'var(--ai-violet-300)'
                    : 'rgba(255,255,255,0.6)',
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Tiles */}
          <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
            {/* Map tile */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'white' }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Cobertura por distrito — Sofala</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Choropleth · MISAU 2024</div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>⋯</span>
              </div>
              <div
                className="rounded-md overflow-hidden"
                style={{ height: 200, background: 'linear-gradient(135deg, #1a3a2a, #0f1f18)' }}
              >
                <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M50,40 L120,30 L150,70 L100,100 L60,90 Z" fill="#1FA365" opacity="0.85" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                  <path d="M120,30 L180,40 L200,80 L150,70 Z" fill="#0E7A47" opacity="0.9" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                  <path d="M180,40 L240,55 L260,100 L200,80 Z" fill="#1FA365" opacity="0.7" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                  <path d="M150,70 L200,80 L220,130 L160,140 L100,100 Z" fill="#D4A017" opacity="0.7" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                  <path d="M160,140 L220,130 L240,170 L180,180 Z" fill="#C0392B" opacity="0.8" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                  <circle cx="200" cy="120" r="4" fill="white" />
                  <circle cx="200" cy="120" r="10" fill="white" opacity="0.15" />
                  <text x="212" y="124" fill="white" fontSize="9">Beira: 87%</text>
                </svg>
              </div>
            </div>

            {/* Bar chart tile */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'white' }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>vs. Nacional</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Top 5 distritos</div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>⋯</span>
              </div>
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full" style={{ height: 200 }}>
                <g fontSize="9" fill="rgba(255,255,255,0.7)">
                  {[
                    { name: 'Beira', pct: 87, w: 120, color: '#1FA365' },
                    { name: 'Dondo', pct: 76, w: 105, color: '#1FA365' },
                    { name: 'Nhamatanda', pct: 66, w: 92, color: '#D4A017' },
                    { name: 'Búzi', pct: 56, w: 78, color: '#D4A017' },
                    { name: 'Chibabava', pct: 42, w: 58, color: '#C0392B' },
                  ].map(({ name, pct, w, color }, i) => (
                    <g key={name} transform={`translate(0, ${i * 30})`}>
                      <text x="0" y="18">{name}</text>
                      <rect x="58" y="10" width={w} height="10" fill={color} rx="2" />
                      <text x={62 + w} y="18">{pct}%</text>
                    </g>
                  ))}
                  <line x1="133" y1="0" x2="133" y2="155" stroke="rgba(255,255,255,0.3)" strokeDasharray="2,2" />
                  <text x="135" y="170" fontSize="8">Média 71%</text>
                </g>
              </svg>
            </div>
          </div>

          {/* AI Narrative */}
          <div
            className="mt-4 p-4 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(107,79,187,0.08), rgba(31,163,101,0.04))',
              border: '1px solid rgba(107,79,187,0.2)',
            }}
          >
            <div
              className="flex items-center gap-1.5 mb-2"
              style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ai-violet-300)', fontWeight: 600 }}
            >
              ✦ Insight gerado por AI
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>
              Sofala apresenta{' '}
              <strong style={{ color: 'white', background: 'rgba(31,163,101,0.15)', padding: '1px 5px', borderRadius: 3 }}>
                cobertura média de 65.2%
              </strong>
              , abaixo da média nacional de 71%.{' '}
              <strong style={{ color: 'white', background: 'rgba(31,163,101,0.15)', padding: '1px 5px', borderRadius: 3 }}>
                Beira lidera (87%)
              </strong>
              , mas{' '}
              <strong style={{ color: 'white', background: 'rgba(31,163,101,0.15)', padding: '1px 5px', borderRadius: 3 }}>
                Chibabava está crítico (42%)
              </strong>{' '}
              — 3 desvios-padrão abaixo do esperado. Combinando dados do Banco Mundial, a anomalia
              correlaciona com colapso de infraestrutura pós-Idai (2019). Recomendação: intervenção
              prioritária em Chibabava e Búzi.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div
          className="p-4 hidden xl:block"
          style={{ width: 220, background: 'rgba(0,0,0,0.25)', borderLeft: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}
        >
          <SourceCard label="Fontes nativas (3)" sources={[
            { name: 'INE Censo 2017', meta: 'Demográfico · 18MB', badge: 'Native', native: true },
            { name: 'MISAU Saúde 2024', meta: 'Mensal · API stream', badge: 'Native', native: true },
            { name: 'DNAAS Infra', meta: 'Anual · GeoJSON', badge: 'Native', native: true },
          ]} />
          <SourceCard label="Externos (1)" sources={[
            { name: 'World Bank Health', meta: 'REST API · Auth ✓', badge: 'External', native: false },
          ]} showAdd />
        </div>
      </div>
    </div>
  )
}

function SourceCard({
  label,
  sources,
  showAdd,
}: {
  label: string
  sources: { name: string; meta: string; badge: string; native: boolean }[]
  showAdd?: boolean
}) {
  return (
    <div className="mb-5">
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontWeight: 600 }}>
        {label}
      </div>
      {sources.map((s) => (
        <div
          key={s.name}
          className="rounded-lg p-2.5 mb-1.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11 }}
        >
          <div className="flex justify-between items-center mb-0.5">
            <span style={{ color: 'white', fontWeight: 600 }}>{s.name}</span>
            <span
              className="rounded px-1.5 py-0.5 font-semibold"
              style={{
                fontSize: 9,
                background: s.native ? 'rgba(31,163,101,0.2)' : 'rgba(107,79,187,0.2)',
                color: s.native ? 'var(--pd-green-100)' : 'var(--ai-violet-300)',
              }}
            >
              {s.badge}
            </span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{s.meta}</div>
        </div>
      ))}
      {showAdd && (
        <button
          className="w-full rounded-lg text-xs py-2.5"
          style={{
            background: 'rgba(107,79,187,0.1)',
            border: '1px dashed rgba(107,79,187,0.4)',
            color: 'var(--ai-violet-300)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + Adicionar conector externo
        </button>
      )}
    </div>
  )
}
