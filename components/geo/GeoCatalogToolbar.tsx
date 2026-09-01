'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'
import { SearchSuggestionsPopover, type SearchSuggestionItem } from '@/components/SearchSuggestionsPopover'

export function GeoCatalogToolbar({
  initialSearch,
  sortOrder,
}: {
  initialSearch?: string
  sortOrder?: string
}) {
  const [searchQuery, setSearchQuery] = useState(initialSearch || '')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [sugestoesInteligentes, setSugestoesInteligentes] = useState<SearchSuggestionItem[]>([])
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
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}&dataType=geoespacial`)
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

  // Busca inteligente (PLANO-INTELIGENCIA-PORTAL.md): em vez de um botão à parte que ninguém
  // notava, entra directamente no mesmo campo — aparece como um grupo extra dentro das mesmas
  // sugestões, um pouco mais devagar (500ms) que a busca literal, porque custa uma chamada ao
  // modelo. Silenciosa se falhar (ex.: sem sessão iniciada): a busca por palavra-chave continua
  // a funcionar na mesma, isto é só um extra.
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 4) {
      setSugestoesInteligentes([])
      return
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch('/api/search/semantico', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pergunta: q }),
        })
        if (!res.ok) { setSugestoesInteligentes([]); return }
        const data = await res.json()
        const datasets = Array.isArray(data?.datasets) ? data.datasets : []
        setSugestoesInteligentes(
          datasets.map((d: any) => ({
            label: d.title,
            href: `/dataset/${d.id}`,
            kind: 'semantico' as const,
            note: d.motivo,
          }))
        )
      } catch {
        setSugestoesInteligentes([])
      }
    }, 500)
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
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Procurar camadas…"
            aria-label="Pesquisar camadas geoespaciais"
            autoComplete="off"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                router.push(buildUrlWithSearch(''))
              }}
              className="geo-ch-search-clear"
              aria-label="Limpar pesquisa"
            >
              <X size={14} />
            </button>
          ) : loadingSuggestions ? (
            <Loader2 className="shrink-0 animate-spin text-[var(--pd-ink-300)]" size={16} aria-hidden />
          ) : null}
        </div>
        <SearchSuggestionsPopover
          items={[...suggestions.map((s) => ({ label: s })), ...sugestoesInteligentes]}
          highlight={searchQuery}
          catalogContext="geoespacial"
          useFixedPortal
          anchorRef={searchWrapRef}
          onSelect={(item) => {
            if (item.href) {
              router.push(item.href)
              return
            }
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
