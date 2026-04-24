'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Filter } from 'lucide-react'
import Link from 'next/link'

interface SpatialDataSearchProps {
  initialSearch?: string
}

export function SpatialDataSearch({ initialSearch }: SpatialDataSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch || '')
  const router = useRouter()

  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch)
    }
  }, [initialSearch])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dados-espaciais?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    router.push('/dados-espaciais')
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
      {/* Header com Gradiente */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Search className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            Pesquise por dados espaciais
          </h2>
        </div>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o nome, descrição ou palavras-chave..."
              className="w-full px-4 md:px-6 py-3 md:py-4 pr-12 border-2 border-white/30 bg-white/90 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-white focus:border-white transition-all text-sm md:text-base lg:text-lg placeholder-gray-400 text-gray-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-6 md:px-8 py-3 md:py-4 bg-white text-green-600 rounded-xl font-bold hover:bg-green-50 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Search className="w-5 h-5" />
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </form>
      </div>

      {/* Quick Filters */}
      <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-600">Filtros rápidos:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dados-espaciais?format=SHP"
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-green-300 hover:bg-green-50 hover:text-green-600 transition"
          >
            SHP
          </Link>
          <Link
            href="/dados-espaciais?format=GeoJSON"
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-green-300 hover:bg-green-50 hover:text-green-600 transition"
          >
            GeoJSON
          </Link>
          <Link
            href="/dados-espaciais?format=GPKG"
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-green-300 hover:bg-green-50 hover:text-green-600 transition"
          >
            GPKG
          </Link>
          <Link
            href="/dados-espaciais?format=CSV"
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-green-300 hover:bg-green-50 hover:text-green-600 transition"
          >
            CSV
          </Link>
        </div>
      </div>
    </div>
  )
}
