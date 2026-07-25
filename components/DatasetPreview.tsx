'use client'

import { useEffect, useState } from 'react'
import { Loader2, Table2, Map as MapIcon, AlertTriangle } from 'lucide-react'
import dynamic from 'next/dynamic'
import { labelFromKey } from '@/lib/geo-preview-interactive'

const DatasetMapPreview = dynamic(() => import('./DatasetMapPreview'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-green-600" />
    </div>
  ),
})

const InteractiveGeoMapPreview = dynamic(
  () => import('@/components/geo/InteractiveGeoMapPreview'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[360px] bg-[var(--pd-surface-50)] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--pd-green-700)]" />
      </div>
    ),
  }
)

type PreviewResponse =
  | { type: 'table'; columns: string[]; rows: string[][]; delimiter?: string }
  | { type: 'geo'; geojson: any; bbox?: [number, number, number, number] | null; featureCount?: number }
  | { type: 'none' }
  | { error: string }

export function DatasetPreview({
  datasetId,
  dataType,
  variant = 'default',
  showHeader = true,
  mapLayout = 'overlay',
  splitDetailCards = false,
}: {
  datasetId: number
  dataType: string
  variant?: 'default' | 'catalog'
  showHeader?: boolean
  /** Página de detalhe do dataset: resumo abaixo do mapa */
  mapLayout?: 'overlay' | 'detail'
  /** Três cards separados: mapa, resumo, elemento seleccionado */
  splitDetailCards?: boolean
}) {
  const isCatalog = variant === 'catalog'
  const [state, setState] = useState<{ loading: boolean; data?: PreviewResponse }>({ loading: true })

  useEffect(() => {
    let alive = true
    setState({ loading: true })
    fetch(`/api/datasets/${datasetId}/preview`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return
        setState({ loading: false, data })
      })
      .catch(() => {
        if (!alive) return
        setState({ loading: false, data: { error: 'Falha ao carregar pré-visualização' } })
      })
    return () => {
      alive = false
    }
  }, [datasetId])

  if (state.loading) {
    if (isCatalog) {
      /* Mesma silhueta que a tabela carregada — evita a página “saltar” quando a amostra aparece. */
      return (
        <div className="dataset-preview-catalog">
          <div className="alf-sample-scroll dataset-preview-catalog-scroll flex min-h-[min(280px,52vh)] max-h-[min(56vh,520px)] items-center justify-center gap-2 bg-[var(--pd-surface-50)] text-sm text-[var(--pd-ink-500)]">
            <Loader2 className="w-5 h-5 shrink-0 animate-spin text-[var(--pd-green-700)]" />
            <span>A carregar amostra…</span>
          </div>
          <div className="dataset-preview-catalog-footer text-[var(--pd-ink-400)]">Pré-visualização tabular</div>
        </div>
      )
    }
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-green-600" />
        <span className="text-sm text-slate-600">Gerando pré-visualização…</span>
      </div>
    )
  }

  const data = state.data

  if (!data || 'error' in data) {
    if (isCatalog) {
      return (
        <div className="dataset-preview-catalog">
          <div className="alf-sample-scroll dataset-preview-catalog-scroll flex min-h-[min(200px,40vh)] max-h-[min(56vh,520px)] items-center justify-center p-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 max-w-md">
              <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-amber-900 text-sm">Pré-visualização indisponível</div>
                <div className="text-xs text-amber-800 mt-0.5">
                  {data?.error || 'Não foi possível gerar o preview.'}
                </div>
              </div>
            </div>
          </div>
          <div className="dataset-preview-catalog-footer">Erro ao carregar amostra</div>
        </div>
      )
    }
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold text-amber-900 text-sm">Pré-visualização indisponível</div>
          <div className="text-xs text-amber-800 mt-0.5">
            {data?.error || 'Não foi possível gerar o preview.'}
          </div>
        </div>
      </div>
    )
  }

  if (data.type === 'none') {
    return null
  }

  if (data.type === 'table') {
    if (isCatalog) {
      return (
        <div className="dataset-preview-catalog">
          <div className="alf-sample-scroll dataset-preview-catalog-scroll min-h-[min(280px,52vh)] max-h-[min(56vh,520px)]">
            <table className="alf-sample-table">
              <thead>
                <tr>
                  {data.columns.map((c, idx) => (
                    <th key={idx}>{c ? labelFromKey(c) : `Coluna ${idx + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {data.columns.map((_, cIdx) => {
                      const val = row[cIdx] ?? ''
                      const numeric = /^-?\d+([.,]\d+)?$/.test(String(val).trim())
                      return (
                        <td key={cIdx} className={numeric ? 'numeric' : undefined}>
                          {val}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dataset-preview-catalog-footer">
            Amostra · {data.rows.length} linha{data.rows.length !== 1 ? 's' : ''}
            {data.delimiter ? (
              <>
                {' '}
                · delimitador <span className="font-mono">{data.delimiter}</span>
              </>
            ) : null}
          </div>
        </div>
      )
    }

    return (
      <section className="space-y-4">
        {showHeader && (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center">
              <Table2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Pré-visualização</h2>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-auto max-h-[420px]">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  {data.columns.map((c, idx) => (
                    <th key={idx} className="text-left font-semibold text-slate-700 px-3 py-2 whitespace-nowrap">
                      {c ? labelFromKey(c) : `Coluna ${idx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="odd:bg-white even:bg-slate-50/60">
                    {data.columns.map((_, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                        {row[cIdx] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-500">
            Mostrando amostra. Delimitador: <span className="font-mono">{data.delimiter || '-'}</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={isCatalog ? 'dataset-preview-catalog-geo' : 'space-y-4'}>
      {showHeader && (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center">
            <MapIcon className="w-5 h-5" />
          </div>
          <h2 className={`font-bold ${isCatalog ? 'text-base text-[var(--pd-ink-900)]' : 'text-xl text-slate-800'}`}>
            Pré-visualização no mapa
          </h2>
        </div>
      )}
      {isCatalog ? (
        <InteractiveGeoMapPreview
          geojson={data.geojson}
          bbox={data.bbox}
          featureCount={data.featureCount}
          className={`geo-interactive-map geo-interactive-map--catalog${mapLayout === 'detail' ? ' geo-interactive-map--detail' : ''}`}
          previewLayout={mapLayout}
          splitDetailCards={splitDetailCards}
        />
      ) : (
        <>
          <DatasetMapPreview geojson={data.geojson} bbox={data.bbox} />
          {typeof data.featureCount === 'number' && (
            <div className="text-xs text-slate-500">
              Elementos no ficheiro:{' '}
              <span className="font-semibold text-slate-700">
                {data.featureCount.toLocaleString('pt-BR')}
              </span>{' '}
              (amostra até 500)
            </div>
          )}
        </>
      )}
    </section>
  )
}
