'use client'

import { useState } from 'react'
import {
  Globe,
  Map,
  Download,
  Search,
  Database,
  Shield,
  Zap,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  BarChart3,
  MapPinned,
  FileText,
  BrainCircuit,
  Bell,
  Video,
  FileSearch,
} from 'lucide-react'
import Link from 'next/link'
import { RevealOnScroll } from './RevealOnScroll'

type FeatureVariant = 'brand' | 'red' | 'amber'

const mainFeatures: {
  icon: typeof Globe
  title: string
  description: string
  tag: string
  num: string
  variant: FeatureVariant
  href: string
}[] = [
  {
    icon: BrainCircuit,
    title: 'Análise por Inteligência Artificial',
    description:
      'Pergunta em português, o motor planeia, calcula sobre os dados reais e critica-se antes de publicar. Cada número é auditável até ao dado de origem.',
    tag: 'Novo',
    num: '01',
    variant: 'brand',
    href: '/analise/nova',
  },
  {
    icon: Globe,
    title: 'Dados geoespaciais completos',
    description:
      'Catálogo organizado por categorias e temas, com metadados e formatos interoperáveis.',
    tag: 'Espacial',
    num: '02',
    variant: 'brand',
    href: '/dados-espaciais',
  },
  {
    icon: Map,
    title: 'Visualização e exploração',
    description:
      'Pré-visualização de dados espaciais e páginas de detalhe para explorar cada dataset.',
    tag: 'Mapas',
    num: '03',
    variant: 'red',
    href: '/dados-espaciais',
  },
  {
    icon: Download,
    title: 'Download imediato',
    description:
      'Formatos comuns (SHP, GeoJSON, CSV, etc.) com registo de downloads na plataforma.',
    tag: 'Exportação',
    num: '04',
    variant: 'brand',
    href: '/dados-espaciais',
  },
  {
    icon: Search,
    title: 'Pesquisa e filtros',
    description:
      'Filtros por categoria, ano, formato e palavras-chave nas áreas geoespacial e alfanumérica.',
    tag: 'Pesquisa',
    num: '05',
    variant: 'amber',
    href: '/dados-alfanumericos',
  },
  {
    icon: Bell,
    title: 'Alertas de actualização',
    description:
      'Segue um dataset e recebe aviso automático sempre que for actualizado, sem ter de voltar a verificar.',
    tag: 'Alertas',
    num: '06',
    variant: 'amber',
    href: '/dados-alfanumericos',
  },
  {
    icon: Database,
    title: 'Metadados e qualidade',
    description:
      'Informação sobre fonte, ano, formato e descrição para reutilização responsável dos dados.',
    tag: 'Qualidade',
    num: '07',
    variant: 'brand',
    href: '/dados-espaciais',
  },
  {
    icon: TrendingUp,
    title: 'Indicadores de utilização',
    description:
      'Visualizações e downloads agregados para perceber quais datasets são mais consultados.',
    tag: 'Estatísticas',
    num: '08',
    variant: 'red',
    href: '/dados-espaciais',
  },
  {
    icon: BarChart3,
    title: 'Dashboards alfanuméricos',
    description:
      'Painéis publicados no portal com pré-visualização e ligação directa ao conteúdo interactivo.',
    tag: 'Dashboards',
    num: '09',
    variant: 'brand',
    href: '/dashboards-alfanumericos',
  },
  {
    icon: MapPinned,
    title: 'Mapas com análise integrada',
    description:
      'Experiências geoespaciais com KPIs, gráficos, filtros cruzados e exportação, além do mapa base.',
    tag: 'Mapas',
    num: '10',
    variant: 'amber',
    href: '/maps',
  },
  {
    icon: FileText,
    title: 'Relatórios e estudos',
    description:
      'Consulta e pedido de acesso a relatórios oficiais, com metadados de cobertura e parceiros.',
    tag: 'Relatórios',
    num: '11',
    variant: 'red',
    href: '/relatorios',
  },
  {
    icon: FileSearch,
    title: 'Análise de relatórios por IA',
    description:
      'Peça a análise de qualquer relatório com PDF: resumo com os principais pontos, cada um com a página onde se confirma, e perguntas directas ao documento.',
    tag: 'Novo',
    num: '12',
    variant: 'brand',
    href: '/relatorios',
  },
  {
    icon: Video,
    title: 'Ruas 360°',
    description:
      'Navegue pelas ruas de Maputo e Chimoio captadas em 360° pela nossa equipa, imagem a imagem, com sinais de trânsito e filtros, sem sair do portal.',
    tag: 'Novo',
    num: '13',
    variant: 'amber',
    href: '/ruas-360',
  },
]

const variantStyles: Record<
  FeatureVariant,
  { iconBg: string; iconBorder: string; iconStroke: string; tagClass: string; hoverRing: string }
> = {
  brand: {
    iconBg: 'bg-[#F1F8F4]',
    iconBorder: 'border-[#CFE3D6]',
    iconStroke: '#064E2C',
    tagClass: 'bg-[#F1F8F4] text-[#064E2C] border border-[#CFE3D6]',
    hoverRing: 'hover:border-[#CFE3D6] hover:bg-[#FAFDFB]',
  },
  red: {
    iconBg: 'bg-red-50',
    iconBorder: 'border-red-100',
    iconStroke: '#b91c1c',
    tagClass: 'bg-red-50 text-red-800 border border-red-100',
    hoverRing: 'hover:border-red-100 hover:bg-red-50/50',
  },
  amber: {
    iconBg: 'bg-amber-50',
    iconBorder: 'border-amber-100',
    iconStroke: '#b45309',
    tagClass: 'bg-amber-50 text-amber-900 border border-amber-100',
    hoverRing: 'hover:border-amber-100 hover:bg-amber-50/40',
  },
}

const benefits = [
  { icon: Shield, text: 'Dados verificados' },
  { icon: Zap, text: 'Acesso rápido' },
  { icon: Users, text: 'Para todos' },
  { icon: CheckCircle2, text: 'Actualização contínua' },
]

export function FeaturesSection() {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? mainFeatures : mainFeatures.slice(0, 4)

  return (
    <section className="font-body-stack py-9 md:py-12 bg-white relative overflow-hidden border-t border-[#E2E8E5]">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #064E2C 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }}
      />
      <div className="pointer-events-none absolute top-0 right-0 w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,_rgba(6,78,44,0.06)_0%,_transparent_68%)] -z-10" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[radial-gradient(circle,_rgba(220,38,38,0.04)_0%,_transparent_65%)] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-4 py-1.5 mb-5">
              <div className="w-2 h-2 rounded-full bg-[#064E2C]" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C]">
                Funcionalidades
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-extrabold text-gray-900 leading-[1.12] mb-4 tracking-tight">
              Por que escolher{' '}
              <span className="text-[#064E2C]">o nosso portal</span>?
            </h2>
            <p className="text-[15px] md:text-[17px] text-gray-600 leading-relaxed">
              Pesquisa, catálogo, downloads, dashboards, mapas, análise por Inteligência Artificial
              e relatórios, num só ecossistema pensado para decisões com dados oficiais.
            </p>
          </div>

          <div className="flex gap-8 md:gap-10 shrink-0">
            {[
              { n: '13+', label: 'Funcionalidades' },
              { n: '100%', label: 'Acesso aberto' },
              { n: '∞', label: 'Formatos' },
            ].map(({ n, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl md:text-3xl font-extrabold text-[#064E2C] leading-none">{n}</p>
                <p className="text-[11px] md:text-xs text-gray-500 mt-1.5 font-semibold uppercase tracking-wide">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-6">
          {visible.map((f, i) => {
            const Icon = f.icon
            const vs = variantStyles[f.variant]
            const isHero = i === 0
            return (
              <RevealOnScroll key={f.num} delayMs={i * 70}>
                <div
                  className={[
                    'group relative rounded-2xl border border-[#E2E8E5] bg-white p-6 md:p-7 shadow-[0_1px_3px_rgba(11,27,20,0.06)] transition-all duration-300',
                    'hover:border-[#CFE3D6] hover:shadow-[0_12px_32px_rgba(6,78,44,0.1)] hover:-translate-y-0.5',
                    vs.hoverRing,
                    isHero ? 'md:col-span-2' : '',
                  ].join(' ')}
                >
                  <span className="absolute top-5 right-5 text-[11px] font-semibold text-gray-400 tracking-widest tabular-nums select-none group-hover:text-gray-500 transition-colors">
                    {f.num}
                  </span>

                  <div className="flex items-center gap-3 mb-5 pr-8">
                    <div
                      className={[
                        'shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-105',
                        vs.iconBg,
                        vs.iconBorder,
                      ].join(' ')}
                    >
                      <Icon className="w-5 h-5" color={vs.iconStroke} strokeWidth={2} />
                    </div>
                    <span
                      className={`inline-flex w-fit items-center text-[11px] font-semibold tracking-wide uppercase px-3 py-1.5 rounded-full ${vs.tagClass}`}
                    >
                      {f.tag}
                    </span>
                  </div>

                  <h3 className="text-lg md:text-xl font-bold text-gray-900 leading-snug tracking-tight group-hover:text-[#064E2C] transition-colors mb-3">
                    {f.title}
                  </h3>
                  <p className="text-[15px] text-gray-600 leading-relaxed">{f.description}</p>
                  <Link
                    href={f.href}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#064E2C]/[0.06] px-3 py-1.5 text-sm font-semibold text-[#064E2C] transition-all group-hover:gap-2.5 group-hover:bg-[#064E2C]/10"
                  >
                    Explorar recursos
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </RevealOnScroll>
            )
          })}
        </div>

        <div className="text-center mb-12">
          <button
            type="button"
            onClick={() => setShowAll((p) => !p)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#CFE3D6] bg-white text-[#064E2C] text-sm font-semibold hover:bg-[#F1F8F4] transition-all duration-200"
          >
            {showAll ? 'Ver menos' : 'Ver mais recursos'}
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="border border-gray-200 bg-[#FAFBFA] rounded-2xl px-4 py-4 md:px-6 md:py-5 flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-12">
          {benefits.map(({ icon: Icon, text }, i) => (
            <RevealOnScroll key={text} delayMs={i * 50}>
              <div className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-transparent bg-white hover:border-[#CFE3D6] hover:shadow-sm transition-all duration-200 cursor-default">
                <div className="w-8 h-8 rounded-full bg-[#064E2C] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[14px] font-semibold text-gray-800 whitespace-nowrap">{text}</span>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
          <Link
            href="/analise/nova"
            className="group inline-flex items-center gap-3 px-8 py-3.5 bg-[#064E2C] text-white rounded-xl font-bold text-[15px] hover:bg-[#04361F] transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-[rgba(6,78,44,0.2)]"
          >
            <BrainCircuit className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Fazer uma análise por IA
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/servicos"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-[#CFE3D6] bg-white text-[#064E2C] font-semibold text-[15px] hover:bg-[#F1F8F4] transition-all duration-200"
          >
            <MapPinned className="w-5 h-5" />
            Ver todos os serviços
          </Link>
          <Link
            href="/#sobre"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-[15px] hover:border-[#CFE3D6] hover:bg-[#F1F8F4] hover:text-[#064E2C] transition-all duration-200"
          >
            Saber mais
          </Link>
        </div>
      </div>
    </section>
  )
}
