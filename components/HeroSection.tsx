'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Search, Database, Map, Layers, Satellite, Zap, TrendingUp } from 'lucide-react'
import Image from 'next/image'

export function HeroSection() {
  const features = [
    { icon: Layers, text: 'Dados Geoespaciais', href: '/dados-espaciais' },
    { icon: Database, text: 'Dados Alfanuméricos', href: '/dados-alfanumericos' },
    { icon: TrendingUp, text: 'Relatórios', href: '/relatorios' },
  ]

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 md:pt-24 pb-20 md:pb-32 px-4 overflow-hidden">
      {/* Background animado com gradientes */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-yellow-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-2xl opacity-25 animate-float" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="container mx-auto text-center relative z-10">
        <div className="mb-8 md:mb-12 animate-fade-in">

          {/* Título Principal estático */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-4 md:mb-6 px-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <span className="block mb-2 bg-gradient-to-r from-green-500 via-green-600 to-green-700 bg-clip-text text-transparent">
              Portal de Dados
            </span>
          </h1>

          {/* Subtítulo */}
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-600 mb-4 md:mb-6 max-w-4xl mx-auto leading-relaxed px-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            Explore, visualize e baixe dados
            <span className="font-bold text-green-600"> geoespaciais, alfanuméricos e relatórios</span>
          </p>
          <p className="text-base sm:text-lg md:text-xl text-gray-500 max-w-3xl mx-auto px-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            Seu portal completo para informações espaciais, dados estruturados e análises
          </p>
        </div>

        {/* Cards Horizontais Clicáveis */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-8 md:mb-12 px-4 animate-slide-up" style={{ animationDelay: '0.6s' }}>
          {features.map((feature, index) => {
            const IconComponent = feature.icon
            return (
              <Link
                key={index}
                href={feature.href}
                className="flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-green-100 hover:border-green-300 transition-all duration-300 hover:scale-105 animate-fade-in"
                style={{ animationDelay: `${0.7 + index * 0.1}s` }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-gray-700">{feature.text}</span>
              </Link>
            )
          })}
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 px-4 animate-slide-up" style={{ animationDelay: '0.8s' }}>
          <Link
            href="/dados-espaciais"
            className="group flex items-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-gradient-to-r from-green-500 via-green-600 to-green-700 text-white rounded-xl md:rounded-2xl font-bold text-base md:text-lg lg:text-xl shadow-2xl hover:shadow-green-500/50 hover:scale-110 transition-all duration-300 hover-lift relative overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-green-600 via-green-700 to-green-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <Search className="w-5 h-5 md:w-6 md:h-6 relative z-10 group-hover:rotate-12 transition-transform" />
            <span className="relative z-10">Explorar Dados Geoespaciais</span>
            <Zap className="w-5 h-5 md:w-6 md:h-6 relative z-10 group-hover:animate-pulse" />
          </Link>
          
          <Link
            href="/dados-espaciais"
            className="group flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-white/90 backdrop-blur-sm text-red-600 rounded-xl md:rounded-2xl font-semibold text-sm md:text-base lg:text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-red-200 hover:border-red-400"
          >
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
            <span>Ver Estatísticas</span>
          </Link>
        </div>

      </div>



    </section>
  )
}
