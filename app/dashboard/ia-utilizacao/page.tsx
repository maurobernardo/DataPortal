import { redirect } from 'next/navigation'
import { Brain, MessageSquareText, Users } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth'
import { getAiInsightUsageSummary } from '@/lib/db'
import { AdminSidebar } from '@/components/AdminSidebar'
import { DashboardHeader } from '@/components/DashboardHeader'

export const dynamic = 'force-dynamic'

export default async function AiUsagePage() {
  const user = await getCurrentUserProfile()

  if (!user) {
    redirect('/login?next=/dashboard/ia-utilizacao')
  }
  if (user.role !== 'admin') {
    redirect('/')
  }

  const { totals, byUser, recent } = await getAiInsightUsageSummary()

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
                <Brain className="w-6 h-6 text-green-600" />
                Utilização do AI Insights
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Consultas de IA por utilizador. Sem limite diário activo neste momento.
              </p>
            </div>

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
                <table className="w-full text-sm">
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
                          <td className="px-5 py-3">
                            <p className="font-semibold text-gray-800">{row.name || row.email}</p>
                            <p className="text-xs text-gray-400">{row.email}</p>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-600">
                              {row.todayQueries}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-700">{row.totalQueries}</td>
                          <td className="px-5 py-3 text-gray-500 text-xs">
                            {row.lastQueryAt ? new Date(row.lastQueryAt).toLocaleString('pt-PT') : '—'}
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
