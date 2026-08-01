'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  BarChart3,
  Database,
  FileText,
  Loader2,
  Map,
  MapPinned,
  Search,
  Sparkles,
} from 'lucide-react'
import { SearchSuggestionsPopover } from '@/components/SearchSuggestionsPopover'
import { HERO_TRY_SUGGESTIONS } from '@/lib/portal-search'

type SearchEntry = { label: string; href: string }

const MODULE_LINKS = [
  { href: '/dados-espaciais', label: 'Geoespaciais', icon: Map, desc: 'Camadas e datasets espaciais' },
  { href: '/dados-alfanumericos', label: 'Alfanuméricos', icon: Database, desc: 'Tabelas e indicadores' },
  { href: '/dashboards-alfanumericos', label: 'Dashboards', icon: BarChart3, desc: 'Painéis interactivos' },
  { href: '/maps', label: 'Mapas analíticos', icon: MapPinned, desc: 'Mapa + KPIs e filtros' },
  { href: '/relatorios', label: 'Relatórios', icon: FileText, desc: 'Estudos e publicações' },
] as const

const EXAMPLE_PROMPTS = [
  'mapa de saúde por província',
  'dashboard indicadores',
  'aeroportos nacionais',
  'diagnóstico rede de postes',
  'relatório cobertura vacinal',
]

export function AIInsightsWorkspace() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchEntry[]>([])
  const [loading, setLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    const t = setTimeout(async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (Array.isArray(data?.entries) && data.entries.length > 0) {
          setSuggestions(
            data.entries
              .filter(
                (e: unknown) =>
                  e &&
                  typeof (e as SearchEntry).label === 'string' &&
                  typeof (e as SearchEntry).href === 'string'
              )
              .map((e: SearchEntry) => ({ label: e.label, href: e.href }))
          )
        } else {
          setSuggestions([])
        }
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => clearTimeout(t)
  }, [query])

  const runSearch = (text: string) => {
    const q = text.trim()
    if (!q) return
    window.location.href = `/catalogo?search=${encodeURIComponent(q)}`
  }

  return (
    <section className="font-body-stack border-b border-[#E2E8E5] bg-gradient-to-b from-[#f8faf8] to-white py-10 md:py-14">
      <div className="ai-section-inner">
        <div className="max-w-3xl mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-3 py-1 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#6B4FBB]" aria-hidden />
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#064E2C]">
              Assistente de descoberta
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            Encontre dados, mapas e dashboards
          </h1>
          <p className="text-[15px] text-gray-600 leading-relaxed">
            Pesquise em linguagem natural no catálogo do portal. Os resultados ligam directamente a
            datasets, mapas analíticos, dashboards alfanuméricos e relatórios, já disponíveis hoje.
            Análise generativa avançada chega numa fase seguinte.
          </p>
        </div>

        <form
          className="relative mb-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (suggestions[0]?.href) {
              window.location.href = suggestions[0].href
              return
            }
            runSearch(query)
          }}
        >
          <div
            ref={searchRef}
            className="flex items-center gap-2 rounded-xl border-2 border-[#CFE3D6] bg-white px-3 py-2 shadow-sm focus-within:border-[#064E2C] focus-within:ring-2 focus-within:ring-[#064E2C]/15"
          >
            <Search className="w-5 h-5 shrink-0 text-[#064E2C]" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex.: saúde, postes, dashboard, relatório…"
              className="flex-1 min-w-0 border-0 bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
              autoComplete="off"
            />
            {loading ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin text-gray-400" aria-hidden />
            ) : null}
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-[#064E2C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#04361F] transition-colors"
            >
              Procurar
            </button>
          </div>
          <SearchSuggestionsPopover
            useFixedPortal
            anchorRef={searchRef}
            items={suggestions}
            highlight={query}
            onSelect={(item) => {
              if (item.href) window.location.href = item.href
            }}
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 mb-10">
          <span className="text-xs font-semibold text-gray-500">Exemplos:</span>
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setQuery(p)}
              className="rounded-full border border-[#E2E8E5] bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-[#064E2C] hover:text-[#064E2C] transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {MODULE_LINKS.map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-3 rounded-xl border border-[#E2E8E5] bg-white p-4 shadow-sm hover:border-[#CFE3D6] hover:shadow-md transition-all"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F8F4] text-[#064E2C] group-hover:bg-[#E7F3EB]">
                <Icon className="w-5 h-5" strokeWidth={2} />
              </span>
              <span>
                <span className="block text-sm font-bold text-gray-900 group-hover:text-[#064E2C]">
                  {label}
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="rounded-xl border border-[#E2E8E5] bg-[#FAFBFA] px-4 py-3 text-sm text-gray-600">
          <strong className="text-gray-800">Atalhos rápidos:</strong>{' '}
          {HERO_TRY_SUGGESTIONS.slice(0, 4).map((s, i) => (
            <span key={s.label}>
              {i > 0 ? ' · ' : ''}
              <Link href={s.href} className="font-medium text-[#064E2C] hover:underline">
                {s.label}
              </Link>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
