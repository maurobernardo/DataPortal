'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { OpenContactTrigger } from '@/components/OpenContactTrigger'
import Link from 'next/link'

const FAQ_ITEMS: { question: string; answer: ReactNode }[] = [
  {
    question: 'O que é o Portal de Dados?',
    answer:
      'É a plataforma pública da Data4Moz para consultar e reutilizar dados oficiais de Moçambique. Inclui catálogos geoespaciais e alfanuméricos, dashboards alfanuméricos integrados, mapas analíticos com KPIs e relatórios para descarregar ou solicitar.',
  },
  {
    question: 'Qual a diferença entre datasets, dashboards e mapas analíticos?',
    answer: (
      <>
        <strong className="text-gray-800">Datasets</strong> são ficheiros ou camadas para descarregar
        (SHP, CSV, etc.) nas áreas{' '}
        <Link href="/dados-espaciais" className="font-semibold text-[#064E2C] hover:underline">
          geoespaciais
        </Link>{' '}
        e{' '}
        <Link href="/dados-alfanumericos" className="font-semibold text-[#064E2C] hover:underline">
          alfanuméricas
        </Link>
        . <strong className="text-gray-800">Dashboards alfanuméricos</strong> são painéis interactivos
        embutidos (ex.: Power BI, ArcGIS). <strong className="text-gray-800">Mapas analíticos</strong>{' '}
        em{' '}
        <Link href="/maps" className="font-semibold text-[#064E2C] hover:underline">
          Mapas inteligentes
        </Link>{' '}
        combinam mapa territorial com gráficos, filtros cruzados e exportação, não são apenas um mapa
        estático.
      </>
    ),
  },
  {
    question: 'O acesso e os downloads são gratuitos?',
    answer:
      'Sim, para o conteúdo publicado em acesso aberto. Pode explorar catálogos, abrir dashboards, usar mapas analíticos e descarregar datasets conforme a licença indicada em cada recurso. Alguns relatórios podem exigir pedido de acesso.',
  },
  {
    question: 'Como funciona a pesquisa na página inicial?',
    answer:
      'Ao digitar na barra de pesquisa, o portal sugere datasets, mapas publicados, dashboards alfanuméricos e relatórios, cada um com etiqueta e ligação directa. Os botões «Tente:» são atalhos para temas frequentes (geoespacial, mapas de saúde, dashboards, relatórios).',
  },
  {
    question: 'Preciso de conta para usar o portal?',
    answer:
      'A consulta pública, pré-visualização, mapas e grande parte dos downloads não exigem registo. Áreas de administração e gestão de conteúdo são reservadas a utilizadores autorizados.',
  },
  {
    question: 'Como pedir um novo dataset, dashboard ou relatório?',
    answer: (
      <>
        Use{' '}
        <OpenContactTrigger className="inline font-semibold text-[#064E2C] underline-offset-2 hover:underline">
          Falar connosco
        </OpenContactTrigger>{' '}
        (topo ou botão flutuante) e indique o tema, fonte desejada e tipo de recurso (dataset, dashboard,
        mapa ou relatório).
      </>
    ),
  },
  {
    question: 'Como citar ou reutilizar os dados?',
    answer:
      'Consulte fonte, ano e licença nos metadados de cada dataset ou na ficha do relatório. Para reutilização comercial ou científica com dúvidas, contacte a equipa pelos canais oficiais do portal.',
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section
      id="faq"
      className="font-body-stack py-16 md:py-24 bg-white relative overflow-hidden border-t border-[#E2E8E5]"
    >
      <div className="pointer-events-none absolute top-0 right-0 w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,_rgba(6,78,44,0.06)_0%,_transparent_70%)] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-4 py-1.5 mb-5">
            <HelpCircle className="w-3.5 h-3.5 text-[#064E2C]" aria-hidden />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C]">
              Perguntas frequentes
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-3">
            FAQ: <span className="text-[#064E2C]">respostas rápidas</span>
          </h2>
          <p className="text-[15px] md:text-[16px] text-gray-600 leading-relaxed">
            Catálogos, dashboards, mapas analíticos, relatórios e pesquisa unificada. Ainda precisa de
            ajuda? Use o botão Falar connosco no topo ou o botão flutuante.
          </p>
        </div>

        <div className="max-w-3xl flex flex-col gap-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index
            return (
              <div
                key={item.question}
                className={`rounded-2xl border transition-shadow duration-200 ${
                  isOpen
                    ? 'border-[#CFE3D6] bg-[#FAFBFA] shadow-[0_8px_28px_rgba(6,78,44,0.08)]'
                    : 'border-[#E2E8E5] bg-white hover:border-[#CFE3D6] hover:shadow-sm'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  id={`faq-trigger-${index}`}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 text-left px-5 py-4 md:px-6 md:py-5"
                >
                  <span className="text-[15px] md:text-base font-semibold text-gray-900 pr-2">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#064E2C] transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  />
                </button>
                <div
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${index}`}
                  hidden={!isOpen}
                  className={isOpen ? 'block' : 'hidden'}
                >
                  <div className="border-t border-[#E2E8E5] px-5 pb-5 pt-3 md:px-6 md:pb-6 md:pt-4">
                    <div className="text-[15px] leading-relaxed text-gray-600">{item.answer}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          Não encontrou o que procura?{' '}
          <OpenContactTrigger className="font-semibold text-[#064E2C] hover:underline inline">
            Abrir contacto
          </OpenContactTrigger>
        </p>
      </div>
    </section>
  )
}
