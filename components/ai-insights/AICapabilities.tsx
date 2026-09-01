import { LayoutGrid, Search, TrendingUp, type LucideIcon } from 'lucide-react'

type CapabilityItem = {
  num: string
  icon: LucideIcon
  title: string
  desc: string
  features: readonly string[]
}

const CAPABILITIES = [
  {
    num: '01',
    icon: Search,
    title: 'Pergunte aos seus dados',
    desc: 'Pergunte em português (ou inglês) sobre até 3 datasets seleccionados ao mesmo tempo: geoespaciais, alfanuméricos, ou uma combinação dos dois. O motor entende o contexto de cada dataset e devolve uma resposta fundamentada apenas nos dados fornecidos.',
    features: [
      'Combine datasets geoespaciais e alfanuméricos numa só pergunta',
      'Citações automáticas ao dataset, fonte e ano',
      'Perguntas sugeridas no fim de cada análise, para continuar a explorar os mesmos datasets',
      'Cruzamento automático por divisão administrativa partilhada',
    ],
  },
  {
    num: '02',
    icon: LayoutGrid,
    title: 'Visualização automática',
    desc: 'Geração automática de gráficos e mapas coropléticos a partir da relação entre os dados seleccionados, inclusive quando combina uma camada geoespacial com uma tabela de indicadores.',
    features: [
      'Mapas por província, distrito ou posto administrativo',
      'Gráficos de barras, linha, área e circular',
      'Análises guardáveis num dashboard pessoal e partilháveis por link',
      'Exportação em PDF, PNG e SVG',
    ],
  },
  {
    num: '03',
    icon: TrendingUp,
    title: 'Análise preditiva',
    desc: 'Estimativas de tendência sobre séries temporais dos dados fornecidos, com banda de incerteza indicativa, sempre identificadas como estimativa da IA e não como um modelo estatístico validado.',
    features: [
      'Projecções com banda de incerteza indicativa',
      'Resposta a cenários hipotéticos ("e se subsídio +10%?")',
      'Perguntas sugeridas específicas para cada dataset seleccionado',
      'Recomendações práticas baseadas apenas nos dados fornecidos',
    ],
  },
] satisfies CapabilityItem[]

export function AICapabilities() {
  return (
    <section className="font-body-stack relative z-10 py-9 md:py-12 bg-white border-b border-[#E2E8E5]">
      <div className="ai-section-inner">
        <div className="max-w-3xl mb-12 md:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#064E2C]" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C]">
              Três capacidades, uma plataforma
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-[1.15] mb-4 tracking-tight">
            De pergunta a decisão, em segundos.
          </h2>
          <p className="text-[15px] md:text-[17px] text-gray-600 leading-relaxed">
            AI Insights combina pesquisa em linguagem natural, visualização automática e estimativas
            preditivas, sempre com base nos dados oficiais do portal e fontes citadas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon
            return (
            <div
              key={cap.num}
              className="group relative overflow-hidden rounded-2xl border border-[#E2E8E5] bg-white p-6 md:p-8 shadow-sm transition-all duration-300 hover:border-[#CFE3D6] hover:shadow-[0_10px_30px_rgba(6,78,44,0.08)] hover:-translate-y-0.5"
            >
              {/* Number badge */}
              <span className="absolute top-6 right-6 font-mono text-[13px] font-bold text-[#064E2C]/35">
                {cap.num}
              </span>

              {/* Icon */}
              <div className="flex items-center justify-center mb-5 w-14 h-14 rounded-xl bg-[#F1F8F4] border border-[#CFE3D6] text-[#064E2C] group-hover:bg-[#E7F3EB] group-hover:scale-105 transition-all duration-200">
                <Icon className="w-6 h-6" />
              </div>

              <h3 className="text-xl md:text-[22px] font-bold text-gray-900 mb-2.5 tracking-tight">
                {cap.title}
              </h3>
              <p className="text-[15px] text-gray-600 mb-4 leading-relaxed">
                {cap.desc}
              </p>

              <ul className="flex flex-col gap-2">
                {cap.features.map((f) => (
                  <li key={f} className="flex gap-2 items-start text-[13px] text-gray-700">
                    <span className="text-[#064E2C] font-bold flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
