'use client'

import { useState } from 'react'
import {
  Search,
  Database,
  MapPinned,
  BarChart3,
  MousePointerClick,
  Filter,
  LayoutDashboard,
  Share2,
  type LucideIcon,
} from 'lucide-react'

type Passo = { titulo: string; texto: string }

type Topico = {
  id: string
  icon: LucideIcon
  titulo: string
  resumo: string
  passos: Passo[]
}

const TOPICOS: Topico[] = [
  {
    id: 'primeira-analise',
    icon: Search,
    titulo: 'Como fazer a sua primeira análise',
    resumo: 'Do zero até ao primeiro gráfico, em poucos passos.',
    passos: [
      {
        titulo: '1. Escolha até 3 datasets',
        texto:
          'Na página de AI Insights, seleccione um ou mais datasets do catálogo (geoespaciais, alfanuméricos, ou uma combinação dos dois). Não precisa de saber à partida qual usar: pode começar por um só e ir ajustando.',
      },
      {
        titulo: '2. Escreva a pergunta em português ou em inglês',
        texto:
          'Escreva como perguntaria a um colega, por exemplo "quais as províncias com mais produção de milho em 2023" ou "compare o número de escolas entre Nampula e Sofala". Funciona tanto em português como em inglês, sem nenhuma sintaxe especial.',
      },
      {
        titulo: '3. Aguarde o resultado',
        texto:
          'Uma análise completa pode levar entre 30 segundos e alguns minutos, dependendo da complexidade da pergunta. Pode sair da página e voltar mais tarde: a análise continua a correr e fica guardada.',
      },
      {
        titulo: '4. Leia o resumo, o gráfico e o mapa',
        texto:
          'O resultado inclui um resumo em texto, um ou mais gráficos e, quando fizer sentido, um mapa. Cada afirmação vem acompanhada da fonte e do ano do dataset usado, para poder confirmar de onde veio o número.',
      },
    ],
  },
  {
    id: 'mapa-comparar-filtrar',
    icon: MapPinned,
    titulo: 'Como comparar e filtrar no mapa',
    resumo: 'Comparar duas unidades administrativas e isolar só o que interessa.',
    passos: [
      {
        titulo: 'Comparar duas unidades',
        texto:
          'Quando a pergunta envolve comparação (por exemplo, entre duas províncias ou dois distritos), o resultado mostra uma tabela lado a lado com as diferenças, além dos dois mapas ou gráficos correspondentes.',
      },
      {
        titulo: 'Destacar uma unidade a partir de um KPI',
        texto:
          'Ao clicar num cartão de KPI ou numa barra do gráfico com o nome de uma unidade (por exemplo, um distrito), essa unidade fica destacada automaticamente tanto no mapa como nos outros gráficos da mesma análise.',
      },
      {
        titulo: 'Ver só o que está destacado',
        texto:
          'Depois de destacar uma unidade, existe a opção de mostrar apenas essa unidade no mapa, escondendo o resto, para focar a análise sem distracção visual.',
      },
      {
        titulo: 'Zoom automático',
        texto:
          'Ao seleccionar ou destacar uma unidade, o mapa ajusta o zoom automaticamente para a enquadrar, seja ela um ponto, uma linha ou uma área.',
      },
    ],
  },
  {
    id: 'kpis',
    icon: BarChart3,
    titulo: 'Como ler e usar os KPIs',
    resumo: 'O que cada número no topo da análise está a dizer.',
    passos: [
      {
        titulo: 'O que é um KPI aqui',
        texto:
          'Cada cartão de KPI mostra um número-chave calculado directamente a partir dos dados seleccionados, por exemplo um total, uma média ou o valor mais alto/mais baixo encontrado.',
      },
      {
        titulo: 'Clicar num KPI cruza com o resto da análise',
        texto:
          'Se o KPI se referir a uma unidade administrativa específica, clicar nele destaca essa mesma unidade no mapa e nos gráficos ao lado, sem ter de procurar manualmente onde ela está.',
      },
    ],
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    titulo: 'Como encontrar as suas análises depois',
    resumo: 'Toda análise fica guardada, mesmo que feche a página.',
    passos: [
      {
        titulo: 'Guardar é automático',
        texto:
          'Não é preciso carregar em nenhum botão de "guardar": assim que a análise termina, ela já está gravada na sua conta.',
      },
      {
        titulo: 'Onde encontrar',
        texto:
          'No seu Dashboard, na secção "Minhas análises", encontra a lista de todas as análises que já fez, com data e a pergunta original, para voltar a abrir sempre que precisar.',
      },
      {
        titulo: 'Pode navegar livremente',
        texto:
          'Pode sair da análise para ver outras páginas do portal (datasets, mapas, relatórios) e voltar depois: nada se perde.',
      },
    ],
  },
  {
    id: 'exportar',
    icon: Share2,
    titulo: 'Como exportar e partilhar',
    resumo: 'Levar o resultado para fora do portal.',
    passos: [
      {
        titulo: 'Exportar ficheiros',
        texto: 'Cada gráfico e mapa pode ser exportado directamente em PDF, PNG ou SVG, prontos para usar numa apresentação ou relatório.',
      },
      {
        titulo: 'Partilhar por link',
        texto: 'Cada análise tem um link próprio que pode ser enviado a outra pessoa, para que veja exactamente o mesmo resultado sem ter de repetir a pergunta.',
      },
    ],
  },
]

export function AIHowToGuide() {
  const [aberto, setAberto] = useState<string | null>(TOPICOS[0].id)

  return (
    <section className="font-body-stack relative z-10 py-9 md:py-12 bg-[#F7FAF8] border-b border-[#E2E8E5]">
      <div className="ai-section-inner">
        <div className="max-w-3xl mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[#CFE3D6] px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#064E2C]" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C]">
              Guia completo de utilização
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-[1.15] mb-4 tracking-tight">
            Nunca usou o AI Insights? Comece por aqui.
          </h2>
          <p className="text-[15px] md:text-[17px] text-gray-600 leading-relaxed">
            Um guia passo a passo de tudo o que pode fazer dentro do portal: desde a primeira pergunta
            até comparar, filtrar e guardar as suas análises no dashboard. Não é preciso experiência
            nenhuma com dados para seguir.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-8">
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {TOPICOS.map((t) => {
              const Icon = t.icon
              const activo = aberto === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setAberto(t.id)}
                  className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl border shrink-0 lg:shrink transition-colors ${
                    activo
                      ? 'bg-[#064E2C] border-[#064E2C] text-white'
                      : 'bg-white border-[#E2E8E5] text-gray-700 hover:border-[#CFE3D6]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${activo ? 'text-white' : 'text-[#064E2C]'}`} />
                  <span className="text-[13px] font-semibold whitespace-nowrap lg:whitespace-normal">
                    {t.titulo}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="space-y-3">
            {TOPICOS.filter((t) => t.id === aberto).map((t) => (
              <div key={t.id} className="rounded-2xl border border-[#E2E8E5] bg-white p-6 md:p-8">
                <p className="text-[13px] text-gray-500 mb-5">{t.resumo}</p>
                <div className="space-y-5">
                  {t.passos.map((p) => (
                    <div key={p.titulo}>
                      <h3 className="text-[15px] font-bold text-gray-900 mb-1.5">{p.titulo}</h3>
                      <p className="text-[14px] text-gray-600 leading-relaxed">{p.texto}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 flex items-start gap-2 text-[13px] text-gray-500">
          <MousePointerClick className="w-4 h-4 mt-0.5 shrink-0 text-[#064E2C]" />
          Sugestão: comece com uma pergunta simples sobre um único dataset. Depois de ver como o
          resultado se comporta, experimente combinar datasets e comparar unidades administrativas.
        </p>
        <p className="mt-2 flex items-start gap-2 text-[13px] text-gray-500">
          <Filter className="w-4 h-4 mt-0.5 shrink-0 text-[#064E2C]" />
          Se um resultado não incluir algo que esperava, use as perguntas sugeridas no fim da
          análise ou comece uma nova análise com os mesmos datasets e uma pergunta mais específica,
          por exemplo "mostra só a província de Gaza em 2023".
        </p>
        <p className="mt-2 flex items-start gap-2 text-[13px] text-gray-500">
          <Database className="w-4 h-4 mt-0.5 shrink-0 text-[#064E2C]" />
          Todas as respostas citam o dataset, a fonte e o ano usados: se precisar de confirmar um
          número, esse é o primeiro lugar a verificar.
        </p>
      </div>
    </section>
  )
}
