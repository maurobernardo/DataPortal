'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'
import { SearchSuggestionsPopover } from '@/components/SearchSuggestionsPopover'

export function AlfCatalogToolbar({
  initialSearch,
  sortOrder,
}: {
  initialSearch?: string
  sortOrder?: string
}) {
  const [searchQuery, setSearchQuery] = useState(initialSearch || '')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    setSearchQuery(initialSearch || '')
  }, [initialSearch])

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    const timeout = setTimeout(async () => {
      try {
        setLoadingSuggestions(true)
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(q)}&dataType=alfanumerico`
        )
        const data = await res.json()
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : [])
      } catch {
        setSuggestions([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, 220)
    return () => clearTimeout(timeout)
  }, [searchQuery])

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

  const onSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (!value) params.delete('sortOrder')
    else params.set('sortOrder', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  const currentSort = sortOrder === 'newest' ? 'newest' : sortOrder === 'oldest' ? 'oldest' : ''

  return (
    <form className="geo-ch-toolbar" onSubmit={handleSearch}>
      <div className="geo-ch-search-wrap" ref={searchWrapRef}>
        <div className="geo-ch-search">
          <Search className="shrink-0 text-[var(--pd-ink-300)]" size={18} aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Procurar datasets…"
            aria-label="Pesquisar dados alfanuméricos"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                router.push(buildUrlWithSearch(''))
              }}
              className="shrink-0 text-[var(--pd-ink-300)] hover:text-[var(--pd-ink-700)]"
              aria-label="Limpar pesquisa"
            >
              <X size={18} />
            </button>
          ) : loadingSuggestions ? (
            <Loader2 className="shrink-0 animate-spin text-[var(--pd-ink-300)]" size={16} aria-hidden />
          ) : null}
        </div>
        <SearchSuggestionsPopover
          items={suggestions.map((s) => ({ label: s }))}
          highlight={searchQuery}
          catalogContext="alfanumerico"
          useFixedPortal
          anchorRef={searchWrapRef}
          onSelect={(item) => {
            setSearchQuery(item.label)
            router.push(buildUrlWithSearch(item.label))
          }}
        />
      </div>

      <div className="geo-toolbar-actions">
        <select
          className="geo-sort-select"
          value={currentSort}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="Ordenar resultados"
        >
          <option value="">Popularidade</option>
          <option value="newest">Mais recentes</option>
          <option value="oldest">Mais antigos</option>
        </select>
        <button type="submit" className="geo-btn-search">
          Pesquisar
        </button>
      </div>
    </form>
  )
}
