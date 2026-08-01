'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2, Search, Sparkles } from 'lucide-react'
import { SearchSuggestionsPopover } from '@/components/SearchSuggestionsPopover'
import { HERO_TRY_SUGGESTIONS } from '@/lib/portal-search'

type SearchEntry = { label: string; href: string }
type HeroPreviewDataset = {
  id: number
  title: string
  source: string | null
  format: string | null
  views: number
}
type HeroStats = {
  datasets: number
  organizations: number
  downloads: number
  views: number
}

/* ─────────────────────────────────────────────
   Inline mini-chart (SVG sparkline from HTML)
───────────────────────────────────────────── */
function MiniChart({ points }: { points: number[] }) {
  const safePoints = points.length > 1 ? points : [10, 20, 15, 25, 30]
  const max = Math.max(...safePoints, 1)
  const step = 400 / (safePoints.length - 1)
  const chartPoints = safePoints
    .map((value, index) => {
      const x = Math.round(index * step)
      const y = Math.round(120 - (value / max) * 100)
      return `${x},${y}`
    })
    .join(' L')
  const areaPath = `M${chartPoints} L400,140 L0,140 Z`
  const linePath = `M${chartPoints}`
  const highlightIndex = Math.max(0, safePoints.length - 1)
  const highlightX = Math.round(highlightIndex * step)
  const highlightY = Math.round(120 - (safePoints[highlightIndex] / max) * 100)

  return (
    <div
      style={{
        height: 140,
        background: 'linear-gradient(180deg, var(--pd-green-50), transparent)',
        borderRadius: 'var(--pd-radius-md)',
        overflow: 'hidden',
        marginBottom: 'var(--pd-space-3)',
        position: 'relative',
      }}
    >
      <svg
        viewBox="0 0 400 140"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id="pd-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#064E2C" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#064E2C" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={areaPath}
          fill="url(#pd-grad)"
        />
        <path
          d={linePath}
          fill="none"
          stroke="#064E2C"
          strokeWidth="2.5"
        />
        <circle cx={highlightX} cy={highlightY} r="4" fill="#064E2C" />
        <circle cx={highlightX} cy={highlightY} r="8" fill="#064E2C" opacity="0.2" />
      </svg>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Tag badge helpers
───────────────────────────────────────────── */
function TagLive({ children = 'Dados reais' }: { children?: string }) {
  return (
    <span
      style={{
        background: 'var(--pd-green-100)',
        color: 'var(--pd-green-900)',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </span>
  )
}
function HeroPreview({ datasets }: { datasets: HeroPreviewDataset[] }) {
  const previewRows = datasets.slice(0, 4).map((dataset) => ({
    id: dataset.id,
    title: dataset.title,
    meta: `${dataset.source || 'Portal de Dados'} · ${dataset.format || 'Dataset'} · ${dataset.views.toLocaleString('pt-BR')} visualizações`,
  }))
  const chartPoints = datasets.slice(0, 8).map((dataset) => dataset.views || 0)

  return (
    <div
      style={{
        background: 'var(--pd-surface-0)',
        border: '1px solid var(--pd-ink-100)',
        borderRadius: 'var(--pd-radius-xl)',
        padding: 'var(--pd-space-4)',
        boxShadow: 'var(--pd-shadow-lg)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px 12px',
          borderBottom: '1px solid var(--pd-ink-100)',
          marginBottom: 'var(--pd-space-3)',
        }}
      >
        <div>
          <div style={{ fontSize: 'var(--pd-text-sm)', fontWeight: 600 }}>Em destaque hoje</div>
          <div style={{ fontSize: 'var(--pd-text-xs)', color: 'var(--pd-ink-300)' }}>
            {previewRows[0]?.title || 'Nenhum dataset disponível'}
          </div>
        </div>
        <TagLive>● Dados reais</TagLive>
      </div>

      <MiniChart points={chartPoints} />

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pd-space-2)' }}>
        {previewRows.map((row) => (
          <Link
            key={row.id}
            href={`/dataset/${row.id}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: 'var(--pd-radius-sm)',
              fontSize: 'var(--pd-text-sm)',
              cursor: 'default',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--pd-surface-50)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')
            }
          >
            <div>
              <strong style={{ fontWeight: 600 }}>{row.title}</strong>
              <span
                style={{
                  display: 'block',
                  color: 'var(--pd-ink-300)',
                  fontSize: 'var(--pd-text-xs)',
                  marginTop: 2,
                }}
              >
                {row.meta}
              </span>
            </div>
            <TagLive>Dataset</TagLive>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main HeroSection
───────────────────────────────────────────── */
export function HeroSection({
  statsData,
  highlightedDatasets,
}: {
  statsData: HeroStats
  highlightedDatasets: HeroPreviewDataset[]
}) {
  const [query, setQuery] = useState('')
  const [suggestionItems, setSuggestionItems] = useState<SearchEntry[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const searchBarRef = useRef<HTMLDivElement>(null)

  const stats = [
    { num: statsData.datasets.toLocaleString('pt-BR'), label: 'Datasets' },
    { num: statsData.organizations.toLocaleString('pt-BR'), label: 'Organizações' },
    { num: statsData.downloads.toLocaleString('pt-BR'), label: 'Downloads' },
    { num: statsData.views.toLocaleString('pt-BR'), label: 'Visualizações' },
  ]

  const trySuggestions = HERO_TRY_SUGGESTIONS

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setSuggestionItems([])
      return
    }
    const timeout = setTimeout(async () => {
      try {
        setLoadingSuggestions(true)
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (Array.isArray(data?.entries) && data.entries.length > 0) {
          setSuggestionItems(
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
          const strings: string[] = Array.isArray(data?.suggestions) ? data.suggestions : []
          setSuggestionItems(
            strings.map((s) => ({
              label: s,
              href: `/catalogo?search=${encodeURIComponent(s)}`,
            }))
          )
        }
      } catch {
        setSuggestionItems([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, 220)
    return () => clearTimeout(timeout)
  }, [query])

  return (
    <>
      <section className="pd-hero">
        <div className="pd-hero-inner">

          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Eyebrow */}
            <div className="pd-hero-eyebrow">
              <span>●</span> Dados oficiais · Actualizados continuamente
            </div>

            {/* H1 */}
            <h1>
              A infraestrutura de dados{' '}
              <span className="accent">de Moçambique</span>, num só lugar.
            </h1>

            {/* Lead */}
            <p className="pd-hero-lede">
              Acesse e utilize dados geoespaciais, alfanuméricos, dashboards e relatórios
              oficiais do portal, com pesquisa inteligente, visualização, download e
              integração para apoiar decisões públicas e institucionais.
            </p>

            {/* Search bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!query.trim()) return
                window.location.href = `/catalogo?search=${encodeURIComponent(query.trim())}`
              }}
            >
              <div className="pd-hero-search" ref={searchBarRef}>
                <span className="pd-hero-search-icon">
                  <Search className="w-[18px] h-[18px]" />
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Datasets, dashboards, mapas analíticos, relatórios…"
                />
                {loadingSuggestions && (
                  <Loader2
                    style={{
                      width: 16,
                      height: 16,
                      color: 'var(--pd-ink-300)',
                      flexShrink: 0,
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                )}
                <button type="button" className="pd-search-mode">
                  <Sparkles className="w-3.5 h-3.5" />
                  Modo IA
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button type="submit" className="pd-btn-search">
                  Procurar
                </button>
              </div>

              <SearchSuggestionsPopover
                useFixedPortal
                anchorRef={searchBarRef}
                items={suggestionItems}
                highlight={query}
                onSelect={(item) => {
                  if (item.href) window.location.href = item.href
                }}
              />
            </form>

            {/* Sugestões rápidas (filtros por pesquisa) */}
            <div className="pd-search-suggestions">
              <span className="pd-suggest-label">Tente:</span>
              {trySuggestions.map(({ label, href }) => (
                <Link key={label} href={href} className="pd-suggest-chip" prefetch={false} scroll>
                  {label}
                </Link>
              ))}
            </div>

            {/* Stats */}
            <div className="pd-hero-stats">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="pd-stat-num">{s.num}</div>
                  <div className="pd-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN — Live preview ── */}
          <HeroPreview datasets={highlightedDatasets} />
        </div>
      </section>
    </>
  )
}