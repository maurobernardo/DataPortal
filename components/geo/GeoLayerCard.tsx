'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  Check,
  Database,
  Eye,
  FileText,
  Package,
  LineChart,
  BarChart3,
  BadgeCheck,
} from 'lucide-react'
import type { GeoDataset } from '@/components/geo/types'
import { CategoryThumb } from '@/components/geo/CategoryThumb'
import { getPopularityTier } from '@/components/geo/geo-utils'
import { FavoriteButton } from '@/components/FavoriteButton'

const formatChipClass: Record<string, string> = {
  SHP: 'bg-[var(--pd-green-50)] text-[var(--pd-green-900)] border-[#CFE3D6]',
  GeoJSON: 'bg-[var(--pd-green-50)] text-[var(--pd-green-900)] border-[#CFE3D6]',
  GPKG: 'bg-[var(--pd-surface-100)] text-[var(--pd-ink-700)] border-[var(--pd-ink-100)]',
  CSV: 'bg-[var(--pd-surface-100)] text-[var(--pd-ink-700)] border-[var(--pd-ink-100)]',
  KML: 'bg-[var(--pd-surface-100)] text-[var(--pd-ink-700)] border-[var(--pd-ink-100)]',
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function HighlightedText({ text, query }: { text: string; query?: string }) {
  const q = (query || '').trim()
  if (!q) return <>{text}</>
  const parts = text.split(new RegExp(`(${escapeRegex(q)})`, 'ig'))
  return (
    <>
      {parts.map((part, idx) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={idx} className="rounded bg-yellow-200/80 px-0.5">
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        )
      )}
    </>
  )
}

export function GeoLayerCard({
  dataset,
  index,
  selected,
  onSelect,
  highlight,
  thumbVariant = 'geo',
  selectLabel = 'Pré-visualizar camada',
  isFavorited = false,
  bestMatch = false,
  selectionMode = false,
  checked = false,
  onToggleCheck,
}: {
  dataset: GeoDataset
  index: number
  selected: boolean
  onSelect: () => void
  highlight?: string
  thumbVariant?: 'geo' | 'alf'
  selectLabel?: string
  isFavorited?: boolean
  bestMatch?: boolean
  selectionMode?: boolean
  checked?: boolean
  onToggleCheck?: () => void
}) {
  const keywords = dataset.keywords?.split(',').slice(0, 3).map((k) => k.trim()).filter(Boolean) ?? []
  const popularityTier = getPopularityTier(dataset.views)
  const formatClass =
    formatChipClass[dataset.format] ??
    'bg-[var(--pd-surface-100)] text-[var(--pd-ink-700)] border-[var(--pd-ink-100)]'

  return (
    <article className={`geo-layer-card${selected ? ' selected' : ''}${checked ? ' batch-checked' : ''}`}>
      {selectionMode && (
        <button
          type="button"
          className={`geo-layer-batch-checkbox${checked ? ' checked' : ''}`}
          aria-pressed={checked}
          aria-label={checked ? 'Remover da seleção' : 'Adicionar à seleção'}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleCheck?.()
          }}
        >
          {checked && <Check className="size-3.5" aria-hidden />}
        </button>
      )}
      <button
        type="button"
        className="geo-layer-card-main"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${selectLabel}: ${dataset.title}`}
      >
        <div className="geo-layer-thumb">
          <CategoryThumb
            title={dataset.title}
            keywords={dataset.keywords || ''}
            category={dataset.category.name}
            index={index}
            kind={thumbVariant}
          />
          <span className="geo-layer-thumb-format z-10">{dataset.format}</span>
          {popularityTier && (
            <span className={`geo-layer-popular geo-layer-popular--${popularityTier.key} z-10`}>
              <popularityTier.icon className="size-3" aria-hidden />
              {popularityTier.label}
            </span>
          )}
        </div>

        <div className="geo-layer-body">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="geo-layer-category">{dataset.category.name}</span>
            {dataset.certificacao === 'fonte_oficial_confirmada' && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-[10px] font-bold"
                title="Fonte oficial confirmada por um administrador do portal"
              >
                <BadgeCheck className="size-3" aria-hidden />
                Fonte confirmada
              </span>
            )}
          </div>

          <h3 className="geo-layer-name">
            <HighlightedText text={dataset.title} query={highlight} />
          </h3>

          <p className="geo-layer-desc">
            <HighlightedText text={dataset.description || 'Sem descrição disponível.'} query={highlight} />
          </p>

          {keywords.length > 0 && (
            <div className="geo-layer-keywords">
              {keywords.map((keyword) => (
                <span key={keyword} className="geo-layer-keyword">
                  <FileText className="size-3 opacity-60" aria-hidden />
                  {keyword}
                </span>
              ))}
            </div>
          )}

          <div className="geo-layer-meta-grid">
            <div className="geo-layer-meta-item">
              <Database className="size-3.5 text-[var(--pd-green-700)]" aria-hidden />
              <div>
                <span className="geo-layer-meta-label">Fonte</span>
                <span className="geo-layer-meta-value truncate">{dataset.source || 'N/D'}</span>
              </div>
            </div>
            <div className="geo-layer-meta-item">
              <Calendar className="size-3.5 text-[var(--pd-green-700)]" aria-hidden />
              <div>
                <span className="geo-layer-meta-label">Ano</span>
                <span className="geo-layer-meta-value">{dataset.year || 'N/D'}</span>
              </div>
            </div>
            <div className="geo-layer-meta-item">
              <Package className="size-3.5 text-[var(--pd-green-700)]" aria-hidden />
              <div>
                <span className="geo-layer-meta-label">Formato</span>
                <span className={`geo-layer-format-badge ${formatClass}`}>{dataset.format}</span>
              </div>
            </div>
            <div className="geo-layer-meta-item">
              <Eye className="size-3.5 text-[var(--pd-green-700)]" aria-hidden />
              <div>
                <span className="geo-layer-meta-label">Visualizações</span>
                <span className="geo-layer-meta-value">{dataset.views.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      </button>

      {bestMatch && (
        <span className="geo-layer-best-match">
          <LineChart className="size-3" aria-hidden />
          Melhor correspondência
        </span>
      )}

      <div className="geo-layer-footer">
        <span className="geo-layer-downloads">↓ {dataset.downloads.toLocaleString('pt-BR')} downloads</span>
        <div className="geo-layer-footer-actions">
          <FavoriteButton datasetId={dataset.id} initialFavorited={isFavorited} />
          <Link
            href={`/analise/nova?datasets=${dataset.id}`}
            className="geo-layer-details-btn geo-layer-analyse-btn"
            onClick={(e) => e.stopPropagation()}
            title="Abrir este dataset já seleccionado no AI Insights (precisa de sessão iniciada)"
          >
            Analisar
            <BarChart3 className="size-4" aria-hidden />
          </Link>
          <Link
            href={`/dataset/${dataset.id}`}
            className="geo-layer-details-btn"
            onClick={(e) => e.stopPropagation()}
          >
            Ver detalhes
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  )
}

