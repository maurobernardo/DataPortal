'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { X, Filter, Check, FolderTree, FileType, MapPin, RefreshCw, Calendar } from 'lucide-react'
import Link from 'next/link'

interface Category {
  id: number
  name: string
  _count: {
    datasets: number
  }
}

interface CatalogFiltersProps {
  categories: Category[]
  activeCategory?: string
  activeFormat?: string
  availableFormats: string[]
  availableSources: string[]
  availableYears: number[]
  activeYear?: string
  activeSortOrder?: string
}

export function CatalogFilters({ categories, activeCategory, activeFormat, availableFormats, availableSources, availableYears, activeYear }: CatalogFiltersProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const basePath = pathname?.startsWith('/dados-alfanumericos') ? '/dados-alfanumericos' : '/dados-espaciais'

  const clearFilters = () => {
    router.push(basePath)
  }

  const hasActiveFilters = !!(activeCategory || activeFormat || searchParams.get('source'))

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-100/70 via-white to-white rounded-xl border border-red-200 shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Filtrar Resultados</span>
            {hasActiveFilters && (
              <span className="flex items-center justify-center w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full">
                {[activeCategory, activeFormat, searchParams.get('source')].filter(Boolean).length}
              </span>
            )}
          </div>
          <span className="text-sm text-red-600 font-medium">Abrir</span>
        </button>
      </div>

      {/* Filter Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-auto
          h-full lg:h-auto
          w-80 lg:w-full
          bg-white lg:bg-transparent
          transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform duration-300 ease-in-out
          lg:block
        `}
      >
        <div className="h-full overflow-y-auto lg:overflow-visible bg-gradient-to-b from-red-50 via-white to-red-100/40 lg:rounded-2xl lg:border lg:border-red-200 lg:shadow-sm p-6 lg:p-6 space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-100 rounded-lg">
                <Filter className="w-5 h-5 text-gray-900" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Filtros</h2>
            </div>
            
            {/* Close Button (Mobile) */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Clear Button (Desktop) */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
                title="Limpar todos os filtros"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
          </div>

          {/* Mobile Clear Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
            >
              <RefreshCw className="w-4 h-4" />
              Limpar Filtros
            </button>
          )}

          {/* Categories Filter */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-400">
              <FolderTree className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Categorias</h3>
            </div>
            <div className="space-y-1">
              <FilterItem
                label="Todas as categorias"
                active={!activeCategory}
                href={basePath}
              />
              {categories.map((category) => (
                <FilterItem
                  key={category.id}
                  label={category.name}
                  count={category._count.datasets}
                  active={activeCategory === String(category.id)}
                  href={`${basePath}?category=${category.id}`}
                />
              ))}
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-red-200/60" />

          {/* Format Filter */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-400">
              <FileType className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Formato</h3>
            </div>
            <div className="space-y-1">
              <FilterItem
                label="Todos os formatos"
                active={!activeFormat}
                href={basePath}
              />
              {availableFormats.map((format) => (
                <FilterItem
                  key={format}
                  label={format}
                  active={activeFormat === format}
                  href={`${basePath}?format=${encodeURIComponent(format)}`}
                />
              ))}
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-red-200/60" />

          {/* Source Filter */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-400">
              <MapPin className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Fonte</h3>
            </div>
            <div className="space-y-1">
              <FilterItem
                label="Todas as fontes"
                active={!searchParams.get('source')}
                href={basePath}
              />
              {availableSources.map((source) => (
                <FilterItem
                  key={source}
                  label={source}
                  active={searchParams.get('source') === source}
                  href={`${basePath}?source=${source}`}
                />
              ))}
            </div>
          </div>
          
          {/* Separator */}
          <div className="h-px bg-red-200/60" />

          {/* Year Filter */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Ano</h3>
            </div>
            <div className="space-y-1">
              <FilterItem
                label="Todos os anos"
                active={!activeYear}
                href={basePath}
              />
              {availableYears.map((year) => (
                <FilterItem
                  key={year}
                  label={year.toString()}
                  active={activeYear === year.toString()}
                  href={`${basePath}?year=${year}`}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}

interface FilterItemProps {
  label: string
  count?: number
  active: boolean
  href: string
}

function FilterItem({ label, count, active, href }: FilterItemProps) {
  return (
    <Link
      href={href}
      className={`
        relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 group
        ${active 
          ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 font-semibold shadow-sm ring-1 ring-red-100/50' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }
      `}
    >
      <div className="flex items-center gap-2.5 relative z-10">
        {/* Active Indicator Dot */}
        {active && (
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        )}
        <span>{label}</span>
        {count !== undefined && (
          <span className={`text-xs ${active ? 'text-red-600/80' : 'text-gray-400 group-hover:text-gray-500'}`}>
            ({count})
          </span>
        )}
      </div>
      
      {/* Check Icon for Active State */}
      {active && <Check className="w-4 h-4 text-red-600 relative z-10" />}
      
      {/* Hover Effect for Non-active */}
      {!active && (
        <div className="absolute inset-0 bg-gray-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </Link>
  )
}