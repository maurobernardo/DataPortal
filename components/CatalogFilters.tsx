'use client'

import { useEffect, useState } from 'react'
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
  variant?: 'default' | 'geo' | 'alf'
}

export function CatalogFilters({
  categories,
  activeCategory,
  activeFormat,
  availableFormats,
  availableSources,
  availableYears,
  activeYear,
  variant = 'default',
}: CatalogFiltersProps) {
  const isCatalog = variant === 'geo' || variant === 'alf'
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const basePath = pathname?.startsWith('/dados-alfanumericos')
    ? '/dados-alfanumericos'
    : '/dados-espaciais'

  const yearFrom = searchParams.get('yearFrom') || ''
  const yearTo = searchParams.get('yearTo') || ''

  const clearFilters = () => {
    router.push(basePath)
    setIsMobileOpen(false)
  }

  const hasActiveFilters = !!(
    activeCategory ||
    activeFormat ||
    searchParams.get('source') ||
    activeYear ||
    yearFrom ||
    yearTo
  )

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value) params.delete(key)
    else params.set(key, value)
    router.push(`${basePath}?${params.toString()}`)
  }

  const closeMobile = () => setIsMobileOpen(false)

  useEffect(() => {
    if (!isMobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile()
    }
    document.addEventListener('keydown', onEsc)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onEsc)
    }
  }, [isMobileOpen])

  const mobileBtnClass = isCatalog
    ? 'md:hidden'
    : 'lg:hidden'
  const mobileCloseClass = isCatalog ? 'md:hidden' : 'lg:hidden'
  const desktopOnlyClass = isCatalog ? 'hidden md:flex' : 'hidden lg:flex'
  const mobileOnlyClass = isCatalog ? 'md:hidden' : 'lg:hidden'

  const panelClass = isCatalog
    ? 'pd-filters-panel geo-facet-rail p-5 space-y-6'
    : `pd-filters-panel h-full min-h-0 max-h-[100dvh] overflow-y-auto lg:overflow-visible lg:max-h-none
       rounded-2xl border border-red-200/75 bg-gradient-to-b from-red-100/95 via-rose-50/90 to-orange-50/45
       shadow-[0_10px_36px_-12px_rgba(173,5,31,0.18)] p-6 space-y-8`

  // "pointer-events-none"/"-auto" e "-translate-x-full"/"translate-x-0" nunca podem estar os dois
  // presentes ao mesmo tempo para o mesmo breakpoint: com as duas classes no elemento, quem
  // decide não é a ordem no JSX, é a ordem em que o Tailwind gerou as regras no CSS final — e
  // "pointer-events-none" pode ganhar mesmo com "pointer-events-auto" também presente. Isso
  // deixava o painel a abrir visualmente (a transformação resolvia-se bem) mas surdo a toques: o
  // painel parecia aberto e não filtrava nada ao tocar. Escolher só uma classe por estado, nunca
  // as duas ao mesmo tempo, evita depender dessa ordem.
  const asideClass = isCatalog
    ? [
        'geo-filters-aside w-full',
        'max-md:fixed max-md:left-0 max-md:top-0 max-md:bottom-0 max-md:z-[60]',
        'max-md:w-[min(20rem,calc(100vw-1rem))] max-md:max-w-[85vw] max-md:h-full max-md:max-h-[100dvh]',
        'max-md:transition-transform max-md:duration-300 max-md:ease-in-out',
        isMobileOpen
          ? 'max-md:translate-x-0 max-md:pointer-events-auto'
          : 'max-md:-translate-x-full max-md:pointer-events-none',
        'md:!static md:z-auto md:inset-auto md:h-auto md:max-h-none md:!translate-x-0 md:pointer-events-auto md:w-full md:max-w-none',
      ]
        .filter(Boolean)
        .join(' ')
    : `fixed z-[60] inset-y-0 left-0 h-full w-[min(20rem,calc(100vw-1rem))] max-w-[85vw]
       transform transition-transform duration-300 ease-in-out
       ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
       lg:static lg:z-0 lg:block lg:h-auto lg:w-full lg:max-w-none lg:translate-x-0`

  const filtersContent = (
    <div className={panelClass}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-green-600/15 ring-1 ring-green-600/25">
            <Filter className="w-5 h-5 text-green-700" strokeWidth={2} />
          </div>
          <h2 className="text-xl font-bold text-green-900 tracking-tight">Filtros</h2>
        </div>

        <button
          type="button"
          onClick={closeMobile}
          className={`${mobileCloseClass} p-2 rounded-lg hover:bg-white/70 text-green-800 transition`}
          aria-label="Fechar filtros"
        >
          <X className="w-5 h-5" />
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className={`${desktopOnlyClass} items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-900 transition-colors px-2 py-1 rounded-md hover:bg-white/60`}
            title="Limpar todos os filtros"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className={`${mobileOnlyClass} w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition border border-green-700/30`}
        >
          <RefreshCw className="w-4 h-4" />
          Limpar Filtros
        </button>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-700/80">
          <FolderTree className="w-4 h-4" strokeWidth={2} />
          <h3 className="text-xs font-bold uppercase tracking-wider">Categorias</h3>
        </div>
        <div className="space-y-1">
          <FilterItem label="Todas as categorias" active={!activeCategory} href={basePath} onNavigate={closeMobile} />
          {categories.map((category) => (
            <FilterItem
              key={category.id}
              label={category.name}
              count={category._count.datasets}
              active={activeCategory === String(category.id)}
              href={`${basePath}?category=${category.id}`}
              onNavigate={closeMobile}
            />
          ))}
        </div>
      </div>

      <div className="h-px bg-red-200/60" />

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-700/80">
          <FileType className="w-4 h-4" strokeWidth={2} />
          <h3 className="text-xs font-bold uppercase tracking-wider">Formato</h3>
        </div>
        <div className="space-y-1">
          <FilterItem label="Todos os formatos" active={!activeFormat} href={basePath} onNavigate={closeMobile} />
          {availableFormats.map((format) => (
            <FilterItem
              key={format}
              label={format}
              active={activeFormat === format}
              href={`${basePath}?format=${encodeURIComponent(format)}`}
              onNavigate={closeMobile}
            />
          ))}
        </div>
      </div>

      <div className="h-px bg-red-200/60" />

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-700/80">
          <MapPin className="w-4 h-4" strokeWidth={2} />
          <h3 className="text-xs font-bold uppercase tracking-wider">Fonte</h3>
        </div>
        <div className="space-y-1">
          <FilterItem
            label="Todas as fontes"
            active={!searchParams.get('source')}
            href={basePath}
            onNavigate={closeMobile}
          />
          {availableSources.map((source) => (
            <FilterItem
              key={source}
              label={source}
              active={searchParams.get('source') === source}
              href={`${basePath}?source=${source}`}
              onNavigate={closeMobile}
            />
          ))}
        </div>
      </div>

      <div className="h-px bg-red-200/60" />

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-700/80">
          <Calendar className="w-4 h-4" strokeWidth={2} />
          <h3 className="text-xs font-bold uppercase tracking-wider">Ano</h3>
        </div>
        <div className="space-y-1">
          <FilterItem
            label="Todos os anos"
            active={!activeYear && !yearFrom && !yearTo}
            href={basePath}
            onNavigate={closeMobile}
          />
          {availableYears.map((year) => (
            <FilterItem
              key={year}
              label={year.toString()}
              active={activeYear === year.toString()}
              href={`${basePath}?year=${year}`}
              onNavigate={closeMobile}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-green-800/85 mb-2">
              De
            </label>
            <select
              value={yearFrom}
              onChange={(e) => {
                setParam('year', '')
                setParam('yearFrom', e.target.value)
              }}
              className="w-full px-3 py-2 rounded-xl border border-green-200 bg-white/90 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/35"
            >
              <option value="">—</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-green-800/85 mb-2">
              Até
            </label>
            <select
              value={yearTo}
              onChange={(e) => {
                setParam('year', '')
                setParam('yearTo', e.target.value)
              }}
              className="w-full px-3 py-2 rounded-xl border border-green-200 bg-white/90 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/35"
            >
              <option value="">—</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className={`${mobileBtnClass} mb-4`}>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className={
            isCatalog
              ? 'w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--pd-ink-100)] bg-[var(--pd-surface-0)] shadow-sm hover:border-[var(--pd-green-700)] transition-all'
              : 'w-full flex items-center justify-between px-4 py-3 rounded-xl border border-red-200/80 bg-gradient-to-r from-red-100/95 via-rose-100/90 to-orange-50/70 shadow-sm hover:brightness-[1.02] transition-all active:scale-[0.99]'
          }
        >
          <div className="flex items-center gap-2 min-w-0">
            <Filter className="w-5 h-5 text-green-700 shrink-0" strokeWidth={2} />
            <span className="font-medium text-gray-800">Filtrar Resultados</span>
            {hasActiveFilters && (
              <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1 bg-green-600 text-white text-[10px] font-bold rounded-full">
                {[activeCategory, activeFormat, searchParams.get('source')].filter(Boolean).length}
              </span>
            )}
          </div>
          <span
            className={`text-sm font-semibold shrink-0 ${isCatalog ? 'text-[var(--pd-green-700)]' : 'text-green-700'}`}
          >
            Abrir
          </span>
        </button>
      </div>

      {isCatalog && isMobileOpen ? (
        <button
          type="button"
          className="geo-filters-backdrop"
          aria-label="Fechar filtros"
          onClick={closeMobile}
        />
      ) : null}

      {!isCatalog && isMobileOpen ? (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-[55] bg-[rgba(11,27,20,0.45)] border-0 cursor-default"
          aria-label="Fechar filtros"
          onClick={closeMobile}
        />
      ) : null}

      <aside className={asideClass}>{filtersContent}</aside>
    </>
  )
}

interface FilterItemProps {
  label: string
  count?: number
  active: boolean
  href: string
  onNavigate?: () => void
}

function FilterItem({ label, count, active, href, onNavigate }: FilterItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`
        relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 group
        ${
          active
            ? 'bg-[#064E2C] text-green-50 font-semibold shadow-sm ring-1 ring-green-700/25'
            : 'text-gray-700 hover:bg-white/80 hover:text-green-900'
        }
      `}
    >
      <div className="flex items-center gap-2.5 relative z-10 min-w-0">
        {active && <span className="w-1.5 h-1.5 rounded-full bg-green-300 shrink-0" />}
        <span className="truncate">{label}</span>
        {count !== undefined && (
          <span
            className={`text-xs tabular-nums shrink-0 ${active ? 'text-green-200/95' : 'text-gray-500 group-hover:text-gray-700'}`}
          >
            ({count})
          </span>
        )}
      </div>
      {active && <Check className="w-4 h-4 text-green-200 shrink-0 relative z-10" strokeWidth={2.5} />}
    </Link>
  )
}
