'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X, LineChart, Loader2 } from 'lucide-react'
import { SearchSuggestionsPopover } from '@/components/SearchSuggestionsPopover'

interface CatalogHeaderProps {
  initialSearch?: string
  totalCount: number
}

export function CatalogHeader({ initialSearch, totalCount }: CatalogHeaderProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch || '')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [corrected, setCorrected] = useState<string | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch)
    }
  }, [initialSearch])

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSuggestions([])
      setCorrected(null)
      return
    }

    const timeout = setTimeout(async () => {
      try {
        setLoadingSuggestions(true)
        const dataType = pathname?.includes('alfanumericos') ? 'alfanumerico' : 'geoespacial'
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}&dataType=${dataType}`)
        const data = await res.json()
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : [])
        setCorrected(typeof data?.corrected === 'string' ? data.corrected : null)
      } catch {
        setSuggestions([])
        setCorrected(null)
      } finally {
        setLoadingSuggestions(false)
      }
    }, 220)

    return () => clearTimeout(timeout)
  }, [searchQuery, pathname])

  const buildUrlWithSearch = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (value.trim()) params.set('search', value.trim())
    else params.delete('search')
    return `${pathname}?${params.toString()}`
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(buildUrlWithSearch(searchQuery))
  }

  const clearSearch = () => {
    setSearchQuery('')
    router.push(buildUrlWithSearch(''))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar datasets, categorias, palavras-chave..."
            className="block w-full pl-11 pr-10 py-3.5 border border-gray-300 rounded-xl leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition text-sm md:text-base shadow-sm"
          />
          <SearchSuggestionsPopover
            items={suggestions.map((s) => ({ label: s }))}
            highlight={searchQuery}
            catalogContext={pathname?.includes('alfanumericos') ? 'alfanumerico' : 'geoespacial'}
            onSelect={(item) => {
              setSearchQuery(item.label)
              router.push(buildUrlWithSearch(item.label))
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          {!searchQuery && loadingSuggestions && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {searchQuery && loadingSuggestions && (
            <div className="absolute inset-y-0 right-10 pr-2 flex items-center text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>
        <button
          type="submit"
          className="px-6 py-3.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <LineChart className="w-4 h-4" />
          Buscar
        </button>
      </form>
      
      {totalCount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">{totalCount.toLocaleString('pt-BR')}</span>{' '}
              dataset{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
            </p>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Limpar busca
              </button>
            )}
          </div>
          {corrected && (
            <div className="mt-2 text-sm text-gray-600">
              Você quis dizer:{' '}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery(corrected)
                  router.push(buildUrlWithSearch(corrected))
                }}
                className="font-semibold text-green-700 hover:text-green-800 underline"
              >
                {corrected}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
