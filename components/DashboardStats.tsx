'use client'

import { Database, Eye, Download } from 'lucide-react'

interface DashboardStatsProps {
  totalDatasets: number
  totalViews: number
  totalDownloads: number
}

export function DashboardStats({
  totalDatasets,
  totalViews,
  totalDownloads,
}: DashboardStatsProps) {
  const stats = [
    {
      label: 'Total de Datasets',
      value: totalDatasets,
      icon: Database,
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Total de Visualizações',
      value: totalViews.toLocaleString('pt-BR'),
      icon: Eye,
      gradient: 'from-red-500 to-red-600',
      bgGradient: 'from-red-50 to-red-100',
      iconColor: 'text-red-600',
    },
    {
      label: 'Total de Downloads',
      value: totalDownloads.toLocaleString('pt-BR'),
      icon: Download,
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100',
      iconColor: 'text-green-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon
        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.bgGradient} rounded-2xl p-8 shadow-xl hover-lift transition-all duration-300 border border-white/50 animate-slide-up`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg`}>
                <IconComponent className={`w-8 h-8 ${stat.iconColor}`} />
              </div>
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${stat.gradient} opacity-20`}></div>
            </div>
            <div className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-2`}>
              {stat.value}
            </div>
            <div className="text-gray-700 font-semibold">{stat.label}</div>
          </div>
        )
      })}
    </div>
  )
}
