import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AdminPanel } from '@/components/AdminPanel'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminHeader } from '@/components/AdminHeader'

export default async function AdminPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:block">
        <AdminSidebar user={user} />
      </div>

      {/* Main Content */}
      <div className="flex-1 md:ml-64">
        {/* Header */}
        <AdminHeader user={user} />

        {/* Content */}
        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <AdminPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
