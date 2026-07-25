import type { CSSProperties } from 'react'

type TierType = 'free' | 'pro' | 'ent'

type CapabilityTier = { label: string; type: TierType }
type CapabilityItem = {
  num: string
  icon: string
  title: string
  desc: string
  features: readonly string[]
  tiers: readonly CapabilityTier[]
  tierNote?: string
}

const CAPABILITIES = [
  {
    num: '01',
    icon: '⌕',
    title: 'Ask Your Data',
    desc: 'Pergunte em português ou inglês. O motor entende contexto sectorial, divisões administrativas e séries temporais — devolve resposta com fontes auditáveis.',
    features: [
      'Linguagem natural PT/EN com contexto regional',
      'Citações automáticas a datasets oficiais',
      'Refinamento conversacional ("e em 2023?")',
      'Confiança da resposta + trilho de auditoria',
    ],
    tiers: [
      { label: 'Público', type: 'free' as const },
      { label: 'Pro', type: 'pro' as const },
      { label: 'Enterprise', type: 'ent' as const },
    ],
  },
  {
    num: '02',
    icon: '▦',
    title: 'Auto-Visualize',
    desc: 'Geração automática de gráficos, mapas coropléticos, tabelas e dashboards multi-tile. O sistema escolhe a visualização certa para os seus dados — você refina.',
    features: [
      'Mapas geoespaciais (provincial, distrital, posto)',
      'Séries temporais, distribuições, comparações',
      'Dashboards multi-tile guardáveis e partilháveis',
      'Embed widgets e exportação PDF/PNG/SVG',
    ],
    tiers: [
      { label: 'Pro', type: 'pro' as const },
      { label: 'Enterprise', type: 'ent' as const },
    ],
    tierNote: 'Dashboards próprios em',
  },
  {
    num: '03',
    icon: '↗',
    title: 'Predictive Analytics',
    desc: 'Modelos de previsão, detecção de anomalias e cenários "and-if" sobre qualquer série temporal do portal. Validados, com intervalos de confiança.',
    features: [
      'Forecasts até 60 meses com bandas de confiança',
      'Detecção de anomalias automática',
      'Modelagem de cenários ("e se subsídio +10%?")',
      'Validação cruzada e métricas de erro transparentes',
    ],
    tiers: [
      { label: 'Pro', type: 'pro' as const },
      { label: 'Enterprise', type: 'ent' as const },
    ],
    tierNote: 'Exclusivo',
  },
  {
    num: '04',
    icon: '⇄',
    title: 'Blend External Data',
    desc: 'Federação de dados nativos do portal com Banco Mundial, FMI, OECD, UN, e os seus próprios uploads. Harmonização automática + governance completa.',
    features: [
      'Conectores: World Bank, IMF, OECD, UN, custom REST',
      'Upload privado de CSV/Excel/Shapefile/GeoJSON',
      'Harmonização semântica e join geográfico automático',
      'Provenance, lineage, e controlo de partilha',
    ],
    tiers: [
      { label: 'Pro', type: 'pro' as const },
      { label: 'Enterprise', type: 'ent' as const },
    ],
    tierNote: 'Conectores em Pro · Custom em',
  },
] satisfies CapabilityItem[]

const TIER_STYLES: Record<TierType, CSSProperties> = {
  free: { background: '#F1F8F4', color: '#064E2C' },
  pro: { background: '#E7F3EB', color: '#064E2C' },
  ent: { background: '#FDF3D9', color: '#7A5C00' },
}

export function AICapabilities() {
  return (
    <section className="font-body-stack relative z-10 py-16 md:py-24 bg-white border-b border-[#E2E8E5]">
      <div className="ai-section-inner">
        <div className="max-w-3xl mb-12 md:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#064E2C]" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C]">
              Quatro capacidades, uma plataforma
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-[1.15] mb-4 tracking-tight">
            De pergunta a decisão, em segundos.
          </h2>
          <p className="text-[15px] md:text-[17px] text-gray-600 leading-relaxed">
            AI Insights combina pesquisa em linguagem natural, visualização automática, modelos
            preditivos e federação de dados externos — tudo governado pelos padrões do portal nacional.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.num}
              className="group relative overflow-hidden rounded-2xl border border-[#E2E8E5] bg-white p-6 md:p-8 shadow-sm transition-all duration-300 hover:border-[#CFE3D6] hover:shadow-[0_10px_30px_rgba(6,78,44,0.08)] hover:-translate-y-0.5"
            >
              {/* Number badge */}
              <span className="absolute top-6 right-6 font-mono text-[13px] font-bold text-[#064E2C]/35">
                {cap.num}
              </span>

              {/* Icon */}
              <div className="flex items-center justify-center mb-5 w-14 h-14 rounded-xl bg-[#F1F8F4] border border-[#CFE3D6] text-2xl text-[#064E2C] group-hover:bg-[#E7F3EB] group-hover:scale-105 transition-all duration-200">
                {cap.icon}
              </div>

              <h3 className="text-xl md:text-[22px] font-bold text-gray-900 mb-2.5 tracking-tight">
                {cap.title}
              </h3>
              <p className="text-[15px] text-gray-600 mb-4 leading-relaxed">
                {cap.desc}
              </p>

              <ul className="flex flex-col gap-2 mb-4">
                {cap.features.map((f) => (
                  <li key={f} className="flex gap-2 items-start text-[13px] text-gray-700">
                    <span className="text-[#064E2C] font-bold flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-[#E2E8E5] text-xs text-gray-500">
                {'tierNote' in cap && cap.tierNote ? <span>{cap.tierNote}</span> : null}
                {cap.tiers.map((t) => (
                  <span
                    key={t.label}
                    className="rounded px-2 py-0.5 text-xs font-semibold"
                    style={TIER_STYLES[t.type]}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
