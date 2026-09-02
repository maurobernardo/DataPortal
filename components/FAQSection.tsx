'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, HelpCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { OpenContactTrigger } from '@/components/OpenContactTrigger'
import Link from 'next/link'

const FAQ_ITEMS: { question: string; answer: ReactNode }[] = [
  {
    question: 'O que é o Portal de Dados?',
    answer: (
      <>
        É a plataforma pública da Data4Moz para consultar e reutilizar dados oficiais de
        Moçambique. Inclui catálogos geoespaciais e alfanuméricos, dashboards alfanuméricos
        integrados, mapas analíticos com KPIs, relatórios para descarregar ou solicitar, e um{' '}
        <Link href="/analise/nova" className="font-semibold text-[#064E2C] hover:underline">
          motor de análise por Inteligência Artificial
        </Link>{' '}
        que responde a perguntas em português com números reais, calculados na hora. Toda a
        lista de serviços está em{' '}
        <Link href="/servicos" className="font-semibold text-[#064E2C] hover:underline">
          Serviços
        </Link>
        .
      </>
    ),
  },
  {
    question: 'Como funciona a análise por Inteligência Artificial?',
    answer: (
      <>
        Escreve a pergunta em português em{' '}
        <Link href="/analise/nova" className="font-semibold text-[#064E2C] hover:underline">
          Análise
        </Link>{' '}
        (ex.: «que distritos têm menor cobertura de água potável?»). O motor planeia a análise,
        calcula sobre os dados reais seleccionados, cruza outras fontes do portal quando os
        dados escolhidos não chegam, e revê-se criticamente antes de publicar. O resultado é um
        dashboard onde cada número tem proveniência auditável: método, dataset e linhas usadas,
        nunca um valor inventado.
      </>
    ),
  },
  {
    question: 'Qual a diferença entre datasets, dashboards, mapas analíticos e análise por IA?',
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
        já montados. <strong className="text-gray-800">Mapas analíticos</strong> em{' '}
        <Link href="/maps" className="font-semibold text-[#064E2C] hover:underline">
          Mapas inteligentes
        </Link>{' '}
        combinam mapa territorial com gráficos e filtros cruzados. A{' '}
        <strong className="text-gray-800">análise por IA</strong> é diferente das três: não é um
        recurso já pronto, é uma pergunta nova respondida na hora, com um dashboard gerado
        especificamente para essa pergunta.
      </>
    ),
  },
  {
    question: 'O acesso e os downloads são gratuitos?',
    answer:
      'Sim, para o conteúdo publicado em acesso aberto. Pode explorar catálogos, abrir dashboards, usar mapas analíticos, fazer análises por IA e descarregar datasets conforme a licença indicada em cada recurso. Alguns relatórios podem exigir pedido de acesso.',
  },
  {
    question: 'Como funciona a pesquisa na página inicial?',
    answer: (
      <>
        Ao digitar na barra de pesquisa, o portal sugere datasets, mapas publicados, dashboards
        alfanuméricos e relatórios, cada um com etiqueta e ligação directa. O botão «Modo IA»
        junto à pesquisa leva directamente à análise por Inteligência Artificial, para perguntas
        que um filtro de catálogo não responde. Os botões «Tente:» são atalhos para temas
        frequentes.
      </>
    ),
  },
  {
    question: 'Preciso de conta para usar o portal?',
    answer:
      'A consulta pública, pré-visualização, mapas e grande parte dos downloads não exigem registo. Pedir uma análise por IA ou seguir um dataset com alertas de actualização exige sessão iniciada. Áreas de administração e gestão de conteúdo são reservadas a utilizadores autorizados.',
  },
  {
    question: 'Como recebo aviso quando um dataset for actualizado?',
    answer: (
      <>
        Em qualquer{' '}
        <Link href="/dados-alfanumericos" className="font-semibold text-[#064E2C] hover:underline">
          dataset
        </Link>{' '}
        que consulte, pode activar o alerta de actualização: recebe aviso automático sempre que
        o dataset for actualizado, sem precisar de voltar a verificar manualmente.
      </>
    ),
  },
  {
    question: 'Como pedir um novo dataset, dashboard ou relatório?',
    answer: (
      <>
        Use{' '}
        <OpenContactTrigger className="inline font-semibold text-[#064E2C] underline-offset-2 hover:underline">
          Falar connosco
        </OpenContactTrigger>{' '}
        (topo ou botão flutuante) e indique o tema, fonte desejada e tipo de recurso. Recolha de
        dados sob encomenda, consultoria, formação e integração de dados em tempo real também
        estão disponíveis sob consulta, listados em{' '}
        <Link href="/servicos" className="font-semibold text-[#064E2C] hover:underline">
          Serviços
        </Link>
        .
      </>
    ),
  },
  {
    question: 'Como citar ou reutilizar os dados?',
    answer:
      'Consulte fonte, ano e licença nos metadados de cada dataset ou na ficha do relatório. Numa análise por IA, a mesma informação está no rodapé «Fontes e método» de cada resultado. Para reutilização comercial ou científica com dúvidas, contacte a equipa pelos canais oficiais do portal.',
  },
  {
    question: 'Não sei o nome exacto do dataset que preciso. Como o encontro?',
    answer: (
      <>
        Use a «Busca inteligente» nos catálogos de{' '}
        <Link href="/dados-espaciais" className="font-semibold text-[#064E2C] hover:underline">
          Dados Geoespaciais
        </Link>{' '}
        e{' '}
        <Link href="/dados-alfanumericos" className="font-semibold text-[#064E2C] hover:underline">
          Dados Alfanuméricos
        </Link>
        : descreva o que procura em linguagem normal (ex.: «acesso à água em Nampula») e o portal
        encontra datasets relevantes mesmo que o título não use as mesmas palavras, diferente da
        pesquisa por palavra-chave da barra principal.
      </>
    ),
  },
  {
    question: 'O que significa o selo «Fonte confirmada» num dataset?',
    answer:
      'Indica que um administrador do portal validou a proveniência daquele dataset junto da instituição de origem. A ausência do selo não significa que o dataset seja incorreto, só que essa validação extra ainda não foi feita: a fonte indicada nos metadados continua a ser a referência.',
  },
  {
    question: 'Há limite para quantas análises de IA posso fazer?',
    answer:
      'Sim: 10 análises por hora por conta, para manter o serviço disponível para todos os utilizadores. Se atingir o limite, o portal avisa quanto tempo falta até poder analisar de novo.',
  },
  {
    question: 'Posso incorporar uma análise ou dataset noutro site ou artigo?',
    answer:
      'Sim, para análises marcadas como públicas. Na página de uma análise, o botão «Incorporar» copia um código para colar directamente noutro site (ex.: um artigo de jornal), que mostra o gráfico ou mapa com atribuição automática ao Data Portal.',
  },
  {
    question: 'O que acontece aos meus dados pessoais e posso eliminá-los?',
    answer: (
      <>
        Os detalhes completos estão na{' '}
        <Link href="/politica-privacidade" className="font-semibold text-[#064E2C] hover:underline">
          Política de Privacidade
        </Link>
        . Em resumo: pode exportar ou eliminar os seus dados a qualquer momento a partir do seu{' '}
        <Link href="/perfil" className="font-semibold text-[#064E2C] hover:underline">
          Perfil
        </Link>
        . Pedir a eliminação da conta agenda a remoção definitiva para 30 dias depois, período em
        que pode cancelar o pedido caso mude de ideias.
      </>
    ),
  },
  {
    question: 'Posso pedir a análise por IA de um relatório?',
    answer: (
      <>
        Sim. Em qualquer{' '}
        <Link href="/relatorios" className="font-semibold text-[#064E2C] hover:underline">
          relatório
        </Link>{' '}
        com PDF, peça a análise: recebe um resumo com os principais pontos, cada um com a página
        onde se confirma, pode fazer perguntas directas ao documento, e o resultado é verificado
        contra os dados do próprio portal.
      </>
    ),
  },
  {
    question: 'O que é a página Ruas 360°?',
    answer: (
      <>
        Um visor de ruas em 360°, ao estilo do Street View, mas com imagens captadas pela própria
        equipa do Data Portal. Permite andar pelas ruas de Maputo e de Chimoio imagem a imagem, ver
        os sinais de trânsito detectados e filtrar por data, tipo de imagem ou quem captou. Não
        precisa de conta. Aceda em{' '}
        <Link href="/ruas-360" className="font-semibold text-[#064E2C] hover:underline">
          Ruas 360°
        </Link>
        , no menu do topo.
      </>
    ),
  },
  {
    question: 'Posso escolher se quero receber emails do portal?',
    answer: (
      <>
        Sim. No primeiro login aparece um popup a perguntar se quer receber, por email, o aviso de
        novo dataset, relatório ou dashboard publicado; enquanto não responder, esses emails não são
        enviados. Pode mudar de ideias a qualquer momento na secção «Notificações por email» do seu{' '}
        <Link href="/perfil" className="font-semibold text-[#064E2C] hover:underline">
          Perfil
        </Link>
        .
      </>
    ),
  },
  {
    question: 'As perguntas que faço à análise por IA são partilhadas com alguém?',
    answer: (
      <>
        A pergunta e os dados dos datasets seleccionados são processados, no momento da análise,
        pelo fornecedor do modelo de Inteligência Artificial, exclusivamente pelo servidor do
        portal, nunca a partir do seu navegador. Nunca são enviadas palavras-passe nem dados de
        pagamento (que o portal, de resto, não recolhe). Mais detalhes na{' '}
        <Link href="/politica-privacidade" className="font-semibold text-[#064E2C] hover:underline">
          Política de Privacidade
        </Link>
        .
      </>
    ),
  },
]

const POR_PAGINA = 2

function FaqItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: { question: string; answer: ReactNode }
  index: number
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div
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
        onClick={onToggle}
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
}

export function FAQSection() {
  // Só 2 perguntas no ecrã de cada vez, para poupar espaço — mas todas as 14+ continuam a uma
  // navegação de distância (Anterior/Seguinte ou clicar num ponto), nunca escondidas de vez.
  // A troca de página remonta o bloco (a `key` muda), o que reinicia a animação CSS de entrada
  // (`faq-page-enter` em globals.css) sem precisar de nenhuma biblioteca de animação nova.
  const totalPaginas = Math.ceil(FAQ_ITEMS.length / POR_PAGINA)
  const [pagina, setPagina] = useState(0)
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const inicio = pagina * POR_PAGINA
  const itensDaPagina = FAQ_ITEMS.slice(inicio, inicio + POR_PAGINA)

  function irPara(novaPagina: number) {
    const alvo = Math.max(0, Math.min(totalPaginas - 1, novaPagina))
    setPagina(alvo)
    setOpenIndex(alvo * POR_PAGINA)
  }

  return (
    <section
      id="faq"
      className="font-body-stack py-9 md:py-12 bg-white relative overflow-hidden border-t border-[#E2E8E5]"
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
            Catálogos, dashboards, mapas analíticos, relatórios, análise por IA, privacidade e
            segurança dos seus dados. Ainda precisa de ajuda? Use o botão Falar connosco no topo ou
            o botão flutuante.
          </p>
        </div>

        <div className="max-w-3xl">
          <div key={pagina} className="faq-page-enter flex flex-col gap-3">
            {itensDaPagina.map((item, i) => {
              const index = inicio + i
              return (
                <FaqItem
                  key={item.question}
                  item={item}
                  index={index}
                  isOpen={openIndex === index}
                  onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                />
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-2 sm:gap-4 mt-6">
            <button
              type="button"
              onClick={() => irPara(pagina - 1)}
              disabled={pagina === 0}
              aria-label="Página anterior"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#CFE3D6] bg-white px-2.5 sm:px-4 py-2 text-[13px] font-bold text-[#064E2C] hover:bg-[#F1F8F4] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            {/*
              Mobile-first: com 9 páginas (18 perguntas / 2 por página), os pontos + os dois botões
              nunca cabem numa só linha num ecrã de 375px com o texto todo — o botão "Seguinte"
              saía do ecrã. `overflow-x-auto` é a rede de segurança para qualquer contagem de
              páginas futura; os pontos mais pequenos e sem gap a mais já evitam precisar dela na
              prática.
            */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar px-1">
              {Array.from({ length: totalPaginas }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => irPara(i)}
                  aria-label={`Ir para perguntas ${i * POR_PAGINA + 1}-${Math.min((i + 1) * POR_PAGINA, FAQ_ITEMS.length)}`}
                  aria-current={pagina === i}
                  className={`h-2 sm:h-2.5 rounded-full shrink-0 transition-all duration-300 ${
                    pagina === i ? 'w-5 sm:w-6 bg-[#064E2C]' : 'w-2 sm:w-2.5 bg-[#CFE3D6] hover:bg-[#9FC7AC]'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => irPara(pagina + 1)}
              disabled={pagina === totalPaginas - 1}
              aria-label="Página seguinte"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#CFE3D6] bg-white px-2.5 sm:px-4 py-2 text-[13px] font-bold text-[#064E2C] hover:bg-[#F1F8F4] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors shrink-0"
            >
              <span className="hidden sm:inline">Seguinte</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-3">
            Pergunta {inicio + 1}–{Math.min(inicio + POR_PAGINA, FAQ_ITEMS.length)} de {FAQ_ITEMS.length}
          </p>
        </div>
      </div>
    </section>
  )
}
