import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth'
import { AdminPanel } from '@/components/AdminPanel'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminHeader } from '@/components/AdminHeader'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const user = await getCurrentUserProfile()

  if (!user) {
    redirect('/login?next=/admin')
  }

  if (user.role !== 'admin') {
    redirect('/')
  }

  const tab = typeof searchParams.tab === 'string' ? searchParams.tab : undefined

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:block">
        <AdminSidebar user={user} activeTab={tab} />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 md:ml-64">
        {/* Header */}
        <AdminHeader user={user} />

        {/* Content */}
        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* DatasetForm (dentro do AdminPanel) usa useSearchParams: sem Suspense aqui, a
                navegação client-side (link da sidebar, sem recarregar a página) rebentava com
                "Application error" — só a navegação directa por URL funcionava, porque essa passa
                por um pedido de página completo em vez do router client-side do Next. */}
            <Suspense fallback={null}>
              <AdminPanel initialTab={tab} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
