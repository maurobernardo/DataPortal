import { redirect } from 'next/navigation'
import { ScrollText } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth'
import { findAuditLog } from '@/lib/audit'
import { AdminSidebar } from '@/components/AdminSidebar'
import { DashboardHeader } from '@/components/DashboardHeader'

export const dynamic = 'force-dynamic'

const ROTULO_ACAO: Record<string, string> = {
  promover_admin: 'Promoveu a administrador',
  remover_admin: 'Removeu acesso de administrador',
  activar_conta: 'Activou a conta',
  desactivar_conta: 'Desactivou a conta',
  criar_dataset: 'Publicou um dataset',
  eliminar_dataset: 'Eliminou um dataset',
}

export default async function AuditoriaAdminPage() {
  const user = await getCurrentUserProfile()
  if (!user) redirect('/login?next=/admin/auditoria')
  if (user.role !== 'admin') redirect('/')

  const registos = await findAuditLog(300)

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
                <ScrollText className="w-6 h-6 text-green-600" />
                Registo de auditoria
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Acções administrativas registadas neste portal: quem, o quê e quando. As {registos.length}{' '}
                entradas mais recentes.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {registos.length === 0 ? (
                <p className="p-6 text-sm text-gray-400 text-center">
                  Ainda não há acções registadas.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm pd-responsive-table">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3">Quando</th>
                        <th className="px-4 py-3">Quem</th>
                        <th className="px-4 py-3">Acção</th>
                        <th className="px-4 py-3">Detalhe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {registos.map((r) => (
                        <tr key={r.id}>
                          <td data-label="Quando" className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {new Date(r.createdAt).toLocaleString('pt-PT')}
                          </td>
                          <td data-label="Quem" className="px-4 py-3 font-semibold text-gray-800">{r.actorEmail}</td>
                          <td data-label="Acção" className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full bg-[#F1F8F4] px-2 py-0.5 text-xs font-bold text-[#064E2C]">
                              {ROTULO_ACAO[r.action] || r.action}
                            </span>
                          </td>
                          <td data-label="Detalhe" className="px-4 py-3 text-gray-500">{r.details || 'Sem detalhe adicional'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
