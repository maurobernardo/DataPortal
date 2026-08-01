'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { getCachedPreview, setCachedPreview } from '@/lib/preview-cache'
import { GeoInsightsCard } from '@/components/geo/GeoInsightsCard'
import { RelatedDatasets } from '@/components/RelatedDatasets'
import type { GeoInsights } from '@/lib/geo-intelligence'

const InteractiveGeoMapPreview = dynamic(
  () => import('@/components/geo/InteractiveGeoMapPreview'),
  {
    ssr: false,
    loading: () => (
      <div className="geo-map-placeholder absolute inset-0 z-10">
        <Loader2 className="animate-spin text-white/60" />
      </div>
    ),
  }
)
import type { GeoDataset } from '@/components/geo/types'

type PreviewGeo = {
  type: 'geo'
  geojson: unknown
  bbox: [number, number, number, number] | null
  featureCount?: number
  insights?: GeoInsights | null
}

export function GeoMapDetailPanel({ dataset }: { dataset: GeoDataset | null }) {
  const [preview, setPreview] = useState<PreviewGeo | null>(null)
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
      if (data?.error) {
        setPreview(null)
        setError(data.error)
        return
      }
      if (data?.type === 'geo') {
        setPreview({
          type: 'geo',
          geojson: data.geojson,
          bbox: data.bbox ?? null,
          featureCount: data.featureCount,
          insights: data.insights ?? null,
        })
      } else {
        setPreview(null)
        setError('Formato sem pré-visualização no mapa. Abra o dataset para mais detalhes.')
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
      <aside>
        <div className="geo-map-preview">
          <div className="geo-map-placeholder text-white/70 text-sm px-4 text-center">
            Seleccione uma camada na grelha
          </div>
        </div>
      </aside>
    )
  }

  const bboxLabel =
    preview?.bbox
      ? `Extensão: ${preview.bbox[1].toFixed(1)}°–${preview.bbox[3].toFixed(1)}° lat · ${preview.bbox[0].toFixed(1)}°–${preview.bbox[2].toFixed(1)}° long`
      : null

  return (
    <aside>
      <div className="geo-map-preview">
        <div className="geo-map-preview-header">
          <div className="min-w-0">
            <div className="geo-map-preview-title truncate">Pré-visualização: {dataset.title}</div>
            <div className="geo-map-preview-meta">
              {loading
                ? 'A carregar geometria…'
                : preview?.featureCount != null
                  ? `${preview.featureCount.toLocaleString('pt-BR')} elemento${preview.featureCount !== 1 ? 's' : ''}${bboxLabel ? ` · ${bboxLabel}` : ''}`
                  : dataset.coverage || dataset.geometry || 'Camada geoespacial'}
            </div>
          </div>
          <Link href={`/dataset/${dataset.id}`} className="geo-map-open-link">
            Abrir
          </Link>
        </div>
        <div className="geo-map-canvas">
          {loading && (
            <div className="geo-map-placeholder absolute inset-0 z-10">
              <Loader2 className="animate-spin text-white/60" />
            </div>
          )}
          {!loading && preview?.geojson ? (
            <InteractiveGeoMapPreview
              key={dataset.id}
              geojson={preview.geojson}
              bbox={preview.bbox}
              featureCount={preview.featureCount}
              className="geo-interactive-map geo-interactive-map--panel"
              mapOnly
            />
          ) : (
            !loading && (
              <div className="geo-map-placeholder">
                <p className="text-white/70 text-xs text-center px-6 max-w-[280px]">
                  {error || 'Pré-visualização não disponível para este formato.'}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      <div className="geo-layer-detail-panel">
        <div className="geo-ldp-org">{dataset.source || dataset.category.name}{dataset.year ? ` · ${dataset.year}` : ''}</div>
        <h2 className="geo-ldp-title">{dataset.title}</h2>

        {dataset.description && (
          <div className="geo-ldp-section">
            <div className="geo-ldp-section-label">Descrição</div>
            <p className="text-[13px] text-[var(--pd-ink-700)] leading-relaxed whitespace-pre-wrap break-words">
              {dataset.description}
            </p>
          </div>
        )}

        <div className="geo-ldp-section">
          <div className="geo-ldp-section-label">Atributos principais</div>
          <div className="geo-ldp-attrs">
            <div className="geo-ldp-attr">
              <div className="geo-ldp-attr-key">Visualizações</div>
              <div className="geo-ldp-attr-val">{dataset.views.toLocaleString('pt-BR')}</div>
            </div>
            <div className="geo-ldp-attr">
              <div className="geo-ldp-attr-key">Downloads</div>
              <div className="geo-ldp-attr-val">{dataset.downloads.toLocaleString('pt-BR')}</div>
            </div>
            <div className="geo-ldp-attr">
              <div className="geo-ldp-attr-key">Formato</div>
              <div className="geo-ldp-attr-val">{dataset.format}</div>
            </div>
            <div className="geo-ldp-attr">
              <div className="geo-ldp-attr-key">Categoria</div>
              <div className="geo-ldp-attr-val">{dataset.category.name}</div>
            </div>
            {dataset.geometry && (
              <div className="geo-ldp-attr">
                <div className="geo-ldp-attr-key">Geometria</div>
                <div className="geo-ldp-attr-val">{dataset.geometry}</div>
              </div>
            )}
            {dataset.fileSize && (
              <div className="geo-ldp-attr">
                <div className="geo-ldp-attr-key">Tamanho</div>
                <div className="geo-ldp-attr-val">{dataset.fileSize}</div>
              </div>
            )}
          </div>
        </div>

        <div className="geo-ldp-section">
          <div className="geo-ldp-section-label">Formato</div>
          <div className="geo-ldp-formats">
            <span className="geo-ldp-format-chip">{dataset.format}</span>
          </div>
        </div>

        <GeoInsightsCard insights={preview?.insights ?? null} />

        <RelatedDatasets datasetId={dataset.id} sectionLabelClassName="geo-ldp-section-label flex items-center gap-1.5" />

        <div className="geo-ldp-actions">
          <Link href={`/dataset/${dataset.id}`} className="geo-ldp-action-primary">
            Ver dataset completo →
          </Link>
          {dataset.filePath ? (
            <a href={`/api/download/${dataset.id}`} className="geo-ldp-action-secondary">
              ↓ Descarregar
            </a>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
