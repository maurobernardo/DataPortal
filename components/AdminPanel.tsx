'use client'

import { useState } from 'react'
import { DatasetForm } from './DatasetForm'
import { CategoryForm } from './CategoryForm'
import { ReportForm } from './ReportForm'
import { AlphanumericDashboardForm } from './AlphanumericDashboardForm'
import { BarChart3, Database, FolderTree, FileText, Layers } from 'lucide-react'

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'datasets' | 'categories' | 'reports' | 'alphanumericDashboards'>('datasets')

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
        <div className="flex flex-col sm:flex-row gap-1 border-b border-gray-200 bg-gray-50 p-2">
          <button
            onClick={() => setActiveTab('datasets')}
            className={`flex items-center gap-3 px-4 md:px-6 py-3 text-sm md:text-base font-semibold transition-all duration-300 relative rounded-lg ${
              activeTab === 'datasets'
                ? 'bg-white text-green-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Database className="w-5 h-5" />
            <span>Gerenciar Datasets</span>
            {activeTab === 'datasets' && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-green-600 rounded-t-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-3 px-4 md:px-6 py-3 text-sm md:text-base font-semibold transition-all duration-300 relative rounded-lg ${
              activeTab === 'categories'
                ? 'bg-white text-green-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FolderTree className="w-5 h-5" />
            <span>Gerenciar Categorias</span>
            {activeTab === 'categories' && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-green-600 rounded-t-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-3 px-4 md:px-6 py-3 text-sm md:text-base font-semibold transition-all duration-300 relative rounded-lg ${
              activeTab === 'reports'
                ? 'bg-white text-green-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Gerenciar Relatórios</span>
            {activeTab === 'reports' && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-green-600 rounded-t-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('alphanumericDashboards')}
            className={`flex items-center gap-3 px-4 md:px-6 py-3 text-sm md:text-base font-semibold transition-all duration-300 relative rounded-lg ${
              activeTab === 'alphanumericDashboards'
                ? 'bg-white text-green-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Dashboards</span>
            {activeTab === 'alphanumericDashboards' && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-green-600 rounded-t-full"></div>
            )}
          </button>
        </div>

        <div className="p-4 md:p-6 animate-fade-in">
          {activeTab === 'datasets' && <DatasetForm />}
          {activeTab === 'categories' && <CategoryForm />}
          {activeTab === 'reports' && <ReportForm />}
          {activeTab === 'alphanumericDashboards' && <AlphanumericDashboardForm />}
        </div>
      </div>
    </div>
  )
}
