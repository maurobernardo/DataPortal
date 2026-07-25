'use client'

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles,
  ChevronRight,
  Map,
  Table2,
  LayoutGrid,
  BarChart3,
  FileText,
  MapPinned,
  type LucideIcon,
} from 'lucide-react'

export type SearchSuggestionItem = { label: string; href?: string }

type CatalogContext = 'geoespacial' | 'alfanumerico'

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function HighlightedLabel({ label, q }: { label: string; q: string }) {
  const needle = q.trim().toLowerCase()
  if (!needle || needle.length < 2) {
    return <span className="font-semibold text-gray-900">{label}</span>
  }
  const parts = label.split(new RegExp(`(${escapeRegex(needle)})`, 'gi'))
  return (
    <span className="font-semibold text-gray-900">
      {parts.map((part, i) =>
        part.toLowerCase() === needle ? (
          <mark key={i} className="rounded bg-yellow-200/95 px-0.5 text-gray-900">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}

function metaFor(item: SearchSuggestionItem, catalogContext: CatalogContext): { Icon: LucideIcon; badge: string; badgeClass: string } {
  if (item.href) {
    if (item.href.startsWith('/maps/')) {
      return {
        Icon: MapPinned,
        badge: 'Mapa & dashboard',
        badgeClass: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400/60',
      }
    }
    if (item.href.includes('/maps')) {
      return {
        Icon: MapPinned,
        badge: 'Mapas',
        badgeClass: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400/60',
      }
    }
    if (item.href.includes('dashboards-alfanumericos')) {
      return {
        Icon: BarChart3,
        badge: 'Dashboard',
        badgeClass: 'bg-teal-100 text-teal-900 ring-1 ring-teal-300/70',
      }
    }
    if (item.href.includes('/relatorios')) {
      return {
        Icon: FileText,
        badge: 'Relatório',
        badgeClass: 'bg-slate-100 text-slate-800 ring-1 ring-slate-300/70',
      }
    }
    if (item.href.includes('dados-alfanumericos')) {
      return {
        Icon: Table2,
        badge: 'Alfanumérico',
        badgeClass: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300/70',
      }
    }
    if (item.href.includes('dados-espaciais')) {
      return {
        Icon: Map,
        badge: 'Geoespacial',
        badgeClass: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/70',
      }
    }
    return {
      Icon: LayoutGrid,
      badge: 'Catálogo',
      badgeClass: 'bg-violet-100 text-violet-900 ring-1 ring-violet-300/70',
    }
  }
  if (catalogContext === 'alfanumerico') {
    return {
      Icon: Table2,
      badge: 'Alfanumérico',
      badgeClass: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300/70',
    }
  }
  return {
    Icon: Map,
    badge: 'Geoespacial',
    badgeClass: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/70',
  }
}

interface SearchSuggestionsPopoverProps {
  items: SearchSuggestionItem[]
  onSelect: (item: SearchSuggestionItem) => void
  catalogContext?: CatalogContext
  highlight?: string
  /** Ancorar ao viewport via portal (evita corte por overflow / secções seguintes na home). */
  useFixedPortal?: boolean
  anchorRef?: RefObject<HTMLElement | null>
}

export function SearchSuggestionsPopover({
  items,
  onSelect,
  catalogContext = 'geoespacial',
  highlight = '',
  useFixedPortal = false,
  anchorRef,
}: SearchSuggestionsPopoverProps) {
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updateCoords = useCallback(() => {
    if (!useFixedPortal || !anchorRef?.current) return
    const r = anchorRef.current.getBoundingClientRect()
    setCoords({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 280) })
  }, [useFixedPortal, anchorRef])

  useLayoutEffect(() => {
    if (!useFixedPortal || items.length === 0) {
      setCoords(null)
      return
    }
    updateCoords()
    window.addEventListener('scroll', updateCoords, true)
    window.addEventListener('resize', updateCoords)
    return () => {
      window.removeEventListener('scroll', updateCoords, true)
      window.removeEventListener('resize', updateCoords)
    }
  }, [useFixedPortal, items.length, updateCoords])

  if (items.length === 0) return null

  const panelInner = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-green-100 bg-gradient-to-r from-green-600 via-green-600 to-emerald-600 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-white" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-wide text-white">Sugestões</span>
        </div>
        <span className="hidden text-[10px] font-medium text-white/90 sm:inline">Toque num resultado</span>
      </div>
      <ul className="max-h-[min(70vh,320px)] divide-y divide-gray-100 overflow-y-auto p-1.5">
        {items.map((item, i) => {
          const { Icon, badge, badgeClass } = metaFor(item, catalogContext)
          return (
            <li key={`${item.label}-${item.href ?? ''}-${i}`}>
              <button
                type="button"
                role="option"
                onClick={() => onSelect(item)}
                className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50 hover:to-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-100 to-emerald-50 text-green-700 shadow-inner ring-1 ring-green-200/60 transition-transform duration-200 group-hover:scale-105 group-hover:from-green-200 group-hover:to-emerald-100">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`mb-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
                    {badge}
                  </span>
                  <span className="block leading-snug">
                    <HighlightedLabel label={item.label} q={highlight} />
                  </span>
                  <span className="mt-0.5 block text-[11px] font-medium text-green-700/90">
                    Ver resultados →
                  </span>
                </span>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-green-600 opacity-50 transition duration-200 group-hover:translate-x-1 group-hover:opacity-100"
                  aria-hidden
                />
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )

  const shellClass =
    'overflow-hidden rounded-2xl border-2 border-green-200/90 bg-white shadow-2xl shadow-green-900/10 ring-1 ring-green-500/15'

  if (useFixedPortal && mounted && typeof document !== 'undefined' && coords) {
    return createPortal(
      <div
        className={shellClass}
        style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          width: coords.width,
          zIndex: 9999,
        }}
        role="listbox"
        aria-label="Sugestões de pesquisa"
      >
        {panelInner}
      </div>,
      document.body
    )
  }

  if (useFixedPortal) {
    return null
  }

  return (
    <div
      className={`absolute z-[100] mt-2 w-full ${shellClass}`}
      role="listbox"
      aria-label="Sugestões de pesquisa"
    >
      {panelInner}
    </div>
  )
}
