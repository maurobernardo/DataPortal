import { redirect } from 'next/navigation'
import { FileSearch } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth'
import { listarUsoRelatorios } from '@/lib/relatorios/persistencia'
import { AdminSidebar } from '@/components/AdminSidebar'
import { DashboardHeader } from '@/components/DashboardHeader'
import { RelatoriosUsoTable } from '@/components/admin/RelatoriosUsoTable'

export const dynamic = 'force-dynamic'

export default async function RelatoriosUsoPage() {
  const user = await getCurrentUserProfile()
  if (!user) redirect('/login?next=/admin/relatorios-uso')
  if (user.role !== 'admin') redirect('/')

  const linhas = await listarUsoRelatorios()
  const totalDesbloqueios = linhas.reduce((soma, l) => soma + l.nUtilizadores, 0)
  const nuncaUsados = linhas.filter((l) => l.nUtilizadores === 0).length

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
                <FileSearch className="w-6 h-6 text-green-600" />
                Uso dos relatórios
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Quantas pessoas distintas já desbloquearam o resumo de cada relatório, e quem. Um
                relatório com 0 tem o resumo pronto (ou nem isso), mas ninguém pediu a análise
                ainda.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Relatórios</p>
                <p className="text-3xl font-bold text-gray-900">{linhas.length}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Desbloqueios no total
                </p>
                <p className="text-3xl font-bold text-gray-900">{totalDesbloqueios}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Nunca usados
                </p>
                <p className="text-3xl font-bold text-gray-900">{nuncaUsados}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-bold text-gray-900">Por relatório</h2>
              </div>
              <RelatoriosUsoTable linhas={linhas} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
