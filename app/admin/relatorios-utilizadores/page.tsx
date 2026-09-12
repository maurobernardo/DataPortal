import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileUp } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth'
import { listarRelatoriosEnviadosPorUtilizadores } from '@/lib/db'
import { AdminSidebar } from '@/components/AdminSidebar'
import { DashboardHeader } from '@/components/DashboardHeader'

export const dynamic = 'force-dynamic'

/**
 * Relatórios enviados directamente por utilizadores (ver app/api/reports/upload/route.ts), para a
 * equipa rever, descarregar e, se fizer sentido, publicar no catálogo oficial. Nunca aparecem em
 * /relatorios para outros utilizadores — só aqui e na própria página do relatório, para quem o
 * enviou.
 */
export default async function RelatoriosUtilizadoresPage() {
  const user = await getCurrentUserProfile()
  if (!user) redirect('/login?next=/admin/relatorios-utilizadores')
  if (user.role !== 'admin') redirect('/')

  const relatorios = await listarRelatoriosEnviadosPorUtilizadores()

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
                <FileUp className="w-6 h-6 text-green-600" />
                Relatórios Enviados por Utilizadores
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Cada linha é um PDF que um utilizador carregou para o portal analisar. Descarregue
                para rever; publicá-lo no catálogo oficial é uma acção separada, em "Relatórios".
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm pd-responsive-table">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-5 py-2.5">Título</th>
                      <th className="px-5 py-2.5">Enviado por</th>
                      <th className="px-5 py-2.5">Tamanho</th>
                      <th className="px-5 py-2.5">Data</th>
                      <th className="px-5 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorios.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                          Ainda ninguém enviou um relatório próprio para o portal analisar.
                        </td>
                      </tr>
                    ) : (
                      relatorios.map((r) => (
                        <tr key={r.id} className="border-b border-gray-50 last:border-0 align-top">
                          <td className="px-5 py-3">
                            <Link href={`/relatorios/${r.id}`} className="text-green-700 hover:underline font-medium">
                              {r.title}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-gray-700">
                            {r.utilizadorNome || r.utilizadorEmail || 'Conta eliminada'}
                          </td>
                          <td className="px-5 py-3 text-gray-500">{r.fileSize || 'N/D'}</td>
                          <td className="px-5 py-3 text-gray-500">
                            {new Date(r.createdAt).toLocaleString('pt-PT')}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <a
                              href={`/api/admin/relatorios-utilizadores/${r.id}/download`}
                              className="text-xs font-semibold text-green-700 hover:underline"
                            >
                              Descarregar
                            </a>
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
