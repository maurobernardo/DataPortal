import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { contarDatasetsPorCategoria, contarServicos, countDatasets } from '@/lib/db'
import { MAP_CATALOG } from '@/lib/maps-catalog'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Serviços | Data Portal',
  description:
    'Tudo o que o Data Portal oferece: catálogo de dados geoespaciais e alfanuméricos, mapas inteligentes, dashboards, análise por IA, relatórios e alertas, em Moçambique.',
}

type Servico = {
  numero: string
  titulo: string
  descricao: string
  href: string
  metrica?: { valor: number; rotulo: string }
  emBreve?: boolean
  destaque?: boolean
  soConsulta?: boolean
}

export default async function ServicosPage() {
  const [contagens, categorias, totalDatasets] = await Promise.all([
    contarServicos(),
    contarDatasetsPorCategoria(),
    countDatasets(),
  ])
  const totalMapas = MAP_CATALOG.length
  const maxCategoria = Math.max(1, ...categorias.map((c) => c.total))

  const servicos: Servico[] = [
    {
      numero: '01',
      titulo: 'Catálogo de Dados Geoespaciais',
      descricao: 'Fronteiras administrativas, infraestrutura e uso do solo, com pré-visualização em mapa.',
      href: '/dados-espaciais',
      metrica: { valor: contagens.geoespaciais, rotulo: 'datasets geoespaciais' },
    },
    {
      numero: '02',
      titulo: 'Catálogo de Dados Alfanuméricos',
      descricao: 'Tabelas e indicadores de demografia, economia, saúde e educação, prontos a consultar.',
      href: '/dados-alfanumericos',
      metrica: { valor: contagens.alfanumericos, rotulo: 'datasets alfanuméricos' },
    },
    {
      numero: '03',
      titulo: 'Mapas Inteligentes',
      descricao: 'Mapas temáticos já montados, com camadas e filtros interactivos.',
      href: '/maps',
      metrica: { valor: totalMapas, rotulo: 'mapas publicados' },
    },
    {
      numero: '04',
      titulo: 'Dashboards Alfanuméricos',
      descricao: 'Painéis interactivos sobre os dados tabulares do portal, sem precisar de programar.',
      href: '/dashboards-alfanumericos',
      metrica: { valor: contagens.dashboards, rotulo: 'dashboards publicados' },
    },
    {
      numero: '05',
      titulo: 'Análise por Inteligência Artificial',
      descricao:
        'Pergunta em português. O motor planeia a análise, calcula sobre os dados reais, cruza fontes quando precisa e critica-se a si próprio antes de publicar. Cada número do resultado é auditável até ao dado de origem.',
      href: '/analise/nova',
      destaque: true,
    },
    {
      numero: '06',
      titulo: 'Relatórios',
      descricao: 'Relatórios já publicados, prontos a consultar, ou pedido de um relatório personalizado.',
      href: '/relatorios',
      metrica: { valor: contagens.relatorios, rotulo: 'relatórios publicados' },
    },
    {
      numero: '07',
      titulo: 'Alertas de Actualização',
      descricao: 'Segue um dataset e recebe aviso automático sempre que for actualizado.',
      href: '/dados-alfanumericos',
      metrica: { valor: totalDatasets, rotulo: 'datasets a seguir' },
    },
    {
      numero: '08',
      titulo: 'Download de Dados',
      descricao: 'Descarregar o ficheiro original de qualquer dataset publicado, no formato de origem.',
      href: '#',
      emBreve: true,
    },
    {
      numero: '09',
      titulo: 'Recolha de Dados Sob Encomenda',
      descricao: 'Desenho e execução de inquéritos ou recolha em campo para responder a uma pergunta específica.',
      href: '/?assunto=Recolha%20de%20dados%20sob%20encomenda#contato',
      soConsulta: true,
    },
    {
      numero: '10',
      titulo: 'Consultoria e Advisory Estratégico',
      descricao: 'Apoio à decisão com base nos dados do portal, além do que a análise automática já cobre.',
      href: '/?assunto=Consultoria%20e%20advisory%20estrat%C3%A9gico#contato',
      soConsulta: true,
    },
    {
      numero: '11',
      titulo: 'Formação e Capacitação',
      descricao: 'Workshops sobre como usar dados abertos e as ferramentas do portal na sua organização.',
      href: '/?assunto=Forma%C3%A7%C3%A3o%20e%20capacita%C3%A7%C3%A3o#contato',
      soConsulta: true,
    },
    {
      numero: '12',
      titulo: 'Integração de Dados em Tempo Real',
      descricao: 'Ligação de fontes externas ao portal, para actualização contínua em vez de carregamento manual.',
      href: '/?assunto=Integra%C3%A7%C3%A3o%20de%20dados%20em%20tempo%20real#contato',
      soConsulta: true,
    },
  ]

  const servicosReais = servicos.filter((s) => !s.soConsulta)
  const servicosConsulta = servicos.filter((s) => s.soConsulta)

  return (
    <div className="min-h-screen bg-[#FAFBFA]">
      {/* HERO, igual ao resto do portal: mesmo gradiente verde institucional já usado no
          dashboard e na página de análise, não uma paleta nova. */}
      <header className="bg-gradient-to-br from-[#064E2C] to-[#0a6339] text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-14 md:py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9FD4B4] mb-3">
            Data Portal · Serviços
          </p>
          <h1 className="text-3xl md:text-[42px] font-extrabold leading-[1.14] tracking-tight max-w-3xl mb-4">
            Dados prontos para decisão, não só para descarregar.
          </h1>
          <p className="text-[16px] md:text-[18px] text-white/85 leading-relaxed max-w-2xl mb-8">
            Doze formas de usar os dados públicos de Moçambique: desde explorar um mapa até
            perguntar directamente em português e receber uma resposta com números reais.
          </p>
          <div className="flex flex-wrap items-end gap-8 mb-8">
            <div>
              <p className="text-[40px] leading-none font-extrabold tabular-nums">{totalDatasets}</p>
              <p className="mt-1.5 text-[12px] uppercase tracking-wide text-white/60">Datasets publicados</p>
            </div>
            <div>
              <p className="text-[40px] leading-none font-extrabold tabular-nums">{servicosReais.length}</p>
              <p className="mt-1.5 text-[12px] uppercase tracking-wide text-white/60">Serviços disponíveis agora</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/analise/nova"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[14px] font-bold text-[#064E2C] hover:bg-[#F1F8F4] transition-colors"
            >
              Experimentar a análise por IA
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-3 text-[14px] font-bold text-white hover:bg-white/20 transition-colors"
            >
              Ver catálogo completo
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
        {/* Grelha 2x2: cards rectangulares (não quadrados), lado a lado, mesma linguagem visual
            usada em todo o portal (rounded-2xl, border #E2E8E5, bg-white). */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {servicosReais.map((s) => {
            if (s.destaque) {
              return (
                <Link
                  key={s.numero}
                  href={s.href}
                  className="md:col-span-2 group rounded-2xl bg-gradient-to-br from-[#064E2C] to-[#0a6339] text-white p-7 md:p-9 flex flex-col md:flex-row md:items-center gap-6 hover:from-[#0a6339] hover:to-[#0d7a45] transition-colors"
                >
                  <span className="shrink-0 inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-[15px] font-bold tabular-nums">
                    {s.numero}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[20px] md:text-[24px] font-bold leading-tight mb-2">{s.titulo}</h2>
                    <p className="text-[14px] leading-relaxed text-white/80 max-w-2xl">{s.descricao}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-[13px] font-bold text-[#064E2C] group-hover:bg-[#F1F8F4] transition-colors">
                    Abrir
                    <ArrowUpRight className="size-4" aria-hidden />
                  </span>
                </Link>
              )
            }

            const linkavel = !s.emBreve
            const conteudo = (
              <div
                className={`h-full rounded-2xl border p-6 flex flex-col transition-colors ${
                  s.emBreve ? 'border-[#E2E8E5] bg-[#FAFBFA]' : 'border-[#E2E8E5] bg-white hover:border-[#CFE3D6]'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#F1F8F4] text-[13px] font-bold text-[#064E2C] tabular-nums">
                    {s.numero}
                  </span>
                  {s.emBreve && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-amber-800">
                      Em breve
                    </span>
                  )}
                </div>
                <h2 className="text-[16px] font-bold text-[var(--pd-ink-900)] mb-1.5">{s.titulo}</h2>
                <p className="text-[13.5px] leading-relaxed text-[var(--pd-ink-700)] flex-1">{s.descricao}</p>
                <div className="mt-5 pt-4 border-t border-[#E2E8E5] flex items-end justify-between gap-3">
                  {s.metrica ? (
                    <div>
                      <p className="text-[24px] leading-none font-extrabold text-[#064E2C] tabular-nums">{s.metrica.valor}</p>
                      <p className="mt-1 text-[10.5px] uppercase tracking-wide text-gray-500">{s.metrica.rotulo}</p>
                    </div>
                  ) : (
                    <span className="text-[13px] font-semibold text-gray-400">Disponível brevemente</span>
                  )}
                  {linkavel && (
                    <ArrowUpRight className="size-4 text-[#064E2C] shrink-0" aria-hidden />
                  )}
                </div>
              </div>
            )

            return linkavel ? (
              <Link key={s.numero} href={s.href} className="block h-full">
                {conteudo}
              </Link>
            ) : (
              <div key={s.numero} className="h-full">
                {conteudo}
              </div>
            )
          })}
        </div>

        {/* Serviços sob consulta: mesma grelha, tratamento visual mais discreto (não competem
            com os 7 self-service acima) mas continuam a numeração do mesmo directório. */}
        <section className="mb-16">
          <h2 className="text-base font-bold text-[var(--pd-ink-900)] mb-1">Serviços sob consulta</h2>
          <p className="text-[13px] text-gray-500 mb-5">
            Não são self-service como os anteriores: pedidos avaliados caso a caso, com contacto directo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {servicosConsulta.map((s) => (
              <Link
                key={s.numero}
                href={s.href}
                className="rounded-2xl border border-[#E2E8E5] bg-white p-6 flex flex-col hover:border-[#CFE3D6] transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-gray-100 text-[13px] font-bold text-gray-600 tabular-nums">
                    {s.numero}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-gray-600">
                    Sob consulta
                  </span>
                </div>
                <h2 className="text-[16px] font-bold text-[var(--pd-ink-900)] mb-1.5">{s.titulo}</h2>
                <p className="text-[13.5px] leading-relaxed text-[var(--pd-ink-700)] flex-1">{s.descricao}</p>
                <div className="mt-5 pt-4 border-t border-[#E2E8E5]">
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#064E2C]">
                    Pedir serviço
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {categorias.length > 0 && (
          <section className="rounded-2xl border border-[#E2E8E5] bg-white p-6 md:p-8">
            <h2 className="text-lg font-bold text-[var(--pd-ink-900)] mb-1.5">Temas já cobertos</h2>
            <p className="text-[13px] text-gray-500 mb-6">
              Categorias com dados publicados no portal neste momento, ordenadas por quantidade.
            </p>
            <div className="space-y-3 max-w-2xl">
              {categorias.map((c, i) => (
                <div key={c.nome} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-[13px] text-[var(--pd-ink-700)] truncate">{c.nome}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-[#F0F2F1] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i === 0 ? 'bg-[#064E2C]' : 'bg-[#064E2C]/60'}`}
                      style={{ width: `${Math.max(4, (c.total / maxCategoria) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[13px] font-bold text-[var(--pd-ink-800)] tabular-nums">
                    {c.total}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
