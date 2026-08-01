'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Calendar, Package, Eye, Download, ArrowRight, MapPin, Database, FileText } from 'lucide-react'

interface Dataset {
  id: number
  title: string
  description: string
  category: {
    name: string
  }
  year: number
  format: string
  views: number
  downloads: number
  source?: string
  fileSize?: string
  keywords?: string | null
}

interface DatasetCardProps {
  dataset: Dataset
  index: number
}

export function DatasetCard({ dataset, index }: DatasetCardProps) {
  const [animate, setAnimate] = useState(false)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!hasAnimated.current) {
      hasAnimated.current = true
      setAnimate(true)
    }
  }, [])

  return (
    <Link
      href={`/dataset/${dataset.id}`}
      className={`group bg-white rounded-[14px] border border-[#E2E8E5] hover:border-[#CFE3D6] shadow-[var(--pd-shadow-sm)] hover:shadow-[var(--pd-shadow-md)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] focus-visible:ring-offset-2 ${animate ? 'animate-slide-up' : ''}`}
      style={animate ? { animationDelay: `${index * 0.05}s` } : undefined}
    >
      {/* Header do Card com Gradiente */}
      <div className="bg-gradient-to-br from-green-500 via-green-600 to-red-500 p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-white/30">
              {dataset.category.name}
            </span>
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-green-100 transition">
            {dataset.title}
          </h2>
        </div>
      </div>

      {/* Conteúdo do Card */}
      <div className="p-6">
        {/* Descrição */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
          {dataset.description}
        </p>

        {/* Informações Principais */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <Calendar className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-xs text-gray-500">Ano</div>
              <div className="text-sm font-semibold text-gray-800">{dataset.year}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <Package className="w-4 h-4 text-red-600" />
            <div>
              <div className="text-xs text-gray-500">Formato</div>
              <div className="text-sm font-semibold text-gray-800">{dataset.format}</div>
            </div>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="space-y-2 mb-4">
          {dataset.source && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <Database className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="truncate">{dataset.source}</span>
            </div>
          )}

          {dataset.fileSize && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{dataset.fileSize}</span>
            </div>
          )}
        </div>

        {/* Palavras-chave */}
        {dataset.keywords && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {dataset.keywords.split(',').slice(0, 3).map((keyword, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-md"
                >
                  {keyword.trim()}
                </span>
              ))}
              {dataset.keywords.split(',').length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                  +{dataset.keywords.split(',').length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Estatísticas */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Eye className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Visualizações</div>
                <div className="text-sm font-bold text-green-600">{dataset.views}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <Download className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Downloads</div>
                <div className="text-sm font-bold text-red-600">{dataset.downloads}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-green-600 font-semibold text-sm group-hover:gap-3 transition-all">
            <span>Ver mais</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  )
}

