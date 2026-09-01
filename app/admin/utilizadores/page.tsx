import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth'
import { findAllRegisteredUsers } from '@/lib/db'
import { AdminSidebar } from '@/components/AdminSidebar'
import { DashboardHeader } from '@/components/DashboardHeader'
import { UsersAdminTable } from '@/components/admin/UsersAdminTable'

export const dynamic = 'force-dynamic'

export default async function UtilizadoresAdminPage() {
  const user = await getCurrentUserProfile()
  if (!user) redirect('/login?next=/admin/utilizadores')
  if (user.role !== 'admin') redirect('/')

  const utilizadores = await findAllRegisteredUsers()

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
                <Users className="w-6 h-6 text-green-600" />
                Gestão de utilizadores
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {utilizadores.length} conta{utilizadores.length !== 1 ? 's' : ''} registada
                {utilizadores.length !== 1 ? 's' : ''}. Promova a administrador ou desactive uma
                conta sem apagar os dados associados.
              </p>
            </div>

            <UsersAdminTable utilizadores={utilizadores} idAdminActual={user.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
