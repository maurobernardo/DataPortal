import Link from 'next/link'

/* ─────────────────────────────────────────────
   PERSONAS / USE CASES
───────────────────────────────────────────── */
const PERSONAS = [
  {
    tag: 'Cidadão · Investigador',
    title: 'Acesso aberto aos dados oficiais',
    desc: 'Pergunte em linguagem natural sobre qualquer dataset do portal, sem saber SQL ou GIS. Fontes sempre citadas, exports em PDF, PNG e SVG.',
  },
  {
    tag: 'Jornalista · ONG',
    title: 'Verificação e contexto rápidos',
    desc: 'Peça um gráfico ou mapa por província/distrito sobre um indicador, com a fonte e o ano anexados automaticamente para citar na reportagem ou relatório.',
  },
  {
    tag: 'Analista · Consultoria',
    title: 'Primeira leitura antes do aprofundamento',
    desc: 'Explore tendências e peça uma estimativa de projecção com banda de incerteza, sempre identificada como estimativa da IA, ponto de partida para análise própria.',
  },
  {
    tag: 'Estudante · Investigador académico',
    title: 'Explorar dados sem fricção técnica',
    desc: 'Faça perguntas de seguimento sobre o mesmo dataset e guarde as análises úteis no seu dashboard pessoal para consultar depois.',
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
            Para quem precisa de respostas, não de dashboards complexos.
          </h2>
          <p className="text-[15px] md:text-[17px] text-gray-600 leading-relaxed">
            AI Insights serve do estudante ao analista: mesmo acesso, mesma profundidade,
            sem planos nem tiers.
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
              <p className="text-[13px] text-gray-600 leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   TRUST & GOVERNANCE
───────────────────────────────────────────── */
const TRUST_ITEMS = [
  { icon: '⚷', title: 'Fontes sempre citadas', desc: 'Cada resposta referencia o dataset, a fonte e o ano, anexados pelo servidor e nunca gerados pelo modelo.' },
  { icon: '⚖', title: 'Estimativas, não certezas', desc: 'Previsões são sempre identificadas como estimativa da IA, com nível de confiança, nunca como modelo estatístico validado.' },
  { icon: '⌥', title: 'Chave de API protegida', desc: 'O acesso ao modelo de IA é feito apenas pelo servidor, a chave nunca é exposta ao navegador.' },
  { icon: '⚙', title: 'Acesso autenticado e limitado', desc: 'Apenas utilizadores com sessão iniciada, com limite de 20 consultas por dia, para um uso responsável.' },
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
            Cada análise cita a fonte oficial. Cada previsão é identificada como estimativa, nunca
            como certeza. Construído para decisões que importam.
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
          Análise em português, baseada nos dados oficiais do país. Basta iniciar sessão.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/ai-insights/workspace" className="ai-btn ai-btn-ai ai-btn-lg">
            Começar agora →
          </Link>
        </div>
      </div>
    </section>
  )
}
