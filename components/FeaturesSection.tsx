'use client'

import { Globe, Map, Layers, Download, Search, Filter, Database, Shield, Zap, TrendingUp, Users, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export function FeaturesSection() {
  const mainFeatures = [
    {
      icon: Globe,
      title: 'Dados Geoespaciais Completos',
      description: 'Acesso a uma vasta coleção de dados geoespaciais organizados por categorias e temas.',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
    },
    {
      icon: Map,
      title: 'Visualização Interativa',
      description: 'Explore mapas e visualizações interativas dos dados espaciais disponíveis. Em breve.',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
      comingSoon: true,
    },
    {
      icon: Download,
      title: 'Download Imediato',
      description: 'Baixe dados em múltiplos formatos: SHP, GeoJSON, GPKG, CSV e mais.',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
    },
    {
      icon: Search,
      title: 'Busca Avançada',
      description: 'Encontre exatamente o que precisa com filtros por categoria, ano, formato e palavras-chave.',
      color: 'from-yellow-400 to-yellow-500',
      bgColor: 'bg-yellow-50',
      iconBg: 'bg-yellow-100',
    },
    {
      icon: Database,
      title: 'Metadados Completos',
      description: 'Cada dataset inclui informações detalhadas sobre fonte, ano, formato e descrição.',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
    },
    {
      icon: TrendingUp,
      title: 'Estatísticas em Tempo Real',
      description: 'Acompanhe visualizações, downloads e métricas dos datasets mais populares.',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
    },
  ]

  const benefits = [
    { icon: Shield, text: 'Dados Verificados' },
    { icon: Zap, text: 'Acesso Rápido' },
    { icon: Users, text: 'Para Todos' },
    { icon: CheckCircle2, text: 'Atualizado Regularmente' },
  ]

  return (
    <section className="py-16 md:py-20 lg:py-24 px-4 bg-white relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-100 to-green-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-red-100 to-yellow-100 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-6 shadow-lg">
            <Layers className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
            Por que escolher nosso <span className="bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">Portal</span>?
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Uma plataforma completa e moderna para todos os seus dados geoespaciais
          </p>
        </div>

        {/* Grid de Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12">
          {mainFeatures.map((feature, index) => {
            const IconComponent = feature.icon
            return (
              <div
                key={index}
                className={`${feature.bgColor} rounded-2xl p-6 md:p-8 border border-gray-100 hover:border-green-400 transition-all duration-300 hover-lift group animate-slide-up`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`relative w-14 h-14 md:w-16 md:h-16 ${feature.iconBg} rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
                  <IconComponent className={`w-7 h-7 md:w-8 md:h-8 text-green-600`} />
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center`}>
                    <IconComponent className="w-7 h-7 md:w-8 md:h-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 group-hover:text-green-600 transition">
                  {feature.title}
                </h3>
                {'comingSoon' in feature && feature.comingSoon && (
                  <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-1 mb-3">
                    Em breve
                  </span>
                )}
                <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* Benefits Bar */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-12 animate-fade-in" style={{ animationDelay: '0.7s' }}>
          {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon
            return (
              <div
                key={index}
                className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-green-50 to-green-100 rounded-full border border-green-200 hover:border-green-400 transition-all duration-300 hover:scale-105"
              >
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-gray-700 text-sm md:text-base">{benefit.text}</span>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <Link
            href="/dados-espaciais"
            className="inline-flex items-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-gradient-to-r from-green-500 via-green-600 to-green-700 text-white rounded-xl md:rounded-2xl font-bold text-base md:text-lg lg:text-xl shadow-2xl hover:shadow-green-500/50 hover:scale-105 transition-all duration-300 hover-lift group"
          >
            <Search className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-12 transition-transform" />
            <span>Explorar Todos os Recursos</span>
            <Filter className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  )
}

