import { redirect } from 'next/navigation'
import { Globe2, MapPin, Activity, Radar } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth'
import { obterResumoOrigem } from '@/lib/origem-stats'
import { AdminSidebar } from '@/components/AdminSidebar'
import { DashboardHeader } from '@/components/DashboardHeader'

export const dynamic = 'force-dynamic'

/** Nomes em português dos países mais prováveis de aparecer — cai no próprio código ISO para
 *  qualquer país fora desta lista, em vez de falhar ou mostrar "undefined". */
const NOME_PAIS: Record<string, string> = {
  MZ: 'Moçambique',
  ZA: 'África do Sul',
  PT: 'Portugal',
  BR: 'Brasil',
  US: 'Estados Unidos',
  GB: 'Reino Unido',
  DE: 'Alemanha',
  FR: 'França',
  NL: 'Países Baixos',
  KE: 'Quénia',
  ZW: 'Zimbabué',
  ZM: 'Zâmbia',
  MW: 'Maláui',
  TZ: 'Tanzânia',
  IN: 'Índia',
  CN: 'China',
  CA: 'Canadá',
  AU: 'Austrália',
  IE: 'Irlanda',
  ES: 'Espanha',
  AE: 'Emirados Árabes Unidos',
}

function nomePais(codigo: string): string {
  return NOME_PAIS[codigo] || codigo
}

export default async function OrigemUtilizadoresPage() {
  const user = await getCurrentUserProfile()
  if (!user) redirect('/login?next=/admin/origem-utilizadores')
  if (user.role !== 'admin') redirect('/')

  const resumo = await obterResumoOrigem(90)
  const maxPais = Math.max(1, ...resumo.porPais.map((p) => p.total))
  const maxProvincia = Math.max(1, ...resumo.porProvinciaMZ.map((p) => p.total))

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:block">
        <AdminSidebar user={user} />
      </div>

      <div className="flex-1 md:ml-64">
        <DashboardHeader user={user} />

        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Globe2 className="w-6 h-6 text-green-600" />
                Origem dos utilizadores
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                De onde vêm os acessos ao portal (últimos 90 dias) — vistas de dataset, downloads,
                mapas, pedidos de relatório, análises de IA e contactos. Localização aproximada
                por país/região a partir do IP; o IP em si nunca é guardado.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Eventos registados
                </p>
                <p className="text-3xl font-bold text-gray-900">{resumo.totalEventos.toLocaleString('pt-PT')}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Países distintos
                </p>
                <p className="text-3xl font-bold text-gray-900">{resumo.totalPaises}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  País com mais acessos
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {resumo.paisPrincipal ? nomePais(resumo.paisPrincipal.pais) : '—'}
                </p>
                {resumo.paisPrincipal && (
                  <p className="text-xs text-gray-400 mt-0.5">{resumo.paisPrincipal.total.toLocaleString('pt-PT')} eventos</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-bold text-gray-900">Por país</h2>
                </div>
                <div className="p-5 space-y-2.5">
                  {resumo.porPais.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Ainda não há eventos com origem registada.</p>
                  ) : (
                    resumo.porPais.map((p) => (
                      <div key={p.pais} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 text-[13px] text-gray-700 truncate">{nomePais(p.pais)}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-600"
                            style={{ width: `${Math.max(2, (p.total / maxPais) * 100)}%` }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right text-[12px] font-bold text-gray-800 tabular-nums">
                          {p.total}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-bold text-gray-900">Por província (Moçambique)</h2>
                </div>
                <div className="p-5 space-y-2.5">
                  {resumo.porProvinciaMZ.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">
                      Ainda não há eventos de Moçambique com província identificada.
                    </p>
                  ) : (
                    resumo.porProvinciaMZ.map((p) => (
                      <div key={p.regiao} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 text-[13px] text-gray-700 truncate">{p.regiao}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#064E2C]"
                            style={{ width: `${Math.max(2, (p.total / maxProvincia) * 100)}%` }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right text-[12px] font-bold text-gray-800 tabular-nums">
                          {p.total}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-bold text-gray-900">Por tipo de acesso</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-5 py-2.5">Tipo</th>
                      <th className="px-5 py-2.5">Eventos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.porTipoEvento.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-5 py-8 text-center text-gray-400">
                          Ainda não há eventos registados.
                        </td>
                      </tr>
                    ) : (
                      resumo.porTipoEvento.map((t) => (
                        <tr key={t.tipoEvento} className="border-b border-gray-50 last:border-0">
                          <td className="px-5 py-3 text-gray-800">{t.rotulo}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-600">
                              {t.total}
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
                <Radar className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-bold text-gray-900">Eventos recentes</h2>
              </div>
              <ul className="divide-y divide-gray-50">
                {resumo.recentes.length === 0 ? (
                  <li className="px-5 py-8 text-center text-gray-400 text-sm">Nenhum evento ainda.</li>
                ) : (
                  resumo.recentes.map((r, i) => (
                    <li key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800">{r.rotulo}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {[r.cidade, r.regiao, r.pais ? nomePais(r.pais) : null].filter(Boolean).join(', ') || 'Origem desconhecida'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(r.criadoEm).toLocaleString('pt-PT')}
                      </span>
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
