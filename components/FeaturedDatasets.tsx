'use client'

import Link from 'next/link'
import { Calendar, Package, Eye, Download, ArrowRight } from 'lucide-react'

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
}

interface FeaturedDatasetsProps {
  datasets: Dataset[]
}

export function FeaturedDatasets({ datasets }: FeaturedDatasetsProps) {
  if (datasets.length === 0) {
    return null
  }

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-gray-800">
          Datasets em Destaque
        </h2>
        <p className="text-center text-gray-600 mb-12 text-lg">
          Confira os datasets mais recentes adicionados ao portal
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((dataset, index) => (
            <Link
              key={dataset.id}
              href={`/dataset/${dataset.id}`}
              className="bg-white rounded-xl p-6 shadow-lg hover-lift transition-all duration-300 border border-gray-100 hover:border-green-300 animate-slide-up group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-gradient-to-r from-green-100 to-green-200 text-green-800 text-sm rounded-full font-semibold">
                  {dataset.category.name}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-green-600 transition">
                {dataset.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {dataset.description}
              </p>
              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{dataset.year}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  <span>{dataset.format}</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1 text-gray-600 text-sm">
                  <Eye className="w-4 h-4" />
                  <span>{dataset.views}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600 text-sm">
                  <Download className="w-4 h-4" />
                  <span>{dataset.downloads}</span>
                </div>
                <div className="flex items-center gap-1 text-green-600 font-semibold text-sm group-hover:gap-2 transition-all">
                  <span>Ver mais</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link
            href="/dados-espaciais"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            <span>Ver Todos os Datasets</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
