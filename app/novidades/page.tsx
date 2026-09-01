import { Bell, LineChart, Map, Palette, Layers } from 'lucide-react'

const NOVIDADES = [
  {
    icon: Layers,
    titulo: 'Miniaturas por assunto no catálogo',
    desc:
      'Os cards de datasets, mapas e relatórios mostram agora uma identidade visual própria por assunto (saúde, agricultura, água, infraestrutura, entre outros), em vez de uma pré-visualização genérica.',
  },
  {
    icon: LineChart,
    titulo: 'AI Insights',
    desc:
      'Faça perguntas em português directamente aos dados do portal e receba narrativa, gráficos e mapa, com fontes citadas e revisão automática antes de publicar.',
  },
  {
    icon: Map,
    titulo: 'Fundo fotográfico nas páginas de catálogo',
    desc:
      'Geoespaciais, Alfanuméricos, Mapas Inteligentes e Relatórios ganharam um visual consistente, com vidro/blur nos painéis de filtro e pesquisa.',
  },
  {
    icon: Palette,
    titulo: 'Serviços redesenhado',
    desc:
      'A página de Serviços foi reconstruída com a paleta e tipografia do portal, com formulário de contacto funcional.',
  },
] as const

export default function NovidadesPage() {
  return (
    <section className="px-4 pt-8 pb-12 sm:pt-10 md:pb-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-[#064E2C] to-[#04361F] p-6 text-white shadow-xl sm:p-8">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/12 border border-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest mb-3">
            <Bell className="size-3.5" aria-hidden />
            Novidades
          </p>
          <h1 className="text-3xl md:text-4xl font-bold">O que há de novo no portal</h1>
          <p className="mt-3 text-white/85 max-w-xl">
            Um resumo das últimas melhorias ao Portal de Dados. As funcionalidades continuam a
            evoluir com base no uso real da plataforma.
          </p>
        </div>

        <ol className="space-y-4">
          {NOVIDADES.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.titulo} className="flex gap-4 rounded-2xl border border-[#E2E8E5] bg-white p-5 shadow-sm">
                <span className="shrink-0 inline-flex size-10 items-center justify-center rounded-xl bg-[#F1F8F4] border border-[#CFE3D6] text-[#064E2C]">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-1">{item.titulo}</h2>
                  <p className="text-[14px] text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
