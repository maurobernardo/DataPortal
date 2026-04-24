'use client'

import Link from 'next/link'
import { ArrowRight, Download, Globe, BookOpen, CheckCircle2, Monitor, Laptop, Smartphone } from 'lucide-react'

export function SpatialDataSection() {
  const features = [
    {
      icon: Globe,
      title: 'Catálogo de dados Geoespaciais',
      description: 'Os dados estão organizados por temas, havendo, por vezes, um mesmo dado em temas diferentes.',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      icon: Globe,
      title: 'Catálogo de dados Alfanuméricos',
      description: 'Existem dados Alfanuméricos para baixar.',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600',
    },
  ]

  return (
    <section className="py-12 md:py-16 lg:py-20 px-4 bg-gradient-to-br from-gray-50 via-green-50/50 to-yellow-50/30 relative overflow-hidden">
      {/* Background decorativo */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-green-200 to-green-300 rounded-full blur-3xl opacity-20 -z-0 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-red-200 to-yellow-200 rounded-full blur-3xl opacity-20 -z-0 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-green-100 to-yellow-100 rounded-full blur-3xl opacity-10 -z-0"></div>

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 lg:gap-12 items-center">
          {/* Lado Esquerdo - Texto e Features */}
          <div className="space-y-8 animate-slide-up">
            {/* Título */}
            <div className="animate-slide-up">
              <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-6 shadow-lg animate-float">
                <Globe className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4 relative inline-block">
                Dados <span className="bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">Geoespaciais</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-600 mb-8">
                Explore nossa coleção completa de dados geoespaciais
              </p>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-4 md:gap-6">
              {features.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-6 py-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                  >
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-6 h-6 text-white stroke-2" />
                    </div>
                    <span className="font-semibold text-gray-700 text-base">{feature.title}</span>
                  </div>
                )
              })}
            </div>

            {/* Botão CTA */}
            <div className="pt-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <Link
                href="/dados-espaciais"
                className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-green-500 via-green-600 to-green-700 text-white rounded-lg md:rounded-xl font-bold text-sm md:text-base lg:text-lg shadow-2xl hover:shadow-green-500/50 hover:scale-105 transition-all duration-300 hover-lift group"
              >
                <Download className="w-5 h-5 md:w-6 md:h-6 group-hover:animate-bounce" />
                <span className="text-xs md:text-sm lg:text-base">BAIXAR DADOS ESPACIAIS</span>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition" />
              </Link>
            </div>
          </div>

          {/* Lado Direito - Imagem da tela real */}
          <div className="relative animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <img 
              src="/images/data.png" 
              alt="Tela do Data Portal" 
              className="w-full h-auto max-h-[500px] object-contain rounded-2xl shadow-2xl border border-gray-200"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
