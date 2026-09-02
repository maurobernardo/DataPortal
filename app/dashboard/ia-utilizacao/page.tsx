import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Brain, Database, DollarSign, ListTree, MessageSquareText, Users } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth'
import { getAiInsightUsageSummary } from '@/lib/db'
import { resumoFalhasRecentes } from '@/lib/analysis/falhas'
import { logger } from '@/lib/logger'
import { AdminSidebar } from '@/components/AdminSidebar'
import { DashboardHeader } from '@/components/DashboardHeader'

export const dynamic = 'force-dynamic'

const ROTULO_TIPO_ERRO: Record<string, string> = {
  truncagem_tokens: 'Resposta cortada pelo limite de tokens',
  json_invalido: 'Resposta do modelo mal formada',
  api_indisponivel: 'API de IA indisponível/sobrecarregada',
  dados_ilegiveis: 'Datasets seleccionados ilegíveis',
  sem_resultados: 'Nenhum passo produziu resultado',
  desconhecido: 'Outro',
}

export default async function AiUsagePage() {
  const user = await getCurrentUserProfile()

  if (!user) {
    redirect('/login?next=/dashboard/ia-utilizacao')
  }
  if (user.role !== 'admin') {
    redirect('/')
  }

  // A página inteira não pode ficar em branco ("Application error") só porque um dado antigo e
  // imprevisível (ex.: JSON malformado nalguma linha) faz uma das consultas falhar — mostra a
  // página com os painéis vazios em vez de nada, e regista o erro para investigar depois.
  const { totals, byUser, recent, tendencias } = await getAiInsightUsageSummary().catch(
    (error): Awaited<ReturnType<typeof getAiInsightUsageSummary>> => {
      logger.error('erro_carregar_utilizacao_ia', { error })
      return {
        totals: { todayQueries: 0, totalQueries: 0, totalUsers: 0 },
        byUser: [],
        recent: [],
        tendencias: { porArquetipo: [], porCategoriaDataset: [], porDataset: [] },
      }
    }
  )
  const maxArquetipo = Math.max(1, ...tendencias.porArquetipo.map((a) => a.total))
  const maxCategoria = Math.max(1, ...tendencias.porCategoriaDataset.map((c) => c.total))
  // PLANO-MOTOR-FINAL.md, secção 6: painel de falhas, não escondido em logs — a base para
  // priorizar que tipo de pergunta continua a falhar mais, sem depender de alguém reportar.
  const falhas = await resumoFalhasRecentes(30).catch(() => [])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:block">
        <AdminSidebar user={user} />
      </div>

      <div className="flex-1 min-w-0 md:ml-64">
        <DashboardHeader user={user} />

        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="w-6 h-6 text-green-600" />
                Utilização do AI Insights
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Consultas de IA por utilizador. Sem limite diário activo neste momento.
              </p>
            </div>

            <Link
              href="/admin/custos-ia"
              className="flex items-center justify-between gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-green-200 hover:bg-green-50/40 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold text-gray-800">
                <DollarSign className="w-4.5 h-4.5 text-green-600" />
                Quanto isto custa a sério, em dólares e tokens: ver Custos de IA
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Consultas hoje
                </p>
                <p className="text-3xl font-bold text-gray-900">{totals.todayQueries}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Consultas totais
                </p>
                <p className="text-3xl font-bold text-gray-900">{totals.totalQueries}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Utilizadores activos
                </p>
                <p className="text-3xl font-bold text-gray-900">{totals.totalUsers}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-bold text-gray-900">Utilização por utilizador</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm pd-responsive-table">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-5 py-2.5">Utilizador</th>
                      <th className="px-5 py-2.5">Hoje</th>
                      <th className="px-5 py-2.5">Total</th>
                      <th className="px-5 py-2.5">Última consulta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byUser.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                          Ainda não há consultas registadas.
                        </td>
                      </tr>
                    ) : (
                      byUser.map((row: any) => (
                        <tr key={row.userId} className="border-b border-gray-50 last:border-0">
                          <td data-label="Utilizador" className="px-5 py-3">
                            <p className="font-semibold text-gray-800">{row.name || row.email}</p>
                            <p className="text-xs text-gray-400">{row.email}</p>
                          </td>
                          <td data-label="Hoje" className="px-5 py-3">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-600">
                              {row.todayQueries}
                            </span>
                          </td>
                          <td data-label="Total" className="px-5 py-3 text-gray-700">{row.totalQueries}</td>
                          <td data-label="Última consulta" className="px-5 py-3 text-gray-500 text-xs">
                            {row.lastQueryAt ? new Date(row.lastQueryAt).toLocaleString('pt-PT') : 'N/D'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Categorização robusta em vez de texto literal repetido: tipo de pergunta
                (arquétipo, já classificado pelo motor em cada análise) e categoria de dataset
                analisado — é isto que diz que tipo de dado vale a pena produzir mais, não uma
                tabela de perguntas iguais que fica quase sempre vazia. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <ListTree className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-bold text-gray-900">Tipo de pergunta mais feita</h2>
                </div>
                <div className="p-5 space-y-2.5">
                  {tendencias.porArquetipo.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Ainda não há análises suficientes.</p>
                  ) : (
                    tendencias.porArquetipo.map((a) => (
                      <div key={a.arquetipo} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <span className="text-[13px] text-gray-700 sm:w-36 sm:shrink-0 sm:truncate">{a.rotulo}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-600"
                              style={{ width: `${Math.max(2, (a.total / maxArquetipo) * 100)}%` }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right text-[12px] font-bold text-gray-800 tabular-nums">
                            {a.total}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Database className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-bold text-gray-900">Categoria de dataset mais analisada</h2>
                </div>
                <div className="p-5 space-y-2.5">
                  {tendencias.porCategoriaDataset.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Ainda não há análises suficientes.</p>
                  ) : (
                    tendencias.porCategoriaDataset.map((c) => (
                      <div key={c.categoria} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <span className="text-[13px] text-gray-700 sm:w-36 sm:shrink-0 sm:truncate">{c.categoria}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#064E2C]"
                              style={{ width: `${Math.max(2, (c.total / maxCategoria) * 100)}%` }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right text-[12px] font-bold text-gray-800 tabular-nums">
                            {c.total}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-bold text-gray-900">Datasets mais analisados</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm pd-responsive-table">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-5 py-2.5">Dataset</th>
                      <th className="px-5 py-2.5">Categoria</th>
                      <th className="px-5 py-2.5">Análises</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tendencias.porDataset.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-gray-400">
                          Ainda não há análises suficientes.
                        </td>
                      </tr>
                    ) : (
                      tendencias.porDataset.map((d) => (
                        <tr key={d.datasetId} className="border-b border-gray-50 last:border-0">
                          <td data-label="Dataset" className="px-5 py-3 text-gray-800 max-w-md truncate" title={d.titulo}>
                            {d.titulo}
                          </td>
                          <td data-label="Categoria" className="px-5 py-3 text-gray-500 text-xs">{d.categoria}</td>
                          <td data-label="Análises" className="px-5 py-3">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold bg-green-50 text-green-700">
                              {d.total}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-gray-900">Falhas da análise por IA (últimos 30 dias)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm pd-responsive-table">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-5 py-2.5">Tipo de falha</th>
                      <th className="px-5 py-2.5">Etapa</th>
                      <th className="px-5 py-2.5">Ocorrências</th>
                      <th className="px-5 py-2.5">Última vez</th>
                    </tr>
                  </thead>
                  <tbody>
                    {falhas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                          Sem falhas registadas nos últimos 30 dias.
                        </td>
                      </tr>
                    ) : (
                      falhas.map((f) => (
                        <tr key={`${f.tipo_erro}-${f.etapa}`} className="border-b border-gray-50 last:border-0">
                          <td data-label="Tipo de falha" className="px-5 py-3 text-gray-800">
                            {ROTULO_TIPO_ERRO[f.tipo_erro] || f.tipo_erro}
                          </td>
                          <td data-label="Etapa" className="px-5 py-3 text-gray-500 text-xs">{f.etapa || 'N/D'}</td>
                          <td data-label="Ocorrências" className="px-5 py-3">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold bg-amber-50 text-amber-700">
                              {f.total}
                            </span>
                          </td>
                          <td data-label="Última vez" className="px-5 py-3 text-gray-500 text-xs">
                            {new Date(f.ultima_ocorrencia).toLocaleString('pt-PT')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <MessageSquareText className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-bold text-gray-900">Consultas recentes</h2>
              </div>
              <ul className="divide-y divide-gray-50">
                {recent.length === 0 ? (
                  <li className="px-5 py-8 text-center text-gray-400 text-sm">Nenhuma consulta ainda.</li>
                ) : (
                  recent.map((q: any) => (
                    <li key={q.id} className="px-5 py-3 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">"{q.question}"</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {q.name || q.email} · {new Date(q.createdAt).toLocaleString('pt-PT')}
                        </p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
