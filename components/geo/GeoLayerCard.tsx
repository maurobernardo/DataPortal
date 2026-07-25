'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  Database,
  Eye,
  FileText,
  Package,
  TrendingUp,
} from 'lucide-react'
import type { GeoDataset } from '@/components/geo/types'
import { GeoLayerThumb } from '@/components/geo/GeoLayerThumb'
import { AlfLayerThumb } from '@/components/alf/AlfLayerThumb'

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
}: {
  dataset: GeoDataset
  index: number
  selected: boolean
  onSelect: () => void
  highlight?: string
  thumbVariant?: 'geo' | 'alf'
  selectLabel?: string
}) {
  const keywords = dataset.keywords?.split(',').slice(0, 3).map((k) => k.trim()).filter(Boolean) ?? []
  const isPopular = dataset.downloads > 10 || dataset.views > 50
  const formatClass =
    formatChipClass[dataset.format] ??
    'bg-[var(--pd-surface-100)] text-[var(--pd-ink-700)] border-[var(--pd-ink-100)]'

  return (
    <article className={`geo-layer-card${selected ? ' selected' : ''}`}>
      <button
        type="button"
        className="geo-layer-card-main"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${selectLabel}: ${dataset.title}`}
      >
        <div className="geo-layer-thumb">
          <span className="geo-layer-thumb-format">{dataset.format}</span>
          {isPopular && (
            <span className="geo-layer-popular">
              <TrendingUp className="size-3" aria-hidden />
              Popular
            </span>
          )}
          {thumbVariant === 'alf' ? <AlfLayerThumb index={index} /> : <GeoLayerThumb index={index} />}
        </div>

        <div className="geo-layer-body">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="geo-layer-category">{dataset.category.name}</span>
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
                <span className="geo-layer-meta-value truncate">{dataset.source || '—'}</span>
              </div>
            </div>
            <div className="geo-layer-meta-item">
              <Calendar className="size-3.5 text-[var(--pd-green-700)]" aria-hidden />
              <div>
                <span className="geo-layer-meta-label">Ano</span>
                <span className="geo-layer-meta-value">{dataset.year || '—'}</span>
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

      <div className="geo-layer-footer">
        <span className="geo-layer-downloads">↓ {dataset.downloads.toLocaleString('pt-BR')} downloads</span>
        <Link
          href={`/dataset/${dataset.id}`}
          className="geo-layer-details-btn"
          onClick={(e) => e.stopPropagation()}
        >
          Ver detalhes
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  )
}

