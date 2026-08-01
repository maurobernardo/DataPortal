'use client'

import Link from 'next/link'
import {
  Mail,
  Globe2,
  Database,
  Map,
  ArrowRight,
  Linkedin,
  BarChart3,
  MapPin,
  FileText,
  LayoutDashboard,
} from 'lucide-react'
import { useContactModal } from '@/components/ContactModalProvider'

const PILLARS = [
  {
    icon: Globe2,
    label: 'Dados geoespaciais',
    desc: 'Catálogo de camadas, pré-visualização em mapa e download em formatos interoperáveis.',
    href: '/dados-espaciais',
  },
  {
    icon: Database,
    label: 'Dados alfanuméricos',
    desc: 'Indicadores, tabelas e séries temporais com metadados e pesquisa por tema ou fonte.',
    href: '/dados-alfanumericos',
  },
  {
    icon: LayoutDashboard,
    label: 'Dashboards alfanuméricos',
    desc: 'Painéis interactivos (Power BI, ArcGIS, etc.) integrados no portal para consulta rápida.',
    href: '/dashboards-alfanumericos',
  },
  {
    icon: MapPin,
    label: 'Mapas inteligentes',
    desc: 'Experiências com mapa Leaflet, KPIs, filtros cruzados e análise territorial integrada.',
    href: '/maps',
  },
  {
    icon: FileText,
    label: 'Relatórios',
    desc: 'Estudos e publicações para descarregar ou solicitar, com registo de pedidos de acesso.',
    href: '/relatorios',
  },
] as const

export function AboutSection() {
  const { openContact } = useContactModal()
  return (
    <section
      id="sobre"
      className="font-body-stack relative z-10 py-16 md:py-24 overflow-hidden bg-gradient-to-b from-[#f8faf8] to-[#f2f7f3] border-t border-[#E2E8E5]"
    >
      <div className="pointer-events-none absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-[radial-gradient(circle,_rgba(6,78,44,0.08)_0%,_transparent_70%)] opacity-80" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[radial-gradient(circle,_rgba(6,78,44,0.06)_0%,_transparent_70%)] opacity-80" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-4 py-1.5 mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#064E2C]" />
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C]">
            Sobre a Plataforma DataPortal
          </span>
        </div>

        <div className="max-w-2xl mb-14 animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <h2 className="text-3xl md:text-4xl lg:text-[44px] font-extrabold text-gray-900 leading-[1.15] mb-4">
            Dados abertos para{' '}
            <span className="text-[#064E2C]">decisões que importam</span>
          </h2>
          <p className="text-[15px] md:text-[17px] text-gray-600 leading-relaxed">
            Plataforma aberta da Data4Moz para dados, indicadores e inteligência territorial, com
            pesquisa unificada, metadados e acesso aberto a todos os módulos do portal.
          </p>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-14 animate-slide-up"
          style={{ animationDelay: '0.15s' }}
        >
          {PILLARS.map(({ icon: Icon, label, desc, href }) => (
            <Link
              key={label}
              href={href}
              className="group rounded-2xl border border-[#E2E8E5] bg-white p-6 md:p-7 shadow-sm transition-all duration-300 hover:border-[#CFE3D6] hover:shadow-[0_10px_30px_rgba(6,78,44,0.08)] hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#F1F8F4] border border-[#CFE3D6] mb-4 group-hover:bg-[#E7F3EB] group-hover:scale-105 transition-all duration-200">
                <Icon className="w-[18px] h-[18px] stroke-[#064E2C]" strokeWidth={2} />
              </div>
              <p className="text-base font-bold text-gray-900 mb-2 tracking-tight group-hover:text-[#064E2C] transition-colors">
                {label}
              </p>
              <p className="text-[14px] text-gray-600 leading-relaxed mb-3">{desc}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#064E2C]">
                Explorar <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>

        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-start mb-14 animate-slide-up"
          style={{ animationDelay: '0.25s' }}
        >
          <div className="space-y-5">
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C] flex items-center gap-3 after:content-[''] after:flex-1 after:h-px after:bg-[#CFE3D6]">
              A nossa missão
            </p>
            <p className="text-[15px] text-gray-600 leading-[1.8]">
              O <strong className="text-gray-900 font-semibold">DataPortal</strong> é a plataforma
              aberta da Data4Moz que reúne dados, indicadores e produtos de inteligência territorial
              para servir instituições, academia, empresas e sociedade civil.
            </p>
            <p className="text-[15px] text-gray-600 leading-[1.8]">
              A plataforma permite descarregar datasets, consultar dashboards alfanuméricos, explorar
              mapas com indicadores territoriais, incluindo saúde, infraestruturas, agricultura,
              conservação, economia, entre outros sectores; e aceder a relatórios, através de
              mecanismos consistentes de pesquisa e filtragem.
            </p>
            <p className="text-[15px] text-gray-600 leading-[1.8]">
              Com esta iniciativa, a Data4Moz reforça o seu compromisso de tornar os dados mais
              acessíveis, comparáveis e úteis, contribuindo para um ecossistema de dados abertos mais
              completo em Moçambique.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { num: '5', label: 'Áreas do portal (geo, alfa, dashboards, mapas, relatórios)' },
                { num: '100%', label: 'Acesso aberto às publicações disponíveis' },
              ].map(({ num, label }) => (
                <div
                  key={num}
                  className="border border-gray-200 rounded-xl p-5 hover:border-[#CFE3D6] hover:-translate-y-0.5 transition-all duration-200"
                >
                  <p className="font-extrabold text-3xl text-[#064E2C] leading-none mb-1.5">{num}</p>
                  <p className="text-xs text-gray-500 leading-snug">{label}</p>
                </div>
              ))}
            </div>

            <div className="border-l-[3px] border-[#064E2C] bg-white rounded-r-xl px-5 py-4">
              <p className="text-sm text-gray-600 leading-relaxed italic">
                &ldquo;Do catálogo ao mapa analítico: dados e decisão no mesmo fluxo.&rdquo;
              </p>
              <cite className="block mt-2 text-xs text-gray-500 not-italic font-medium">
                Equipa Data4Moz
              </cite>
            </div>

            <div className="border border-gray-200 rounded-xl p-5 hover:border-[#CFE3D6] transition-colors duration-200">
              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#064E2C]" />
                Pesquisa · Visualização · Download · Dashboards
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                A barra de pesquisa na página inicial sugere datasets, mapas publicados, dashboards e
                relatórios, com atalhos directos para cada módulo.
              </p>
            </div>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-5 pt-8 border-t border-gray-100 animate-slide-up"
          style={{ animationDelay: '0.35s' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#064E2C] flex items-center justify-center shadow-sm">
              <span className="text-white text-[10px] font-extrabold tracking-tight">D4M</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Data4Moz</p>
              <p className="text-xs text-gray-500">
                Geoespacial · Alfanumérico · Dashboards · Mapas inteligentes · Relatórios
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => openContact()}
              className="inline-flex items-center gap-2 rounded-full bg-[#064E2C] text-white text-xs font-bold px-5 py-2.5 hover:bg-[#04361F] transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Fale com a equipa
            </button>
            <Link
              href="/maps"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 text-gray-600 text-xs font-medium px-4 py-2.5 hover:border-[#CFE3D6] hover:bg-[#F1F8F4] transition-colors"
            >
              <Map className="w-3.5 h-3.5" />
              Mapas inteligentes
            </Link>
            <a
              href="mailto:portaldedados@data4moz.com"
              className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#E2E8E5] bg-white text-[#064E2C] shadow-sm transition-all duration-200 hover:border-[#064E2C] hover:bg-[#F1F8F4] hover:shadow-[0_8px_20px_rgba(6,78,44,0.12)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] focus-visible:ring-offset-2"
              aria-label="Enviar email para portaldedados@data4moz.com"
            >
              <Mail className="h-5 w-5 transition-transform group-hover:scale-105" strokeWidth={2} />
            </a>
            <a
              href="https://www.linkedin.com/company/data4moz/posts/?feedView=all"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#E2E8E5] bg-white text-[#0A66C2] shadow-sm transition-all duration-200 hover:border-[#0A66C2] hover:bg-[#E8F4FC] hover:shadow-[0_8px_24px_rgba(10,102,194,0.18)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2"
              aria-label="Data4Moz no LinkedIn: publicações da empresa"
            >
              <Linkedin className="h-5 w-5 transition-transform group-hover:scale-105" strokeWidth={2} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
