'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { GeoDataset } from '@/components/geo/types'
import { AlfPreviewInspector } from '@/components/alf/AlfPreviewInspector'
import type { AlfTablePreview } from '@/components/alf/alf-preview-utils'
import { getCachedPreview, setCachedPreview } from '@/lib/preview-cache'

export function AlfDataDetailPanel({ dataset }: { dataset: GeoDataset | null }) {
  const [preview, setPreview] = useState<AlfTablePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!dataset) {
      setPreview(null)
      setError(null)
      return
    }

    let cancelled = false

    const applyData = (data: any) => {
      if (cancelled) return
      if (data?.type === 'table' && Array.isArray(data.columns)) {
        setPreview({
          type: 'table',
          columns: data.columns,
          rows: Array.isArray(data.rows) ? data.rows : [],
          delimiter: data.delimiter,
        })
      } else {
        setPreview(null)
        setError(data?.error || 'Formato sem pré-visualização tabular. Abra o dataset para mais detalhes.')
      }
    }

    const cached = getCachedPreview(dataset.id)
    if (cached) {
      applyData(cached)
      return
    }

    setLoading(true)
    setError(null)

    fetch(`/api/datasets/${dataset.id}/preview`)
      .then(async (res) => {
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setPreview(null)
          setError(data?.error || 'Pré-visualização indisponível')
          return
        }
        setCachedPreview(dataset.id, data)
        applyData(data)
      })
      .catch(() => {
        if (!cancelled) {
          setPreview(null)
          setError('Não foi possível carregar a pré-visualização.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dataset?.id])

  if (!dataset) {
    return (
      <aside className="alf-detail-panel alf-detail-empty">
        <p className="text-sm text-[var(--pd-ink-500)] text-center px-6 py-12">
          Seleccione um dataset na grelha para ver esquema e amostra
        </p>
      </aside>
    )
  }

  return (
    <aside className="alf-detail-panel">
      <div className="alf-detail-header">
        <div className="alf-detail-org">
          {dataset.source || dataset.category.name}
          {dataset.year ? ` · ${dataset.year}` : ''}
        </div>
        <h2 className="alf-detail-title">{dataset.title}</h2>
        <div className="alf-detail-tags">
          <span className="alf-detail-tag">{dataset.format}</span>
          {dataset.year ? <span className="alf-detail-tag alf-detail-tag-muted">{dataset.year}</span> : null}
          <span className="alf-detail-tag alf-detail-tag-muted">{dataset.category.name}</span>
        </div>
      </div>

      <AlfPreviewInspector
        preview={preview}
        loading={loading}
        error={error}
        variant="panel"
        views={dataset.views}
        downloads={dataset.downloads}
        datasetKey={dataset.id}
      />

      {dataset.description && !loading && (
        <div className="alf-detail-content alf-detail-content--desc">
          <div className="alf-detail-section">
            <div className="alf-detail-section-label">Descrição</div>
            <p className="text-[13px] text-[var(--pd-ink-700)] leading-relaxed whitespace-pre-wrap break-words">
              {dataset.description}
            </p>
          </div>
        </div>
      )}

      <div className="alf-detail-actions">
        <Link href={`/dataset/${dataset.id}`} className="alf-detail-action-primary">
          Ver dataset completo →
        </Link>
        {dataset.filePath ? (
          <span
            className="alf-detail-action-secondary opacity-50 cursor-not-allowed pointer-events-none"
            title="Download temporariamente indisponível"
          >
            ↓ Indisponível
          </span>
        ) : null}
      </div>
    </aside>
  )
}
