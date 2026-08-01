'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DatasetForm } from './DatasetForm'
import { CategoryForm } from './CategoryForm'
import { ReportForm } from './ReportForm'
import { AlphanumericDashboardForm } from './AlphanumericDashboardForm'
import { RequestsPanel } from './admin/RequestsPanel'
import { MapsAdminPanel } from './admin/MapsAdminPanel'
import { BarChart3, Database, FolderTree, FileText, Layers, MapPinned, MessageSquare } from 'lucide-react'

type AdminTab = 'datasets' | 'categories' | 'reports' | 'alphanumericDashboards' | 'requests' | 'maps'

const TAB_LABELS: Record<AdminTab, { label: string; icon: typeof Database }> = {
  datasets: { label: 'Gerenciar Datasets', icon: Database },
  categories: { label: 'Gerenciar Categorias', icon: FolderTree },
  reports: { label: 'Gerenciar Relatórios', icon: FileText },
  alphanumericDashboards: { label: 'Dashboards', icon: BarChart3 },
  requests: { label: 'Solicitações', icon: MessageSquare },
  maps: { label: 'Mapas Inteligentes', icon: MapPinned },
}

const TAB_ORDER: AdminTab[] = ['datasets', 'categories', 'reports', 'alphanumericDashboards', 'requests', 'maps']

export function AdminPanel({ initialTab }: { initialTab?: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AdminTab>(
    initialTab && TAB_ORDER.includes(initialTab as AdminTab) ? (initialTab as AdminTab) : 'datasets'
  )

  // `initialTab` só reflecte o searchParam no momento do primeiro render deste componente
  // client-side — ao navegar entre abas via link da sidebar (ex.: /admin?tab=requests), o
  // Next.js pode reaproveitar a mesma instância em vez de remontar, por isso sincroniza aqui.
  useEffect(() => {
    setActiveTab(initialTab && TAB_ORDER.includes(initialTab as AdminTab) ? (initialTab as AdminTab) : 'datasets')
  }, [initialTab])

  function selectTab(tab: AdminTab) {
    setActiveTab(tab)
    router.replace(tab === 'datasets' ? '/admin' : `/admin?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 md:p-8 text-white shadow-2xl animate-slide-up">
        <div className="flex items-center gap-3 md:gap-4 mb-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Layers className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold mb-1 md:mb-2">Gerenciamento de Dados</h1>
            <p className="text-sm md:text-base text-green-100">Cadastre e gerencie datasets e categorias do portal</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-2">
          {TAB_ORDER.map((tab) => {
            const { label, icon: Icon } = TAB_LABELS[tab]
            return (
              <button
                key={tab}
                onClick={() => selectTab(tab)}
                className={`flex items-center gap-3 px-4 md:px-6 py-3 text-sm md:text-base font-semibold transition-all duration-300 relative rounded-lg ${
                  activeTab === tab
                    ? 'bg-white text-green-600 shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-green-600 rounded-t-full"></div>
                )}
              </button>
            )
          })}
        </div>

        <div className="p-4 md:p-6 animate-fade-in">
          {activeTab === 'datasets' && <DatasetForm />}
          {activeTab === 'categories' && <CategoryForm />}
          {activeTab === 'reports' && <ReportForm />}
          {activeTab === 'alphanumericDashboards' && <AlphanumericDashboardForm />}
          {activeTab === 'requests' && <RequestsPanel />}
          {activeTab === 'maps' && <MapsAdminPanel />}
        </div>
      </div>
    </div>
  )
}
