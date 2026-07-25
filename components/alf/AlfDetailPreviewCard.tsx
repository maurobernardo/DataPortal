'use client'

import { useEffect, useState } from 'react'
import { Table2 } from 'lucide-react'
import { AlfPreviewInspector } from '@/components/alf/AlfPreviewInspector'
import type { AlfTablePreview } from '@/components/alf/alf-preview-utils'

export function AlfDetailPreviewCard({
  datasetId,
  filePath,
  views,
  downloads,
}: {
  datasetId: number
  filePath: string | null
  views?: number
  downloads?: number
}) {
  const [preview, setPreview] = useState<AlfTablePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filePath) {
      setPreview(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/datasets/${datasetId}/preview`)
      .then(async (res) => {
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setPreview(null)
          setError(data?.error || 'Pré-visualização indisponível')
          return
        }
        if (data.type === 'table' && Array.isArray(data.columns)) {
          setPreview({
            type: 'table',
            columns: data.columns,
            rows: Array.isArray(data.rows) ? data.rows : [],
            delimiter: data.delimiter,
          })
        } else {
          setPreview(null)
          setError('Formato sem pré-visualização tabular.')
        }
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
  }, [datasetId, filePath])

  return (
    <div className="geo-detail-preview-card alf-detail-preview-card">
      <div className="geo-detail-preview-card-header">
        <Table2 className="size-4" aria-hidden />
        <span>Pré-visualização dos dados</span>
      </div>
      <div className="geo-detail-preview-card-body alf-detail-preview-card-body">
        {!filePath ? (
          <p className="text-sm text-[var(--pd-ink-500)] text-center py-10 px-4">
            Pré-visualização indisponível — ficheiro não associado
          </p>
        ) : (
          <AlfPreviewInspector
            preview={preview}
            loading={loading}
            error={error}
            variant="detail"
            views={views}
            downloads={downloads}
            datasetKey={datasetId}
          />
        )}
      </div>
    </div>
  )
}
