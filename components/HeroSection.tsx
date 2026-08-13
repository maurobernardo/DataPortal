'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, Loader2, Search, LineChart } from 'lucide-react'
import { SearchSuggestionsPopover } from '@/components/SearchSuggestionsPopover'
import { HERO_TRY_SUGGESTIONS } from '@/lib/portal-search'

type SearchEntry = { label: string; href: string }
type HeroPreviewDataset = {
  id: number
  title: string
  source: string | null
  format: string | null
  views: number
  updatedAt: string | null
  category: string | null
  dataType: 'geoespacial' | 'alfanumerico'
}
type HeroStats = {
  datasets: number
  organizations: number
  downloads: number
  views: number
}

/* ─────────────────────────────────────────────
   Gráfico de barras: visualizações reais dos datasets em destaque.
   Antes disto era uma área com gradiente decorativo sem eixo, sem
   unidade e sem qualquer ligação ao texto — parecia dado, era só
   enfeite. Cada barra aqui é uma contagem real (rótulo numérico por
   cima, ranking como rótulo do eixo X), não uma série temporal
   inventada: o schema do portal não guarda histórico ano-a-ano por
   dataset, só o total acumulado de visualizações.
───────────────────────────────────────────── */
function GraficoVisualizacoes({ datasets }: { datasets: HeroPreviewDataset[] }) {
  const barras = datasets.slice(0, 6)
  const max = Math.max(...barras.map((d) => d.views), 1)

  if (barras.length === 0) return null

  return (
    <div style={{ marginBottom: 'var(--pd-space-4)' }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--pd-ink-500)',
          marginBottom: 10,
        }}
      >
        Visualizações desta semana
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 92 }}>
        {barras.map((d, i) => {
          const altura = Math.max(6, Math.round((d.views / max) * 68))
          return (
            <div
              key={d.id}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 0 }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--pd-ink-500)',
                }}
              >
                {d.views >= 1000 ? `${(d.views / 1000).toFixed(1)}k` : d.views}
              </span>
              <div
                style={{
                  width: '100%',
                  height: altura,
                  borderRadius: 4,
                  background: i === 0 ? 'var(--pd-green-700)' : 'var(--pd-green-100)',
                }}
                aria-hidden
              />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--pd-ink-500)', fontVariantNumeric: 'tabular-nums' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatarDataAtualizacao(iso: string | null): string {
  if (!iso) return 'data desconhecida'
  try {
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return 'data desconhecida'
  }
}

function HeroPreview({ datasets }: { datasets: HeroPreviewDataset[] }) {
  const destaque = datasets[0]
  const ranking = datasets.slice(0, 4)

  if (!destaque) {
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
        <p style={{ fontSize: 'var(--pd-text-sm)', color: 'var(--pd-ink-500)' }}>Nenhum dataset disponível.</p>
      </div>
    )
  }

  const rotuloTipo = destaque.dataType === 'geoespacial' ? 'geoespacial' : 'alfanumérico'
  const apoio = `Dataset ${rotuloTipo}${destaque.category ? ` de ${destaque.category}` : ''}, disponibilizado por ${
    destaque.source || 'o portal'
  }.`

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
      {/* ── Bloco 1: destaque editorial ── */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--pd-green-700)',
            marginBottom: 8,
          }}
        >
          Destaque desta semana
        </p>
        <p
          style={{
            fontSize: 17,
            fontWeight: 700,
            lineHeight: 1.3,
            color: 'var(--pd-ink-900)',
            marginBottom: 6,
          }}
        >
          «{destaque.title}» lidera com{' '}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{destaque.views.toLocaleString('pt-PT')}</span>{' '}
          visualizações
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--pd-ink-500)', marginBottom: 16 }}>{apoio}</p>

        <GraficoVisualizacoes datasets={datasets} />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            paddingTop: 12,
            borderTop: '1px solid var(--pd-ink-100)',
            fontSize: 12,
          }}
        >
          <span style={{ color: 'var(--pd-ink-500)' }}>
            Fonte: {destaque.source || 'Portal de Dados'} · {destaque.format || 'Dados'} · actualizado em{' '}
            {formatarDataAtualizacao(destaque.updatedAt)}
          </span>
          <Link
            href={`/dataset/${destaque.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700,
              fontSize: 12,
              color: 'var(--pd-green-700)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              background: 'var(--pd-green-50)',
              border: '1px solid #CFE3D6',
              borderRadius: 10,
              padding: '8px 14px',
              minHeight: 36,
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--pd-green-100)'
              e.currentTarget.style.borderColor = 'var(--pd-green-700)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--pd-green-50)'
              e.currentTarget.style.borderColor = '#CFE3D6'
            }}
          >
            Ver dataset <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      {/* ── Bloco 2: ranking "mais consultados" ── */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--pd-ink-100)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--pd-ink-900)' }}>Mais consultados esta semana</p>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--pd-ink-500)',
            }}
          >
            Visualizações
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {ranking.map((dataset, i) => (
            <Link
              key={dataset.id}
              href={`/dataset/${dataset.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minHeight: 44,
                padding: '8px 6px',
                borderRadius: 'var(--pd-radius-sm)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--pd-surface-50)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  // --pd-accent-amber (#D4A017) só dá ~2.4:1 sobre branco — falha AA para texto.
                  // #8A6510 é o mesmo tom mais escuro, ~5.3:1, mantém o acento sem falhar contraste.
                  color: i === 0 ? '#8A6510' : 'var(--pd-ink-500)',
                  width: 24,
                  flexShrink: 0,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--pd-ink-900)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dataset.title}
                </p>
                <p style={{ fontSize: 11, color: 'var(--pd-ink-500)', marginTop: 1 }}>
                  {dataset.source || 'Portal de Dados'} · {dataset.format || 'Dados'}
                </p>
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--pd-ink-700)',
                  flexShrink: 0,
                }}
              >
                {dataset.views.toLocaleString('pt-PT')}
              </span>
            </Link>
          ))}
        </div>
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
                  <LineChart className="w-3.5 h-3.5" />
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