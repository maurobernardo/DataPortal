import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth'
import { listarLixeiraDatasets } from '@/lib/db'
import { AdminSidebar } from '@/components/AdminSidebar'
import { DashboardHeader } from '@/components/DashboardHeader'
import { LixeiraClient } from '@/components/admin/LixeiraClient'

export const dynamic = 'force-dynamic'

export default async function LixeiraPage() {
  const user = await getCurrentUserProfile()

  if (!user) {
    redirect('/login?next=/admin/lixeira')
  }
  if (user.role !== 'admin') {
    redirect('/')
  }

  const datasets = await listarLixeiraDatasets()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:block">
        <AdminSidebar user={user} />
      </div>

      <div className="flex-1 min-w-0 md:ml-64">
        <DashboardHeader user={user} />

        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <LixeiraClient datasetsIniciais={datasets} />
          </div>
        </div>
      </div>
    </div>
  )
}
