import Link from 'next/link'
import { Check, Minus } from 'lucide-react'

/* ─────────────────────────────────────────────
   PERSONAS / USE CASES
───────────────────────────────────────────── */
const PERSONAS = [
  {
    tag: 'Cidadão · Investigador',
    title: 'Acesso democrático aos dados oficiais',
    desc: '50 consultas grátis/mês, citações auditáveis, exports em PDF. Para jornalistas, estudantes e ONGs locais.',
    quote: 'Posso pesquisar dados sobre o meu distrito sem saber SQL ou GIS — e citar a fonte oficial.',
    who: 'Estudante, UEM',
  },
  {
    tag: 'Consultora · ONG Internacional',
    title: 'Análises rápidas, dashboards entregáveis',
    desc: 'Plano Pro. Forecasts, cenários, conectores externos (World Bank, OECD), e dashboards embedáveis em propostas.',
    quote: 'Reduzimos tempo de produção de baseline assessments de 3 semanas para 2 dias.',
    who: 'M&E Lead, ONG internacional',
  },
  {
    tag: 'Doador · Multilateral',
    title: 'Monitorização de programas e políticas',
    desc: 'Plano Enterprise. SSO, RBAC, audit logs, modelos preditivos privados, e dashboards de portfolio para múltiplos países.',
    quote: 'Visibilidade contínua sobre indicadores de programas em Moçambique, Angola e SADC.',
    who: 'Country Director',
  },
  {
    tag: 'Governo · Ministério',
    title: 'Decisões em tempo real, soberania de dados',
    desc: 'Enterprise on-premise ou cloud soberana. Modelos de cenário para políticas públicas, dashboards executivos, e integração com sistemas internos.',
    quote: 'Permitiu-nos modelar impacto de decisões de subsídios agrícolas antes da implementação.',
    who: 'Director Nacional',
  },
]

export function AIPersonas() {
  return (
    <section className="font-body-stack py-16 md:py-24 bg-gradient-to-b from-[#f8faf8] to-[#f2f7f3] border-b border-[#E2E8E5]">
      <div className="ai-section-inner">
        <div className="max-w-3xl mb-12 md:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#064E2C]" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C]">
              Para cada decisor
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-[1.15] mb-4 tracking-tight">
            Quatro perfis. Um produto.
          </h2>
          <p className="text-[15px] md:text-[17px] text-gray-600 leading-relaxed">
            AI Insights serve do estudante ao Ministro. Cada perfil tem o tier certo, com o nível
            de profundidade analítica adequado.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {PERSONAS.map((p) => (
            <div
              key={p.tag}
              className="group rounded-2xl border border-[#E2E8E5] bg-white p-6 md:p-7 shadow-sm transition-all duration-300 hover:border-[#CFE3D6] hover:shadow-[0_10px_30px_rgba(6,78,44,0.08)] hover:-translate-y-0.5"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#064E2C] mb-3">
                {p.tag}
              </p>
              <h3 className="text-lg font-bold text-gray-900 mb-2.5 leading-snug">
                {p.title}
              </h3>
              <p className="text-[13px] text-gray-600 mb-4 leading-relaxed">
                {p.desc}
              </p>
              <blockquote
                className="text-[12px] text-gray-700 leading-relaxed pl-3 py-3 bg-[#F8FAF9] rounded-r-lg border-l-[3px] border-[#064E2C]"
              >
                &ldquo;{p.quote}&rdquo;
                <cite className="block text-[11px] text-gray-500 mt-1.5 not-italic">
                  — {p.who}
                </cite>
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   PRICING MATRIX
───────────────────────────────────────────── */
type CellValue = '✓' | '—' | string

interface MatrixSection {
  sectionLabel: string
  rows: {
    feature: string
    sub?: string
    free: CellValue
    pro: CellValue
    ent: CellValue
    proHighlight?: boolean
    entHighlight?: boolean
  }[]
}

const MATRIX_SECTIONS: MatrixSection[] = [
  {
    sectionLabel: 'Consulta & Análise',
    rows: [
      { feature: 'Consultas em linguagem natural', sub: 'Português & Inglês', free: '50/mês', pro: 'Ilimitado', ent: 'Ilimitado + dedicado', proHighlight: true },
      { feature: 'Refinamento conversacional', free: '✓', pro: '✓', ent: '✓', proHighlight: true },
      { feature: 'Histórico & auditoria de consultas', free: '7 dias', pro: 'Ilimitado', ent: 'Ilimitado + export', proHighlight: true },
    ],
  },
  {
    sectionLabel: 'Datasets',
    rows: [
      { feature: 'Datasets públicos', sub: '12.000+ datasets oficiais', free: '✓', pro: '✓', ent: '✓', proHighlight: true },
      { feature: 'Datasets Pro', sub: 'Séries temporais, projecções, harmonizados', free: '—', pro: '✓', ent: '✓', proHighlight: true },
      { feature: 'Datasets premium licenciados', sub: 'Sectoriais, comerciais, altamente granulares', free: '—', pro: 'Add-on', ent: '✓ incluído', entHighlight: true },
      { feature: 'Upload de datasets privados', free: '—', pro: '5 datasets · 500 MB', ent: 'Ilimitado', proHighlight: true },
    ],
  },
  {
    sectionLabel: 'Análise preditiva',
    rows: [
      { feature: 'Forecasts & séries temporais', free: '—', pro: 'Até 24 meses', ent: 'Até 60 meses', proHighlight: true },
      { feature: 'Detecção de anomalias', free: '—', pro: '✓', ent: '✓ + alertas em tempo real', proHighlight: true },
      { feature: 'Modelagem de cenários "and-if"', free: '—', pro: '✓', ent: '✓ + modelos personalizados', proHighlight: true },
    ],
  },
  {
    sectionLabel: 'Dados externos & integração',
    rows: [
      { feature: 'Conectores standard', sub: 'World Bank, IMF, OECD, UN, FAO', free: '—', pro: '✓', ent: '✓', proHighlight: true },
      { feature: 'Conectores custom (REST, GraphQL, DB)', free: '—', pro: '3 conectores', ent: 'Ilimitado', entHighlight: true },
      { feature: 'API access ao Portal', free: '1.000 calls/mês', pro: '100.000/mês', ent: 'Ilimitado + SLA', proHighlight: true },
    ],
  },
  {
    sectionLabel: 'Outputs & partilha',
    rows: [
      { feature: 'Exportação PDF', free: '✓', pro: '✓ + branded', ent: '✓ + white-label', proHighlight: true },
      { feature: 'Embed widgets', free: '—', pro: '✓', ent: '✓ + custom domains', proHighlight: true },
      { feature: 'Relatórios agendados', free: '—', pro: 'Semanal/mensal', ent: 'Qualquer cadência', proHighlight: true },
    ],
  },
  {
    sectionLabel: 'Governança & segurança',
    rows: [
      { feature: 'SSO (SAML, OAuth)', free: '—', pro: 'Add-on', ent: '✓', entHighlight: true },
      { feature: 'RBAC + audit logs', free: '—', pro: 'Básico', ent: 'Completo + SIEM', proHighlight: true },
      { feature: 'Deployment on-premise / soberano', free: '—', pro: '—', ent: '✓', entHighlight: true },
      { feature: 'SLA', free: 'Best effort', pro: '99.5%', ent: '99.95% + suporte 24/7', proHighlight: true },
    ],
  },
]

const PLAN_COLUMNS = [
  { key: 'free' as const, tier: 'Público', price: 'Grátis', period: 'para sempre', featured: false as const },
  { key: 'pro' as const, tier: 'Pro', price: '$249', period: 'por mês · 5 utilizadores', featured: true as const },
  { key: 'ent' as const, tier: 'Enterprise', price: 'Custom', period: 'contactar vendas', featured: false as const },
] as const

const PLAN_CTA_LINKS = [
  { label: 'Começar grátis →', primary: false, href: '/ai-insights/start' },
  { label: 'Iniciar trial 14 dias', primary: true, href: '/ai-insights/trial' },
  { label: 'Falar com vendas', primary: false, href: '/ai-insights/enterprise' },
] as const

function rowValue(row: MatrixSection['rows'][number], key: 'free' | 'pro' | 'ent'): CellValue {
  return row[key]
}

function rowHighlight(row: MatrixSection['rows'][number], key: 'free' | 'pro' | 'ent'): boolean | undefined {
  if (key === 'pro') return row.proHighlight
  if (key === 'ent') return row.entHighlight
  return undefined
}

/** Conteúdo visual de uma célula (reutilizado na tabela desktop e nos cartões mobile). */
function PricingValueDisplay({
  value,
  align = 'center',
}: {
  value: CellValue
  align?: 'center' | 'end'
}) {
  const flex = align === 'end' ? 'flex justify-end' : 'flex justify-center'

  if (value === '—') {
    return (
      <span className={flex}>
        <Minus className="size-4 shrink-0 text-gray-300" strokeWidth={2} aria-hidden />
        <span className="sr-only">Não incluído neste plano</span>
      </span>
    )
  }

  if (value === '✓') {
    return (
      <span className={flex}>
        <Check className="size-[18px] shrink-0 text-[#064E2C]" strokeWidth={2.5} aria-hidden />
        <span className="sr-only">Incluído</span>
      </span>
    )
  }

  const isAddon = value.startsWith('Add')
  return (
    <span
      className={`block min-w-0 text-[13px] leading-snug ${
        align === 'end' ? 'text-right' : 'text-center'
      } ${isAddon ? 'font-medium text-amber-900/90' : 'font-semibold text-gray-800'}`}
    >
      {value}
    </span>
  )
}

function PricingCell({
  value,
  highlight,
  isProColumn,
}: {
  value: CellValue
  highlight?: boolean
  isProColumn?: boolean
}) {
  const base =
    'px-3 sm:px-4 py-3.5 align-middle border-b border-[#E2E8E5] transition-colors duration-150 ' +
    (isProColumn ? 'bg-[#F2F9F5] border-l border-r border-[#CFE3D6]/90 ' : '') +
    (highlight ? 'bg-[#E8F5ED]/80 ' : '')

  return (
    <td className={`${base} text-center`}>
      <PricingValueDisplay value={value} align="center" />
    </td>
  )
}

export function AIPricingMatrix() {
  return (
    <section className="font-body-stack py-16 md:py-24 bg-white border-b border-[#E2E8E5]">
      <div className="ai-section-inner">
        <div className="max-w-3xl mb-12 md:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#064E2C]" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C]">
              Planos transparentes
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-[1.15] mb-4 tracking-tight">
            O que recebe em cada tier.
          </h2>
          <p className="text-[15px] md:text-[17px] text-gray-600 leading-relaxed">
            Sem surpresas. Sem custos ocultos. Comece grátis, pague quando precisar de profundidade analítica.
          </p>
        </div>

        <p className="sr-only">
          Comparação de planos AI Insights: em telemóvel, cartões por secção com os três planos; em ecrã maior, tabela lado a lado.
        </p>

        {/* Mobile first: cartões por secção + planos em scroll horizontal */}
        <div className="md:hidden flex flex-col gap-8">
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 px-1 [scrollbar-width:thin]">
            {PLAN_COLUMNS.map(({ tier, price, period, featured }, idx) => (
              <div
                key={tier}
                className={`min-w-[min(100%,280px)] shrink-0 snap-center rounded-2xl border px-4 py-4 shadow-sm ${
                  featured
                    ? 'border-[#CFE3D6] bg-gradient-to-br from-[#064E2C] to-[#1FA365] text-white ring-2 ring-[#CFE3D6]/80'
                    : 'border-[#E2E8E5] bg-white text-gray-900'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm font-semibold ${featured ? 'text-white' : 'text-gray-900'}`}>{tier}</span>
                  {featured && (
                    <span className="rounded-full bg-[#D4A017] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0B1B14]">
                      Popular
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-2xl font-bold tracking-tight ${featured ? 'text-white' : 'text-[#064E2C]'}`}>{price}</p>
                <p className={`mt-1 text-[11px] leading-snug ${featured ? 'text-white/85' : 'text-gray-500'}`}>{period}</p>
                <Link
                  href={PLAN_CTA_LINKS[idx].href}
                  className={`mt-4 block w-full rounded-xl py-3 text-center text-sm font-semibold no-underline ${
                    PLAN_CTA_LINKS[idx].primary
                      ? 'bg-[#064E2C] text-white shadow-sm ring-2 ring-white/40 hover:bg-[#053A22]'
                      : featured
                        ? 'border border-white/40 bg-white/15 text-white hover:bg-white/25'
                        : 'border border-[#E2E8E5] bg-[#F8FAF9] text-gray-900 hover:border-[#CFE3D6]'
                  }`}
                >
                  {PLAN_CTA_LINKS[idx].label}
                </Link>
              </div>
            ))}
          </div>

          {MATRIX_SECTIONS.map((section) => (
            <div
              key={section.sectionLabel}
              className="overflow-hidden rounded-2xl border border-[#E2E8E5] bg-white shadow-sm ring-1 ring-black/[0.02]"
            >
              <div className="border-b border-[#CFE3D6]/60 bg-[#F1F8F4] px-4 py-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#064E2C]/90">
                  {section.sectionLabel}
                </h3>
              </div>
              <ul className="divide-y divide-[#E2E8E5]" role="list">
                {section.rows.map((row) => (
                  <li key={`${section.sectionLabel}-${row.feature}`} className="px-4 py-4">
                    <div className="mb-3">
                      <p className="text-[15px] font-semibold leading-snug text-gray-900">{row.feature}</p>
                      {row.sub && (
                        <p className="mt-1 text-[13px] leading-snug text-gray-500">{row.sub}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {PLAN_COLUMNS.map(({ tier, key, featured }) => {
                        const v = rowValue(row, key)
                        const hl = rowHighlight(row, key)
                        const rowStyles = featured
                          ? hl
                            ? 'border border-[#B8DBC8] bg-[#E8F5ED]'
                            : 'border border-[#CFE3D6] bg-[#F2F9F5]'
                          : hl
                            ? 'border border-transparent bg-[#FFFDF6] ring-1 ring-amber-200/70'
                            : 'border border-transparent bg-[#F8FAF9]'
                        return (
                          <div
                            key={tier}
                            className={`flex min-h-[44px] items-center justify-between gap-4 rounded-xl px-3 py-2.5 ${rowStyles}`}
                          >
                            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-[#064E2C]/75">
                              {tier}
                            </span>
                            <div className="min-w-0 flex-1">
                              <PricingValueDisplay value={v} align="end" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* md+: tabela completa */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#E2E8E5] bg-white shadow-sm ring-1 ring-black/[0.03]">
          <table className="w-full border-collapse border-spacing-0 text-left">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-30 w-[min(36%,280px)] min-w-[200px] bg-[#064E2C] px-4 py-4 text-left align-bottom text-[13px] font-semibold text-white shadow-[4px_0_12px_-4px_rgba(0,0,0,0.12)] sm:px-5"
                >
                  Capacidade
                </th>
                {PLAN_COLUMNS.map(({ tier, price, period, featured }) => (
                  <th
                    key={tier}
                    scope="col"
                    className={`min-w-[140px] px-3 py-4 align-bottom text-left text-[13px] font-semibold text-white sm:px-5 ${
                      featured
                        ? 'bg-gradient-to-br from-[#064E2C] to-[#1FA365] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]'
                        : 'bg-[#064E2C]'
                    }`}
                  >
                    <span className="flex flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        {tier}
                        {featured && (
                          <span className="rounded-full bg-[#D4A017] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0B1B14]">
                            Popular
                          </span>
                        )}
                      </span>
                      <span className="text-[22px] font-bold leading-tight tracking-tight">{price}</span>
                      <span className="text-[11px] font-normal text-white/75">{period}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_SECTIONS.flatMap((section) => [
                <tr key={`section-${section.sectionLabel}`} className="bg-[#F1F8F4]">
                  <td
                    colSpan={4}
                    className="px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider text-[#064E2C]/85 sm:px-5"
                  >
                    {section.sectionLabel}
                  </td>
                </tr>,
                ...section.rows.map((row) => (
                  <tr
                    key={`${section.sectionLabel}-${row.feature}`}
                    className="group hover:bg-[#FAFBFA]/90"
                  >
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-[#E2E8E5] bg-white px-4 py-3.5 align-top text-[13px] font-normal shadow-[4px_0_12px_-4px_rgba(0,0,0,0.06)] group-hover:bg-[#FAFBFA] sm:px-5"
                    >
                      <span className="font-semibold text-gray-900">{row.feature}</span>
                      {row.sub && (
                        <span className="mt-1 block text-[12px] font-normal leading-snug text-gray-500">
                          {row.sub}
                        </span>
                      )}
                    </th>
                    <PricingCell value={row.free} />
                    <PricingCell value={row.pro} highlight={row.proHighlight} isProColumn />
                    <PricingCell value={row.ent} highlight={row.entHighlight} />
                  </tr>
                )),
              ])}
              <tr className="bg-[#F8FAF9]">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-[#F8FAF9] px-4 py-5 align-middle text-left text-sm font-semibold text-gray-800 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.06)] sm:px-5"
                >
                  Próximo passo
                </th>
                {PLAN_CTA_LINKS.map(({ label, primary, href }, i) => (
                  <td
                    key={label}
                    className={`p-4 align-middle sm:p-5 ${i === 1 ? 'bg-[#F2F9F5] border-l border-r border-[#CFE3D6]/90' : ''}`}
                  >
                    <Link
                      href={href}
                      className={`block w-full whitespace-normal text-center text-sm font-semibold no-underline transition-all duration-200 sm:whitespace-nowrap ${
                        primary
                          ? 'rounded-xl bg-gradient-to-br from-[#064E2C] to-[#1FA365] px-3 py-3 text-white shadow-sm hover:brightness-105'
                          : 'rounded-xl border border-[#E2E8E5] bg-white px-3 py-3 text-gray-800 hover:border-[#CFE3D6] hover:shadow-sm'
                      }`}
                    >
                      {label}
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-gray-500 sm:text-[13px]">
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 shrink-0 text-[#064E2C]" strokeWidth={2.5} aria-hidden />
            Incluído
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Minus className="size-3.5 shrink-0 text-gray-300" strokeWidth={2} aria-hidden />
            Não disponível neste plano
          </span>
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   TRUST & GOVERNANCE
───────────────────────────────────────────── */
const TRUST_ITEMS = [
  { icon: '⚷', title: 'Lineage completo', desc: 'Cada insight referencia datasets, versões, e timestamps. Reproduzível e citável.' },
  { icon: '⚖', title: 'Validação de modelos', desc: 'Métricas de erro, intervalos de confiança, e backtesting visíveis em cada forecast.' },
  { icon: '⌥', title: 'Soberania de dados', desc: 'Deployment local opcional para Enterprise. GDPR-ready. Data residency em Moçambique.' },
  { icon: '⚙', title: 'Audit logs', desc: 'Trilho completo de quem viu, exportou, e partilhou — para conformidade e governance.' },
]

export function AITrust() {
  return (
    <section className="font-body-stack py-16 md:py-24 bg-gradient-to-b from-[#f8faf8] to-[#f2f7f3] border-t border-[#E2E8E5]">
      <div className="ai-section-inner">
        <div className="max-w-3xl mb-12 md:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#064E2C]" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C]">
              Padrão nacional · Governação séria
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-[1.15] mb-4 tracking-tight">
            AI que pode ser auditada.
          </h2>
          <p className="text-[15px] md:text-[17px] text-gray-600 leading-relaxed">
            Cada análise é rastreável até à fonte oficial. Cada modelo é validado. Cada output cita
            o seu lineage. Construído para decisões que importam.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TRUST_ITEMS.map((t) => (
            <div
              key={t.title}
              className="rounded-2xl border border-[#E2E8E5] bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#CFE3D6] hover:shadow-[0_10px_30px_rgba(6,78,44,0.08)]"
            >
              <div className="flex items-center justify-center mb-4 text-lg w-10 h-10 rounded-xl bg-[#F1F8F4] border border-[#CFE3D6] text-[#064E2C]">
                {t.icon}
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1.5">{t.title}</h4>
              <p className="text-[13px] text-gray-600 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   FINAL CTA
───────────────────────────────────────────── */
export function AIFinalCTA() {
  return (
    <section className="font-body-stack relative overflow-hidden text-center text-white py-16 md:py-24 bg-gradient-to-br from-[#064E2C] to-[#04361F]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_55%)]" />
      <div className="ai-section-inner relative max-w-[720px] mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl lg:text-[48px] font-extrabold tracking-tight leading-tight mb-5">
          Pare de procurar dados. Comece a{' '}
          <span className="text-[#B8E6CC]">decidir com eles.</span>
        </h2>
        <p className="text-[17px] text-white/75 mb-8 leading-relaxed">
          50 consultas grátis. Sem cartão de crédito. 14 dias de Pro completo se quiser ir mais fundo.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/ai-insights/start" className="ai-btn ai-btn-ai ai-btn-lg">
            Começar grátis →
          </Link>
          <Link href="/ai-insights/enterprise" className="ai-btn ai-btn-ghost-white ai-btn-lg">
            Agendar demo Enterprise
          </Link>
        </div>
      </div>
    </section>
  )
}
