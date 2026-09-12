import { redirect } from 'next/navigation'
import { MessageSquareHeart } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth'
import { findFeedbacks } from '@/lib/db'
import { AdminSidebar } from '@/components/AdminSidebar'
import { DashboardHeader } from '@/components/DashboardHeader'

export const dynamic = 'force-dynamic'

export default async function AdminFeedbackPage() {
  const user = await getCurrentUserProfile()
  if (!user) redirect('/login?next=/admin/feedback')
  if (user.role !== 'admin') redirect('/')

  const feedbacks = await findFeedbacks()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:block">
        <AdminSidebar user={user} />
      </div>

      <div className="flex-1 min-w-0 md:ml-64">
        <DashboardHeader user={user} />

        <div className="p-4 md:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquareHeart className="w-6 h-6 text-green-600" />
                Feedback dos Utilizadores
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Mensagens enviadas através do botão de feedback do portal, durante a fase beta.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm pd-responsive-table">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-5 py-2.5">Nome</th>
                      <th className="px-5 py-2.5">Email</th>
                      <th className="px-5 py-2.5">Mensagem</th>
                      <th className="px-5 py-2.5">Página</th>
                      <th className="px-5 py-2.5">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbacks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                          Ainda não há feedback enviado pelos utilizadores.
                        </td>
                      </tr>
                    ) : (
                      feedbacks.map((f) => (
                        <tr key={f.id} className="border-b border-gray-50 last:border-0 align-top">
                          <td className="px-5 py-3 font-medium text-gray-900">{f.nome}</td>
                          <td className="px-5 py-3 text-gray-700">
                            <a href={`mailto:${f.email}`} className="text-green-700 hover:underline">
                              {f.email}
                            </a>
                          </td>
                          <td className="px-5 py-3 text-gray-700 max-w-md whitespace-pre-wrap">{f.mensagem}</td>
                          <td className="px-5 py-3 text-gray-500">{f.paginaOrigem || 'N/D'}</td>
                          <td className="px-5 py-3 text-gray-500">
                            {new Date(f.createdAt).toLocaleString('pt-PT')}
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
      </div>
    </div>
  )
}
