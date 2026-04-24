'use client'

import { useEffect, useState } from 'react'
import { Database, Eye, Download, Users, TrendingUp, Globe, Layers, Map } from 'lucide-react'

interface StatsSectionProps {
  totalDatasets?: number
  totalViews?: number
  totalDownloads?: number
}

export function StatsSection({ totalDatasets = 0, totalViews = 0, totalDownloads = 0 }: StatsSectionProps) {
  const [counts, setCounts] = useState({ datasets: 0, views: 0, downloads: 0 })

  useEffect(() => {
    const duration = 2000
    const steps = 60
    const interval = duration / steps

    const animate = (target: number, setter: (val: number) => void) => {
      let current = 0
      const increment = target / steps
      const timer = setInterval(() => {
        current += increment
        if (current >= target) {
          setter(target)
          clearInterval(timer)
        } else {
          setter(Math.floor(current))
        }
      }, interval)
    }

    animate(totalDatasets, (val) => setCounts(prev => ({ ...prev, datasets: val })))
    animate(totalViews, (val) => setCounts(prev => ({ ...prev, views: val })))
    animate(totalDownloads, (val) => setCounts(prev => ({ ...prev, downloads: val })))
  }, [totalDatasets, totalViews, totalDownloads])

  const stats = [
    {
      icon: Database,
      value: counts.datasets.toLocaleString(),
      label: 'Datasets Disponíveis',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
    },
    {
      icon: Eye,
      value: counts.views.toLocaleString(),
      label: 'Visualizações',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-100',
      textColor: 'text-red-600',
    },
    {
      icon: Download,
      value: counts.downloads.toLocaleString(),
      label: 'Downloads Realizados',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
    },
    {
      icon: TrendingUp,
      value: '100%',
      label: 'Dados Verificados',
      color: 'from-yellow-400 to-yellow-500',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600',
    },
  ]

  const features = [
    { icon: Globe, text: 'Dados Globais' },
    { icon: Layers, text: 'Múltiplas Camadas' },
    { icon: Map, text: 'Precisão Cartográfica' },
  ]

  return (
    <section className="py-16 md:py-20 lg:py-24 px-4 bg-gradient-to-br from-gray-50 via-green-50/50 to-yellow-50/30 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-5"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Título */}
        <div className="text-center mb-12 md:mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
            Nossos <span className="bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">Números</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Uma plataforma completa para seus dados geoespaciais
          </p>
        </div>

        {/* Grid de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-12 md:mb-16">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-gray-100 hover:border-green-400 transition-all duration-300 hover-lift animate-slide-up group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center mb-4 md:mb-6 mx-auto group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
                  <IconComponent className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div className={`text-4xl md:text-5xl font-bold ${stat.textColor} mb-2 text-center`}>
                  {stat.value}
                </div>
                <div className="text-center text-sm md:text-base text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* Features em linha */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          {features.map((feature, index) => {
            const IconComponent = feature.icon
            return (
              <div
                key={index}
                className="flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-green-100 hover:border-green-300 transition-all duration-300 hover:scale-105"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-gray-700">{feature.text}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
