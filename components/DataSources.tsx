'use client'

import Link from 'next/link'
import { Database, Link2, ArrowRight } from 'lucide-react'
import { RevealOnScroll } from './RevealOnScroll'

export function DataSources() {
  return (
    <div className="home-card animate-slide-up">
      {/* Header com Gradiente */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Database className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            Principais Fontes
          </h2>
        </div>
      </div>
      
      <div className="p-4 md:p-6 space-y-3">
        <RevealOnScroll delayMs={0}>
          <Link
            href="/dados-espaciais?source=platforms"
            className="group flex items-center justify-between gap-4 p-4 md:p-5 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-100 rounded-xl hover:border-green-300 hover:from-green-100 hover:to-green-200 transition-all duration-300"
          >
            <div className="flex items-center gap-3 md:gap-4 flex-1">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm md:text-base text-gray-800 group-hover:text-green-600 transition">
                  Plataformas e bancos de dados
                </div>
                <div className="text-xs md:text-sm text-gray-500 mt-1">
                  Acesse múltiplos datasets
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </Link>
        </RevealOnScroll>

        <RevealOnScroll delayMs={90}>
          <Link
            href="/dados-espaciais?source=geoservices"
            className="group flex items-center justify-between gap-4 p-4 md:p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all duration-300"
          >
            <div className="flex items-center gap-3 md:gap-4 flex-1">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 transition">
                <Link2 className="w-6 h-6 md:w-7 md:h-7 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm md:text-base text-gray-800 group-hover:text-red-600 transition">
                  Geosserviços
                </div>
                <div className="text-xs md:text-sm text-gray-500 mt-1">
                  Serviços web de mapas
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </Link>
        </RevealOnScroll>
      </div>
    </div>
  )
}
