import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldAlert, GitCompareArrows, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth'
import { listarTodasContradicoes } from '@/lib/qualidade/persistencia'
import { listarTodasAnomalias } from '@/lib/qualidade/persistencia-anomalias'
import { AdminSidebar } from '@/components/AdminSidebar'
import { DashboardHeader } from '@/components/DashboardHeader'

export const dynamic = 'force-dynamic'

function formatarNumero(n: number): string {
  return n.toLocaleString('pt-PT', { maximumFractionDigits: 2 })
}

/**
 * Tudo o que a detecção automática de qualidade encontrou no catálogo (ver
 * lib/qualidade/detectar-contradicoes.ts e lib/qualidade/detectar-anomalias.ts), reunido numa
 * página só de administração.
 *
 * Isto NUNCA aparece na página pública de um dataset, para nenhum utilizador, nem para quem tem
 * sessão de administrador: um falso positivo lido ali, fora de contexto, lê-se como "o portal tem
 * dados errados". Aqui, com a ferramenta toda à vista e a explicação ao lado, é trabalho de
 * revisão, não uma alegação ao público.
 */
export default async function QualidadeDadosPage() {
  const user = await getCurrentUserProfile()
  if (!user) redirect('/login?next=/admin/qualidade-dados')
  if (user.role !== 'admin') redirect('/')

  const [contradicoes, anomalias] = await Promise.all([
    listarTodasContradicoes(300),
    listarTodasAnomalias(300),
  ])

  const divergentes = contradicoes.filter((c) => c.estado === 'diverge')
  const confirmadas = contradicoes.filter((c) => c.estado === 'confirma')

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
                <ShieldAlert className="w-6 h-6 text-green-600" />
                Qualidade dos Dados
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Comparações e anomalias encontradas sozinhas pelo portal, sem intervenção de
                ninguém: divergências entre dois datasets que deviam bater certo, e valores que
                destoam do resto do próprio dataset. Ferramenta de trabalho da equipa, nunca
                mostrada a quem consulta o catálogo.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Divergências entre datasets
                </p>
                <p className="text-3xl font-bold text-amber-600">{divergentes.length}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Confirmações entre datasets
                </p>
                <p className="text-3xl font-bold text-green-600">{confirmadas.length}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Pontos a rever
                </p>
                <p className="text-3xl font-bold text-amber-600">{anomalias.length}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Total de registos
                </p>
                <p className="text-3xl font-bold text-gray-900">{contradicoes.length + anomalias.length}</p>
              </div>
            </div>

            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
                <GitCompareArrows className="w-4.5 h-4.5 text-green-600" />
                Cruzamento entre datasets
              </h2>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto max-h-[36rem] overflow-y-auto">
                  <table className="w-full text-sm pd-responsive-table">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 sticky top-0 bg-white">
                        <th className="px-5 py-2.5">Estado</th>
                        <th className="px-5 py-2.5">Geografia</th>
                        <th className="px-5 py-2.5">Coluna</th>
                        <th className="px-5 py-2.5 text-right">Valor</th>
                        <th className="px-5 py-2.5">Dataset A</th>
                        <th className="px-5 py-2.5 text-right">Valor</th>
                        <th className="px-5 py-2.5">Dataset B</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contradicoes.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                            Ainda não há comparações registadas. O lote periódico
                            (/api/cron/contradicoes) ainda não correu, ou nenhum par de datasets
                            partilha uma métrica comparável.
                          </td>
                        </tr>
                      ) : (
                        contradicoes.map((c, i) => (
                          <tr key={i} className="border-b border-gray-50 last:border-0 align-top">
                            <td className="px-5 py-3">
                              {c.estado === 'diverge' ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                                  <AlertCircle className="w-3.5 h-3.5" /> Diverge
                                  {c.diferencaRelativaPct !== null ? ` ${c.diferencaRelativaPct.toFixed(1)}%` : ''}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirma
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-gray-700">
                              {c.geografia}
                              {c.periodo ? ` (${c.periodo})` : ''}
                            </td>
                            <td className="px-5 py-3 text-gray-500">{c.colunaA}</td>
                            <td className="px-5 py-3 text-right tabular-nums text-gray-800">{formatarNumero(c.valorA)}</td>
                            <td className="px-5 py-3 max-w-[12rem] truncate">
                              <Link href={`/dataset/${c.datasetAId}`} className="text-green-700 hover:underline" title={c.datasetATitulo}>
                                {c.datasetATitulo}
                              </Link>
                            </td>
                            <td className="px-5 py-3 text-right tabular-nums text-gray-800">{formatarNumero(c.valorB)}</td>
                            <td className="px-5 py-3 max-w-[12rem] truncate">
                              <Link href={`/dataset/${c.datasetBId}`} className="text-green-700 hover:underline" title={c.datasetBTitulo}>
                                {c.datasetBTitulo}
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
                <AlertCircle className="w-4.5 h-4.5 text-green-600" />
                Pontos a rever dentro de cada dataset
              </h2>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto max-h-[36rem] overflow-y-auto">
                  <table className="w-full text-sm pd-responsive-table">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 sticky top-0 bg-white">
                        <th className="px-5 py-2.5">Dataset</th>
                        <th className="px-5 py-2.5">Coluna</th>
                        <th className="px-5 py-2.5">Geografia</th>
                        <th className="px-5 py-2.5">Detalhe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anomalias.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                            Ainda não há anomalias registadas. O lote periódico
                            (/api/cron/anomalias) ainda não correu sobre este dataset.
                          </td>
                        </tr>
                      ) : (
                        anomalias.map((a, i) => (
                          <tr key={i} className="border-b border-gray-50 last:border-0 align-top">
                            <td className="px-5 py-3 max-w-[12rem] truncate">
                              <Link href={`/dataset/${a.datasetId}`} className="text-green-700 hover:underline" title={a.datasetTitulo}>
                                {a.datasetTitulo}
                              </Link>
                            </td>
                            <td className="px-5 py-3 text-gray-500">{a.coluna}</td>
                            <td className="px-5 py-3 text-gray-700">
                              {a.geografia}
                              {a.periodo ? ` (${a.periodo})` : ''}
                            </td>
                            <td className="px-5 py-3 text-gray-700">{a.detalhe}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Nenhuma destas comparações usa Inteligência Artificial: são estatística e
              correspondência de texto simples, sem custo de tokens. Divergência não significa
              erro, pode ser uma metodologia diferente entre fontes. Quem decide é sempre uma
              pessoa da equipa.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
