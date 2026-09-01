'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Eye,
  Download,
  Users,
  TrendingUp,
  TrendingDown,
  Database,
  FileText,
  Filter,
  Loader2,
  Download as DownloadIcon
} from 'lucide-react'
import { TemporalChart, type TemporalGranularity } from './TemporalChart'
import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from 'chart.js'
import { AdminSidebar } from './AdminSidebar'
import { DashboardHeader } from './DashboardHeader'
import { RelatoriosAgendadosPainel } from './admin/RelatoriosAgendadosPainel'

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement)

interface Dataset {
  id: number
  title: string
  views: number
  downloads: number
  category: {
    name: string
  }
}

interface Statistic {
  id: number
  type: string
  createdAt: string | Date  // Aceita string (serializado) ou Date
  dataset: {
    id: number
    title: string
    category: {
      name: string
    }
  }
}

interface ConversionRate {
  datasetId: number
  datasetTitle: string
  views: number
  downloads: number
  conversionRate: number
}

interface UserRetention {
  returningUsers: number
  newUsers: number
  retentionRate: number
}

interface CategoryPerformance {
  categoryName: string
  totalViews: number
  totalDownloads: number
  averageConversionRate: number
}

interface ReportFilter {
  startDate?: string
  endDate?: string
  category?: string
  formatFilter?: string
  source?: string
}

interface ModernDashboardProps {
  data: {
    totalDatasets: number
    totalViews: number
    totalDownloads: number
    totalVisitors: number
    totalReports: number
    totalReportRequests: number
    viewsThisMonth: number
    downloadsThisMonth: number
    viewsChange: number
    downloadsChange: number
    topViewed: Dataset[]
    topDownloaded: Dataset[]
    statistics: any[]
    categoryStats: { categoryName: string; count: number }[]
    recentActivity: Statistic[]
    conversionRates: ConversionRate[]
    userRetention: UserRetention
    categoryPerformance: CategoryPerformance[]
    totalRegisteredUsers: number
    registeredUsers: Array<{
      id: number
      name: string
      email: string
      emailVerified: boolean
      role: string
      createdAt: string
    }>
    authenticatedActivity: Array<{
      id: number
      type: string
      createdAt: string
      userId: number
      userName: string
      userEmail: string
      datasetId: number
      datasetTitle: string
    }>
  }
  user: {
    email: string
    name?: string
  }
}

type TemporalPeriod = '7' | '30' | 'month'

export function ModernDashboard({ data, user }: ModernDashboardProps) {
  const [reportFilters, setReportFilters] = useState<ReportFilter>({
    startDate: '',
    endDate: '',
    category: '',
    formatFilter: '',
    source: '',
  })
  const [temporalPeriod, setTemporalPeriod] = useState<TemporalPeriod>('30')
  const [temporalGranularity, setTemporalGranularity] = useState<TemporalGranularity>('daily')

  const filteredTemporalStats = useMemo(() => {
    const now = new Date()
    let since: Date
    if (temporalPeriod === '7') {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (temporalPeriod === 'month') {
      since = new Date(now.getFullYear(), now.getMonth(), 1)
    } else {
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    return data.statistics.filter((s) => new Date(s.createdAt as string) >= since)
  }, [data.statistics, temporalPeriod])

  const temporalSubtitle = useMemo(() => {
    const gran = temporalGranularity === 'weekly' ? 'agrupamento semanal' : 'agrupamento diário'
    if (temporalPeriod === '7') return `Últimos 7 dias · ${gran}`
    if (temporalPeriod === 'month') return `Este mês · ${gran}`
    return `Últimos 30 dias · ${gran}`
  }, [temporalPeriod, temporalGranularity])

  // Dados para gráfico de rosca (categorias)
  const categoryChartData = {
    labels: data.categoryStats.map((item) => item.categoryName),
    datasets: [
      {
        data: data.categoryStats.map((item) => item.count),
        backgroundColor: [
          'rgba(6, 78, 44, 0.82)',   // brand #064E2C
          'rgba(239, 68, 68, 0.8)',   // red-500
          'rgba(234, 179, 8, 0.8)',   // yellow-500
          'rgba(4, 54, 31, 0.82)',   // brand strong #04361F
          'rgba(220, 38, 38, 0.8)',   // red-600
          'rgba(202, 138, 4, 0.8)',   // yellow-600
        ],
        borderWidth: 0,
      },
    ],
  }

  // Calcular taxa de conversão média
  const avgConversionRate = data.totalViews > 0 ? (data.totalDownloads / data.totalViews) * 100 : 0

  // Função para exportar relatório
  const exportReport = async (exportFormat: 'json' | 'csv' | 'pdf') => {
    const params = new URLSearchParams()
    params.set('format', exportFormat)
    if (reportFilters.startDate) params.set('startDate', reportFilters.startDate)
    if (reportFilters.endDate) params.set('endDate', reportFilters.endDate)
    if (reportFilters.category) params.set('category', reportFilters.category)
    if (reportFilters.source) params.set('source', reportFilters.source)
    if (reportFilters.formatFilter) params.set('datasetFormat', reportFilters.formatFilter)

    // Abrir nova janela e iniciar o download
    let url = ''
    if (exportFormat === 'pdf') {
      url = `/api/admin/reports/pdf?${params}`
    } else {
      url = `/api/admin/reports?${params}`
    }

    const response = await fetch(url, {
      credentials: 'include' // Isso garante que os cookies sejam enviados
    })

    if (response.ok) {
      if (exportFormat === 'csv') {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'dashboard-report.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      } else if (exportFormat === 'pdf') {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'data-portal-relatorio.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      } else {
        // Para JSON, abrir em nova aba
        const jsonData = await response.text();
        const blob = new Blob([jsonData], { type: 'application/json' });
        const downloadUrl = window.URL.createObjectURL(blob);
        window.open(downloadUrl, '_blank');
        window.URL.revokeObjectURL(downloadUrl);
      }
    } else {
      const error = await response.json();
      alert(`Erro ao exportar relatório: ${error.error}`);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:block">
        <AdminSidebar user={user} />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 md:ml-64">
        {/* Header */}
        <DashboardHeader user={user} />

        {/* Content */}
        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Filtros Avançados */}
            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros Avançados
                </h3>
                <div className="flex gap-2">
                  <button 
                    className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    onClick={() => exportReport('pdf')}
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Exportar PDF
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                  <input 
                    type="date" 
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    value={reportFilters.startDate}
                    onChange={(e) => setReportFilters({...reportFilters, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                  <input 
                    type="date" 
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    value={reportFilters.endDate}
                    onChange={(e) => setReportFilters({...reportFilters, endDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    value={reportFilters.category}
                    onChange={(e) => setReportFilters({...reportFilters, category: e.target.value})}
                  >
                    <option value="">Todas</option>
                    {data.categoryStats.map((cat, index) => (
                      <option key={index} value={cat.categoryName}>{cat.categoryName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formato</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    value={reportFilters.formatFilter}
                    onChange={(e) => setReportFilters({...reportFilters, formatFilter: e.target.value})}
                  >
                    <option value="">Todos</option>
                    <option value="SHP">SHP</option>
                    <option value="GeoJSON">GeoJSON</option>
                    <option value="GPKG">GPKG</option>
                    <option value="CSV">CSV</option>
                  </select>
                </div>
              </div>
            </div>

            <RelatoriosAgendadosPainel />

            {/* Cards Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
              {/* Total Views */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 md:p-6 text-white shadow-lg hover-lift transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-sm opacity-90 mb-1">Total de Visualizações</div>
                <div className="text-3xl font-bold mb-2">{data.totalViews.toLocaleString('pt-BR')}</div>
                <div className="text-sm opacity-80">
                  Visualizações vs mês anterior
                  <span className="ml-2 flex items-center gap-1">
                    {data.viewsChange >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className={data.viewsChange >= 0 ? 'text-green-200' : 'text-red-200'}>
                      {data.viewsChange >= 0 ? '+' : ''}
                      {data.viewsChange.toFixed(2)}%
                    </span>
                  </span>
                </div>
              </div>

              {/* Total Downloads */}
              <div className="bg-white rounded-xl p-5 md:p-6 shadow-lg hover-lift transition border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Download className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-1">Total de Downloads</div>
                <div className="text-3xl font-bold text-gray-800 mb-2">{data.totalDownloads.toLocaleString('pt-BR')}</div>
                <div className="text-sm text-gray-500">
                  Downloads vs mês anterior
                  <span className="ml-2 flex items-center gap-1">
                    {data.downloadsChange >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={data.downloadsChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {data.downloadsChange >= 0 ? '+' : ''}
                      {data.downloadsChange.toFixed(2)}%
                    </span>
                  </span>
                </div>
              </div>

              {/* Utilizadores registados */}
              <div className="bg-white rounded-xl p-5 md:p-6 shadow-lg hover-lift transition border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-700" />
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-1">Utilizadores</div>
                <div className="text-3xl font-bold text-gray-800 mb-2">
                  {data.totalRegisteredUsers.toLocaleString('pt-BR')}
                </div>
                <div className="text-sm text-gray-500">Contas registadas</div>
              </div>

              {/* Taxa de Conversão */}
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl p-5 md:p-6 text-white shadow-lg hover-lift transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Download className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-sm opacity-90 mb-1">Taxa de Conversão</div>
                <div className="text-3xl font-bold mb-2">{avgConversionRate.toFixed(2)}%</div>
                <div className="text-sm opacity-80">
                  Downloads por Visualização
                </div>
              </div>

              {/* Relatórios */}
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 md:p-6 text-white shadow-lg hover-lift transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-sm opacity-90 mb-1">Relatórios</div>
                <div className="text-2xl font-bold mb-1">
                  {data.totalReports.toLocaleString('pt-BR')}
                </div>
                <div className="text-xs opacity-80">
                  Requests: {data.totalReportRequests.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>

            {/* Segunda Linha - Gráficos e Estatísticas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Estatísticas por Categoria - Gráfico de Pizza */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Estatísticas por Categoria</h3>
                    <p className="text-sm text-gray-500">Distribuição de datasets</p>
                  </div>
                </div>
                <div className="h-64 flex items-center justify-center">
                  <Doughnut
                    data={categoryChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                      },
                    }}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  {data.categoryStats.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: categoryChartData.datasets[0].backgroundColor[index],
                          }}
                        ></div>
                        <span className="text-gray-600">{item.categoryName}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Datasets Visualizados */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Top Datasets Visualizados</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {data.topViewed.slice(0, 5).map((dataset, index) => (
                    <div
                      key={dataset.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{dataset.title}</p>
                          <p className="text-xs text-gray-500">{dataset.category.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{dataset.views}</p>
                        <p className="text-xs text-gray-500">visualizações</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Datasets Baixados */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Top Datasets Baixados</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {data.topDownloaded.slice(0, 5).map((dataset, index) => (
                    <div
                      key={dataset.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{dataset.title}</p>
                          <p className="text-xs text-gray-500">{dataset.category.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{dataset.downloads}</p>
                        <p className="text-xs text-gray-500">downloads</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gráfico Temporal */}
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Evolução Temporal</h3>
                  <p className="text-sm text-gray-500">{temporalSubtitle}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <select
                    className="w-full sm:w-auto text-sm border border-gray-200 rounded-lg px-3 py-2"
                    value={temporalPeriod}
                    onChange={(e) => setTemporalPeriod(e.target.value as TemporalPeriod)}
                    aria-label="Período do gráfico"
                  >
                    <option value="7">Últimos 7 dias</option>
                    <option value="30">Últimos 30 dias</option>
                    <option value="month">Este mês</option>
                  </select>
                  <select
                    className="w-full sm:w-auto text-sm border border-gray-200 rounded-lg px-3 py-2"
                    value={temporalGranularity}
                    onChange={(e) => setTemporalGranularity(e.target.value as TemporalGranularity)}
                    aria-label="Agrupamento do gráfico"
                  >
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                  </select>
                </div>
              </div>
              <TemporalChart statistics={filteredTemporalStats} granularity={temporalGranularity} />
            </div>

            {/* Atividade Recente */}
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Atividade Recente</h3>
              <div className="space-y-3">
                {data.recentActivity.slice(0, 10).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start md:items-center gap-3 md:gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.type === 'view' ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      {activity.type === 'view' ? (
                        <Eye className="w-5 h-5 text-green-600" />
                      ) : (
                        <Download className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 text-sm">
                        {activity.type === 'view' ? 'Visualização' : 'Download'} de{' '}
                        {activity.dataset?.title || 'dataset entretanto removido'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.dataset?.category?.name ? `${activity.dataset.category.name} • ` : ''}
                        {format(new Date(activity.createdAt as string), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Utilizadores registados: gestão completa (promover, activar/desactivar) já vive
                em /admin/utilizadores, com o seu próprio log de auditoria — este card fica só
                com o resumo e um atalho, em vez de duplicar a tabela e a lógica aqui. */}
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-100 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Utilizadores registados</h3>
                <p className="text-sm text-gray-500">
                  {data.totalRegisteredUsers.toLocaleString('pt-BR')} conta(s) no portal
                </p>
              </div>
              <Link
                href="/admin/utilizadores"
                className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 transition-colors"
              >
                <Users className="w-4 h-4" aria-hidden />
                Gerir utilizadores
              </Link>
            </div>

            {/* Actividade de utilizadores autenticados */}
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Actividade de utilizadores autenticados</h3>
              <p className="text-sm text-gray-500 mb-4">
                Visualizações e downloads associados a sessões iniciadas
              </p>
              <div className="space-y-3">
                {data.authenticatedActivity.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    Ainda não há actividade de utilizadores autenticados.
                  </p>
                ) : (
                  data.authenticatedActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start md:items-center gap-3 md:gap-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          activity.type === 'view' ? 'bg-green-100' : 'bg-red-100'
                        }`}
                      >
                        {activity.type === 'view' ? (
                          <Eye className="w-5 h-5 text-green-600" />
                        ) : (
                          <Download className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">
                          {activity.userName}{' '}
                          <span className="font-normal text-gray-500">({activity.userEmail})</span>
                        </p>
                        <p className="text-sm text-gray-700">
                          {activity.type === 'view' ? 'Visualizou' : 'Descarregou'}{' '}
                          <span className="font-medium">{activity.datasetTitle}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(activity.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}