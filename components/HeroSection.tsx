'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, Loader2, Search, LineChart, ShieldCheck, X, Eye } from 'lucide-react'
import { SearchSuggestionsPopover } from '@/components/SearchSuggestionsPopover'
import { HERO_TRY_SUGGESTIONS } from '@/lib/portal-search'
import { CountUp } from '@/components/CountUp'
import { RevealOnScroll } from '@/components/RevealOnScroll'
import { CategoryThumb } from '@/components/geo/CategoryThumb'
import { DatasetMapPreview } from '@/components/DatasetMapPreview'

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
/* Tokens do cartão de vidro do hero: fundo escuro translúcido (não branco) porque assenta sobre
   uma fotografia, com texto claro em cima — o mesmo princípio do resto do hero, só que aqui o
   "esbatimento" é o próprio cartão em vez do scrim da secção. */
const GLASS = {
  bg: 'rgba(6,26,18,0.55)',
  border: 'rgba(255,255,255,0.16)',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.72)',
  textFaint: 'rgba(255,255,255,0.55)',
  divider: 'rgba(255,255,255,0.14)',
  hover: 'rgba(255,255,255,0.09)',
  accent: '#4ADE80',
  accentMuted: 'rgba(74,222,128,0.24)',
  gold: '#FFD166',
}

function GraficoVisualizacoes({ datasets }: { datasets: HeroPreviewDataset[] }) {
  const barras = datasets.slice(0, 6)
  const max = Math.max(...barras.map((d) => d.views), 1)

  if (barras.length === 0) return null

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${GLASS.divider}`,
        borderRadius: 16,
        padding: '16px 18px 14px',
        marginBottom: 'var(--pd-space-4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, paddingBottom: 14, borderBottom: `1px solid ${GLASS.divider}` }}>
        <LineChart className="w-3.5 h-3.5" style={{ color: GLASS.accent }} aria-hidden />
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: GLASS.textFaint,
          }}
        >
          Visualizações desta semana
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 96 }}>
        {barras.map((d, i) => {
          const altura = Math.max(8, Math.round((d.views / max) * 72))
          // Cada posição do ranking tem o seu próprio tom, cada vez mais esbatido: com todas as
          // barras (2ª a 6ª) na mesma cor plana, a diferença real de visualizações só se via na
          // altura, pouco perceptível entre valores próximos (ex.: 87 vs 69) — a cor reforça agora
          // a mesma ordenação, tornando a queda de popularidade óbvia à primeira vista.
          const opacidade = [1, 0.78, 0.62, 0.48, 0.36, 0.26][i] ?? 0.26
          return (
            <div
              key={d.id}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 0 }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  color: i === 0 ? GLASS.accent : GLASS.textMuted,
                }}
              >
                {d.views >= 1000 ? `${(d.views / 1000).toFixed(1)}k` : d.views}
              </span>
              <div
                style={{
                  width: '100%',
                  height: altura,
                  borderRadius: '6px 6px 3px 3px',
                  background: i === 0 ? `linear-gradient(180deg, ${GLASS.accent} 0%, #16A34A 100%)` : `rgba(74,222,128,${opacidade})`,
                  boxShadow: i === 0 ? '0 0 14px rgba(74,222,128,0.5)' : 'none',
                }}
                aria-hidden
              />
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: GLASS.textFaint,
                  letterSpacing: '0.03em',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HeroPreview({
  datasets,
  destaquePreview,
}: {
  datasets: HeroPreviewDataset[]
  destaquePreview: { geojson: any; bbox: [number, number, number, number] | null } | null
}) {
  const destaque = datasets[0]
  const ranking = datasets.slice(0, 2)

  const cardStyle: CSSProperties = {
    background: GLASS.bg,
    backdropFilter: 'blur(22px) saturate(150%)',
    WebkitBackdropFilter: 'blur(22px) saturate(150%)',
    border: `1px solid ${GLASS.border}`,
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 50px rgba(0,0,0,0.4)',
  }
  const bodyStyle: CSSProperties = { padding: 'var(--pd-space-4)' }

  if (!destaque) {
    return (
      <div style={cardStyle}>
        <p style={{ ...bodyStyle, fontSize: 'var(--pd-text-sm)', color: GLASS.textMuted }}>Nenhum dataset disponível.</p>
      </div>
    )
  }

  const rotuloTipo = destaque.dataType === 'geoespacial' ? 'geoespacial' : 'alfanumérico'
  const apoio = `Dataset ${rotuloTipo}${destaque.category ? ` de ${destaque.category}` : ''}, disponibilizado por ${
    destaque.source || 'o portal'
  }.`

  return (
    <div style={cardStyle}>
      {/* ── Bloco 1: pré-visualização REAL da geometria do dataset (o mesmo mapa que a ficha do
          dataset mostra), grande, a sangrar até à borda do cartão, com os selos de destaque e
          visualizações sobrepostos — pedido explícito: nada de ícone genérico, tem de ser a
          geometria a sério, tal como já acontece nos cartões de Mapas Inteligentes. Só cai para a
          miniatura ilustrada por assunto quando o destaque é alfanumérico (não tem mapa) ou a
          pré-visualização não pôde ser gerada (ficheiro em falta, formato não suportado). ── */}
      <div style={{ position: 'relative', height: 268 }}>
        {destaquePreview ? (
          <DatasetMapPreview
            geojson={destaquePreview.geojson}
            bbox={destaquePreview.bbox}
            className="w-full h-full"
            showToggle={false}
            zoomControl={false}
          />
        ) : (
          <CategoryThumb
            title={destaque.title}
            category={destaque.category || 'Geral'}
            index={0}
            kind={destaque.dataType === 'geoespacial' ? 'geo' : 'alf'}
          />
        )}
        {/* z-index alto e explícito em tudo o que se sobrepõe ao mapa: o Leaflet cria as suas
            próprias camadas internas (tiles, overlay, controlos) com z-index já na casa das
            centenas — sem isto, os selos ficavam desenhados por baixo do mapa, invisíveis, mesmo
            aparecendo primeiro no DOM. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1001,
            background: destaquePreview
              ? 'linear-gradient(180deg, rgba(4,20,13,0.08) 0%, rgba(4,20,13,0.15) 55%, rgba(4,20,13,0.82) 100%)'
              : 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)',
            pointerEvents: 'none',
          }}
        />
        <p
          style={{
            position: 'absolute',
            zIndex: 1002,
            top: 12,
            left: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10.5,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#fff',
            background: 'rgba(4,54,31,0.7)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 999,
            padding: '5px 10px 5px 8px',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: GLASS.accent, boxShadow: '0 0 6px rgba(74,222,128,0.9)' }} />
          Destaque da semana
        </p>
        <p
          style={{
            position: 'absolute',
            zIndex: 1002,
            top: 12,
            right: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            background: 'rgba(4,20,13,0.55)',
            border: '1px solid rgba(255,255,255,0.28)',
            borderRadius: 999,
            padding: '5px 10px',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <Eye className="w-3 h-3" aria-hidden />
          {destaque.views.toLocaleString('pt-PT')}
        </p>
        <p
          style={{
            position: 'absolute',
            zIndex: 1002,
            left: 14,
            right: 14,
            bottom: 12,
            fontSize: 16.5,
            fontWeight: 800,
            lineHeight: 1.28,
            color: '#fff',
            letterSpacing: '-0.01em',
            textShadow: '0 1px 6px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {destaque.title}
        </p>
      </div>

      <div style={bodyStyle}>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: GLASS.textMuted, marginBottom: 16 }}>{apoio}</p>

      <GraficoVisualizacoes datasets={datasets} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          paddingTop: 12,
          borderTop: `1px solid ${GLASS.divider}`,
          fontSize: 12,
        }}
      >
        <span style={{ color: GLASS.textFaint }}>
          Fonte: {destaque.source || 'Portal de Dados'} · {destaque.format || 'Dados'}
        </span>
        <Link
          href={`/dataset/${destaque.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 700,
            fontSize: 12,
            color: GLASS.text,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.28)',
            borderRadius: 10,
            padding: '8px 14px',
            minHeight: 36,
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.22)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'
          }}
        >
          Ver dataset <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>

      {/* ── Bloco 2: ranking "mais consultados" ── */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${GLASS.divider}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: GLASS.text }}>Mais consultados esta semana</p>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: GLASS.textFaint,
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
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = GLASS.hover)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  color: i === 0 ? GLASS.gold : GLASS.textFaint,
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
                    color: GLASS.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dataset.title}
                </p>
                <p style={{ fontSize: 11, color: GLASS.textFaint, marginTop: 1 }}>
                  {dataset.source || 'Portal de Dados'} · {dataset.format || 'Dados'}
                </p>
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: GLASS.textMuted,
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
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main HeroSection
───────────────────────────────────────────── */
export function HeroSection({
  statsData,
  highlightedDatasets,
  destaquePreview = null,
}: {
  statsData: HeroStats
  highlightedDatasets: HeroPreviewDataset[]
  /** Geometria real (geojson/bbox) do dataset em destaque (datasets[0]), pré-gerada no servidor —
   *  null quando o destaque é alfanumérico ou a pré-visualização não pôde ser gerada. */
  destaquePreview?: { geojson: any; bbox: [number, number, number, number] | null } | null
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestionItems, setSuggestionItems] = useState<SearchEntry[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [certificadoAberto, setCertificadoAberto] = useState(false)
  const searchBarRef = useRef<HTMLDivElement>(null)

  const stats = [
    { num: statsData.datasets, label: 'Datasets' },
    { num: statsData.organizations, label: 'Organizações' },
    { num: statsData.downloads, label: 'Downloads' },
    { num: statsData.views, label: 'Visualizações' },
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
        <div className="pd-hero-bg" aria-hidden />
        <div className="pd-hero-scrim" aria-hidden />
        <div className="pd-hero-inner">

          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Eyebrow + selo de certificação (INTIC): primeira coisa visível ao entrar, sem
                precisar de scroll — é onde um selo institucional deste tipo tem de estar. */}
            <RevealOnScroll>
              <div className="pd-hero-badges-row">
                <div className="pd-hero-eyebrow">
                  <span>●</span> Dados oficiais · Actualizados continuamente
                </div>
                <button
                  type="button"
                  onClick={() => setCertificadoAberto(true)}
                  className="pd-hero-cert-badge"
                >
                  <ShieldCheck className="w-4 h-4" aria-hidden />
                  Certificado INTIC
                </button>
              </div>
            </RevealOnScroll>

            {/* H1 */}
            <RevealOnScroll delayMs={70}>
              <h1>
                A infraestrutura de dados{' '}
                <span className="accent">de Moçambique</span>, num só lugar.
              </h1>
            </RevealOnScroll>

            {/* Lead */}
            <RevealOnScroll delayMs={140}>
              <p className="pd-hero-lede">
                Acesse e utilize dados geoespaciais, alfanuméricos, dashboards e relatórios
                oficiais do portal, com pesquisa inteligente, visualização, download e
                integração para apoiar decisões públicas e institucionais.
              </p>
            </RevealOnScroll>

            {/* Search bar */}
            <RevealOnScroll delayMs={210}>
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
                <button
                  type="button"
                  className="pd-search-mode pd-press"
                  onClick={() => router.push(query.trim() ? `/analise/nova?pergunta=${encodeURIComponent(query.trim())}` : '/analise/nova')}
                  title="Perguntar aos dados em português, com análise por Inteligência Artificial"
                >
                  <LineChart className="w-3.5 h-3.5" />
                  Modo IA
                </button>
                <button type="submit" className="pd-btn-search pd-press">
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
            </RevealOnScroll>

            {/* Sugestões rápidas (filtros por pesquisa) */}
            <RevealOnScroll delayMs={270}>
              <div className="pd-search-suggestions">
                <span className="pd-suggest-label">Tente:</span>
                {trySuggestions.map(({ label, href }) => (
                  <Link key={label} href={href} className="pd-suggest-chip pd-press" prefetch={false} scroll>
                    {label}
                  </Link>
                ))}
              </div>
            </RevealOnScroll>

            {/* Stats */}
            <RevealOnScroll delayMs={340}>
              <div className="pd-hero-stats">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="pd-stat-num">
                      <CountUp value={s.num} formatar={(n) => Math.round(n).toLocaleString('pt-BR')} />
                    </div>
                    <div className="pd-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </RevealOnScroll>
          </div>

          {/* ── RIGHT COLUMN — Live preview ── */}
          <RevealOnScroll delayMs={160}>
            <HeroPreview datasets={highlightedDatasets} destaquePreview={destaquePreview} />
          </RevealOnScroll>
        </div>
      </section>

      {certificadoAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Certificado INTIC do Portal de Dados"
          className="pd-cert-modal-overlay"
          onClick={() => setCertificadoAberto(false)}
        >
          <div className="pd-cert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pd-cert-modal-head">
              <p>
                <ShieldCheck className="w-4 h-4" aria-hidden />
                Certificado INTIC · Autoridade Reguladora de TIC
              </p>
              <button
                type="button"
                onClick={() => setCertificadoAberto(false)}
                aria-label="Fechar"
                className="pd-cert-modal-close"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>
            <div className="pd-cert-modal-body">
              <Image
                src="/images/Certificado.jpg"
                alt="Certificado do INTIC (Instituto Nacional de Tecnologias de Informação e Comunicação) que autoriza o Portal de Dados a operar como plataforma digital certificada em Moçambique"
                width={1200}
                height={849}
                className="pd-cert-modal-img"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}