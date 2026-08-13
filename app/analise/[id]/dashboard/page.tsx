import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { obterAnalise } from '@/lib/analysis/persistencia'
import { carregarDatasetsInfo, carregarGeojsonPorNivel } from '@/lib/analysis/apresentacao'
import { DashboardApresentacao } from '@/components/analise/DashboardApresentacao'
import '@/app/geo-catalog.css'

export const dynamic = 'force-dynamic'

export default async function PaginaDashboardAnalise({ params }: { params: { id: string } }) {
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
  const achados = analise.achados || []
  // Fase 6 (explicabilidade): a proveniência de cada {{calc:id}} já existia para auditoria interna
  // (Parte 5.1) — passar para o dashboard é o que permite o "porquê confio nisto" por número.
  const calcs = analise.resultados?.calcs || {}
  const codigoExecutado = analise.resultados?.codigoExecutado || []

  const [datasetsInfo, geojsonPorNivel] = await Promise.all([
    carregarDatasetsInfo(analise.datasets_ids || [], camadasBrutas),
    carregarGeojsonPorNivel(series),
  ])

  return (
    <DashboardApresentacao
      analiseId={params.id}
      pergunta={analise.pergunta}
      narrativa={n}
      achados={achados}
      series={series}
      graficos={graficos}
      destaques={destaques}
      camadasBrutas={camadasBrutas}
      qualidade={qualidade}
      calcs={calcs}
      codigoExecutado={codigoExecutado}
      datasetsInfo={datasetsInfo}
      geojsonPorNivel={geojsonPorNivel}
      criadoEm={analise.criado_em}
      guardadoInicial={analise.guardado}
      publicoInicial={analise.publico}
    />
  )
}
