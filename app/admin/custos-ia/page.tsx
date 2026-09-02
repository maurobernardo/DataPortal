import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DollarSign, Sparkles, FileSearch, Coins, Users, Clock } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth'
import { obterEstatisticasCustoAnalises } from '@/lib/analysis/persistencia'
import { obterEstatisticasCustoRelatorios } from '@/lib/relatorios/persistencia'
import { AdminSidebar } from '@/components/AdminSidebar'
import { DashboardHeader } from '@/components/DashboardHeader'

export const dynamic = 'force-dynamic'

const ROTULO_TIPO: Record<string, string> = {
  digesto: 'Resumo do relatório',
  perguntar: 'Pergunta ao relatório',
  traducao: 'Tradução do resumo',
}

const PERIODOS = [
  { id: 'dia', rotulo: 'Diário', dias: 1 },
  { id: 'semana', rotulo: 'Semanal', dias: 7 },
  { id: 'mes', rotulo: 'Mensal', dias: 30 },
  { id: 'trimestre', rotulo: 'Trimestral', dias: 90 },
  { id: 'semestre', rotulo: 'Semestral', dias: 182 },
  { id: 'ano', rotulo: 'Anual', dias: 365 },
  { id: 'tudo', rotulo: 'Tudo', dias: null },
] as const

type PeriodoId = (typeof PERIODOS)[number]['id']

function calcularDesde(periodo: PeriodoId): Date | null {
  const cfg = PERIODOS.find((p) => p.id === periodo)
  if (!cfg || cfg.dias == null) return null
  const data = new Date()
  data.setDate(data.getDate() - cfg.dias)
  return data
}

/** 4 casas decimais para valores pequenos (cêntimos de dólar por chamada), 2 para totais maiores;
 *  um total de $312.50 com 4 casas ($312.5000) só acrescenta ruído visual. */
function formatarUsd(valor: number): string {
  return `$${valor.toLocaleString('en-US', {
    minimumFractionDigits: valor < 1 ? 4 : 2,
    maximumFractionDigits: valor < 1 ? 4 : 2,
  })}`
}

function formatarTokens(valor: number): string {
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(2)}M`
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(1)}k`
  return String(valor)
}

export default async function CustosIaPage({
  searchParams,
}: {
  searchParams?: { periodo?: string }
}) {
  const user = await getCurrentUserProfile()
  if (!user) redirect('/login?next=/admin/custos-ia')
  if (user.role !== 'admin') redirect('/')

  const periodoActivo: PeriodoId = PERIODOS.some((p) => p.id === searchParams?.periodo)
    ? (searchParams!.periodo as PeriodoId)
    : 'tudo'
  const desde = calcularDesde(periodoActivo)

  const [analises, relatorios] = await Promise.all([
    obterEstatisticasCustoAnalises(desde),
    obterEstatisticasCustoRelatorios(desde),
  ])

  const custoTotalGeral = analises.totais.custoTotalUsd + relatorios.totais.custoTotalUsd
  const tokensTotais =
    analises.totais.tokensEntrada + analises.totais.tokensSaida + relatorios.totais.tokensEntrada + relatorios.totais.tokensSaida

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
                <DollarSign className="w-6 h-6 text-green-600" />
                Custos de IA
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Quanto cada análise de dados e cada acção sobre um relatório gasta em tokens da
                Anthropic: a base para decidir como e quanto cobrar por estes serviços. Só cobre a
                análise de dados (/analise/nova) e a análise de relatórios (PDFs); não inclui o
                chatbot de ajuda nem outras ferramentas de suporte internas.
              </p>
            </div>

            {/* Filtro de período: recarrega a página com ?periodo=X, tudo já calculado no
                servidor com a data certa, sem precisar de JavaScript nenhum no cliente. */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100 w-fit">
              {PERIODOS.map((p) => (
                <Link
                  key={p.id}
                  href={p.id === 'tudo' ? '/admin/custos-ia' : `/admin/custos-ia?periodo=${p.id}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    periodoActivo === p.id ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p.rotulo}
                </Link>
              ))}
            </div>

            {/* Totais do período seleccionado acima: a primeira coisa que responde "quanto está
                isto a custar", já filtrada por diário/semanal/mensal/etc. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Custo total no período
                </p>
                <p className="text-3xl font-bold text-gray-900">{formatarUsd(custoTotalGeral)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Tokens no período
                </p>
                <p className="text-3xl font-bold text-gray-900">{formatarTokens(tokensTotais)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Custo médio / análise de dados
                </p>
                <p className="text-3xl font-bold text-gray-900">{formatarUsd(analises.totais.custoMedioUsd)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Custo médio / relatório analisado
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatarUsd(relatorios.totais.custoMedioPorRelatorioUsd)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Análises</p>
                <p className="text-3xl font-bold text-gray-900">{analises.totais.nAnalises}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Relatórios analisados
                </p>
                <p className="text-3xl font-bold text-gray-900">{relatorios.totais.nRelatoriosDistintos}</p>
              </div>
            </div>

            {/* ── Análise de dados ── */}
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
                <Sparkles className="w-4.5 h-4.5 text-green-600" />
                Análise de dados (/analise/nova)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Análises</p>
                  <p className="text-2xl font-bold text-gray-900">{analises.totais.nAnalises}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Custo total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatarUsd(analises.totais.custoTotalUsd)}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Tokens (entrada / saída)
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatarTokens(analises.totais.tokensEntrada)} / {formatarTokens(analises.totais.tokensSaida)}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Duração média</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(analises.totais.duracaoMediaMs / 1000)}s
                  </p>
                </div>
              </div>

              {analises.totais.tokensEntrada === 0 && analises.totais.nAnalises > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
                  Há análises com custo registado mas sem tokens brutos: são análises feitas antes
                  desta contagem existir. O custo em USD continua correcto para elas; só o detalhe em
                  tokens é que fica em branco.
                </p>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900">Custo por utilizador</h3>
                  </div>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-sm pd-responsive-table">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                          <th className="px-5 py-2.5">Utilizador</th>
                          <th className="px-5 py-2.5 text-right">Análises</th>
                          <th className="px-5 py-2.5 text-right">Custo total</th>
                          <th className="px-5 py-2.5 text-right">Média</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analises.porUtilizador.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                              Ainda não há análises com custo registado.
                            </td>
                          </tr>
                        ) : (
                          analises.porUtilizador.map((u, i) => (
                            <tr key={u.utilizadorId ?? `sem-conta-${i}`} className="border-b border-gray-50 last:border-0">
                              <td data-label="Utilizador" className="px-5 py-3">
                                <p className="font-semibold text-gray-800">{u.nome || u.email || 'Sem conta'}</p>
                                {u.email && <p className="text-xs text-gray-400">{u.email}</p>}
                              </td>
                              <td data-label="Análises" className="px-5 py-3 text-right tabular-nums">{u.nAnalises}</td>
                              <td data-label="Custo total" className="px-5 py-3 text-right tabular-nums font-semibold text-gray-800">
                                {formatarUsd(u.custoTotalUsd)}
                              </td>
                              <td data-label="Média" className="px-5 py-3 text-right tabular-nums text-gray-500">
                                {formatarUsd(u.custoMedioUsd)}
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
                    <Clock className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900">Análises recentes</h3>
                  </div>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-sm pd-responsive-table">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                          <th className="px-5 py-2.5">Pergunta</th>
                          <th className="px-5 py-2.5 text-right">Custo</th>
                          <th className="px-5 py-2.5 text-right">Tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analises.recentes.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-5 py-8 text-center text-gray-400">
                              Ainda não há análises com custo registado.
                            </td>
                          </tr>
                        ) : (
                          analises.recentes.map((a) => (
                            <tr key={a.id} className="border-b border-gray-50 last:border-0">
                              <td data-label="Pergunta" className="px-5 py-3 max-w-xs">
                                <p className="text-gray-800 truncate" title={a.pergunta}>{a.pergunta}</p>
                                <p className="text-xs text-gray-400">
                                  {a.nome || a.email || 'Sem conta'} · {new Date(a.criadoEm).toLocaleString('pt-PT')}
                                </p>
                              </td>
                              <td data-label="Custo" className="px-5 py-3 text-right tabular-nums font-semibold text-gray-800">
                                {a.custoUsd != null ? formatarUsd(a.custoUsd) : 'N/D'}
                              </td>
                              <td data-label="Tokens" className="px-5 py-3 text-right tabular-nums text-gray-500 text-xs">
                                {a.tokensEntrada != null ? `${formatarTokens(a.tokensEntrada)} / ${formatarTokens(a.tokensSaida || 0)}` : 'N/D'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Análise de relatórios ── */}
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
                <FileSearch className="w-4.5 h-4.5 text-green-600" />
                Análise de relatórios (PDFs)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Chamadas de IA</p>
                  <p className="text-2xl font-bold text-gray-900">{relatorios.totais.nChamadas}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Custo total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatarUsd(relatorios.totais.custoTotalUsd)}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Custo médio / chamada</p>
                  <p className="text-2xl font-bold text-gray-900">{formatarUsd(relatorios.totais.custoMedioUsd)}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Tokens (entrada / saída)
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatarTokens(relatorios.totais.tokensEntrada)} / {formatarTokens(relatorios.totais.tokensSaida)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900">Custo por tipo de acção</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm pd-responsive-table">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                          <th className="px-5 py-2.5">Tipo</th>
                          <th className="px-5 py-2.5 text-right">Chamadas</th>
                          <th className="px-5 py-2.5 text-right">Custo total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorios.porTipo.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-5 py-8 text-center text-gray-400">
                              Ainda não há chamadas de IA registadas sobre relatórios.
                            </td>
                          </tr>
                        ) : (
                          relatorios.porTipo.map((t) => (
                            <tr key={t.tipo} className="border-b border-gray-50 last:border-0">
                              <td data-label="Tipo" className="px-5 py-3 text-gray-800">{ROTULO_TIPO[t.tipo] || t.tipo}</td>
                              <td data-label="Chamadas" className="px-5 py-3 text-right tabular-nums">{t.nChamadas}</td>
                              <td data-label="Custo total" className="px-5 py-3 text-right tabular-nums font-semibold text-gray-800">
                                {formatarUsd(t.custoTotalUsd)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-5 py-4 border-t border-b border-gray-100 flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900">Custo por relatório</h3>
                  </div>
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-sm pd-responsive-table">
                      <tbody>
                        {relatorios.porRelatorio.length === 0 ? (
                          <tr>
                            <td className="px-5 py-8 text-center text-gray-400">Sem dados ainda.</td>
                          </tr>
                        ) : (
                          relatorios.porRelatorio.map((r) => (
                            <tr key={r.reportId} className="border-b border-gray-50 last:border-0">
                              <td className="px-5 py-3 text-gray-800 max-w-[14rem] truncate" title={r.titulo}>{r.titulo}</td>
                              <td className="px-5 py-3 text-right tabular-nums text-gray-500 text-xs whitespace-nowrap">
                                {r.nChamadas} chamada{r.nChamadas === 1 ? '' : 's'}
                              </td>
                              <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-800 whitespace-nowrap">
                                {formatarUsd(r.custoTotalUsd)}
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
                    <Clock className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900">Chamadas recentes</h3>
                  </div>
                  <div className="overflow-x-auto max-h-[34rem] overflow-y-auto">
                    <table className="w-full text-sm pd-responsive-table">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                          <th className="px-5 py-2.5">Relatório</th>
                          <th className="px-5 py-2.5 text-right">Custo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorios.recentes.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-5 py-8 text-center text-gray-400">
                              Ainda não há chamadas de IA registadas sobre relatórios.
                            </td>
                          </tr>
                        ) : (
                          relatorios.recentes.map((r) => (
                            <tr key={r.id} className="border-b border-gray-50 last:border-0">
                              <td data-label="Relatório" className="px-5 py-3 max-w-xs">
                                <p className="text-gray-800 truncate" title={r.titulo}>{r.titulo}</p>
                                <p className="text-xs text-gray-400">
                                  {ROTULO_TIPO[r.tipo] || r.tipo} · {r.nome || r.email || 'admin'} ·{' '}
                                  {new Date(r.criadoEm).toLocaleString('pt-PT')}
                                </p>
                              </td>
                              <td data-label="Custo" className="px-5 py-3 text-right tabular-nums font-semibold text-gray-800">
                                {formatarUsd(r.custoUsd)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Preços por token assumidos: Claude Opus 5 $5/$25 por milhão (entrada/saída), Claude
              Sonnet 5 $3/$15, Claude Haiku 4.5 $1/$5: os mesmos preços usados para calcular
              `custo_usd`. Não inclui o custo de escrita/leitura de cache (normalmente mais barato
              que o preço de entrada normal), por isso o valor real gasto tende a ser ligeiramente
              menor do que o mostrado aqui.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
