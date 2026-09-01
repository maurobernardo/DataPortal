import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { obterAnalise } from '@/lib/analysis/persistencia'
import { carregarDatasetsInfo, carregarGeojsonPorNivel } from '@/lib/analysis/apresentacao'
import { DashboardApresentacao } from '@/components/analise/DashboardApresentacao'
import { gerarPerguntasViaveis } from '@/lib/analysis/perguntas-viaveis'
import { obterTraducao } from '@/lib/analysis/persistencia'
import '@/app/geo-catalog.css'
import '@/app/ai-insights.css'

export const dynamic = 'force-dynamic'

export default async function PaginaDashboardAnalise({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { de?: string }
}) {
  // A origem chega aqui pela ligação da página de detalhe, que por sua vez a recebeu da lista.
  const veioDaLista = searchParams?.de === 'lista'
  const sessao = await getCurrentUser()
  if (!sessao) redirect(`/login?next=/analise/${params.id}/dashboard`)

  const analise = await obterAnalise(params.id)
  if (!analise) notFound()

  if (!analise.publico && analise.utilizador_id !== sessao.userId) {
    redirect('/analise/nova')
  }

  // Sem narrativa resolvida não há dashboard para mostrar: a página de detalhe já explica porquê.
  if (analise.estado === 'erro' || !analise.narrativa?.resolvida) {
    redirect(`/analise/${params.id}`)
  }

  const n = analise.narrativa.resolvida
  const series = analise.resultados?.series || []
  const graficos = analise.resultados?.graficos || []
  const destaques = analise.resultados?.destaques || []
  const camadasBrutas = analise.resultados?.camadasBrutas || []
  const qualidade = analise.resultados?.qualidade || []
  const listas = analise.resultados?.listas || []
  const multiplos = analise.resultados?.multiplos || []
  const achados = analise.achados || []
  // Fase 6 (explicabilidade): a proveniência de cada {{calc:id}} já existia para auditoria interna
  // (Parte 5.1) — passar para o dashboard é o que permite o "porquê confio nisto" por número.
  const calcs = analise.resultados?.calcs || {}
  const codigoExecutado = analise.resultados?.codigoExecutado || []

  const [datasetsInfo, geojsonPorNivel, perguntasViaveis, traducao] = await Promise.all([
    carregarDatasetsInfo(analise.datasets_ids || [], camadasBrutas),
    // Os múltiplos pequenos também precisam de geometria, e podem estar num nível que nenhuma
    // série usa: sem os incluir aqui, a figura ficava sem desenho e desaparecia em silêncio.
    carregarGeojsonPorNivel([
      ...series,
      ...multiplos.map((m: any) => ({
        nivel: m.nivel,
        unidades: (m.periodos || []).flatMap((p: any) => p.unidades || []),
      })),
    ]),
    // Mesmas perguntas verificadas que o motor oferece quando recusa uma analise: cada uma foi
    // confrontada com as colunas, os metodos e a cobertura reais destes datasets. O gerador por
    // modelo, que so conhece o titulo do ficheiro, fica como recurso dentro do componente.
    gerarPerguntasViaveis(analise.datasets_ids || [], undefined, analise.pergunta).catch(() => []),
    // Se a versão inglesa já foi pedida alguma vez, chega com a página: sem isto, a primeira troca
    // de idioma parecia lenta mesmo quando a tradução já estava guardada.
    obterTraducao(params.id).catch(() => null),
  ])

  return (
    <DashboardApresentacao
      analiseId={params.id}
      voltarHref={veioDaLista ? `/analise/${params.id}?de=lista` : '/analise/nova'}
      voltarRotulo={veioDaLista ? 'Voltar à análise' : 'Nova análise'}
      pergunta={analise.pergunta}
      narrativa={n}
      achados={achados}
      series={series}
      graficos={graficos}
      destaques={destaques}
      camadasBrutas={camadasBrutas}
      listas={listas}
      multiplos={multiplos}
      utilizadorId={sessao.userId}
      traducaoInicial={traducao}
      ehDono={analise.utilizador_id === sessao.userId}
      qualidade={qualidade}
      calcs={calcs}
      codigoExecutado={codigoExecutado}
      datasetsInfo={datasetsInfo}
      perguntasViaveis={perguntasViaveis.map((p) => p.pergunta)}
      geojsonPorNivel={geojsonPorNivel}
      criadoEm={analise.criado_em}
      guardadoInicial={analise.guardado}
      publicoInicial={analise.publico}
    />
  )
}
