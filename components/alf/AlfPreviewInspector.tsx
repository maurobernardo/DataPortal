'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  columnLabel,
  fillPercent,
  inferColumnType,
  type AlfTablePreview,
  typeIcon,
  typeLabelPt,
} from '@/components/alf/alf-preview-utils'

type PanelTab = 'schema' | 'sample'

export function AlfPreviewInspector({
  preview,
  loading,
  error,
  variant = 'panel',
  views,
  downloads,
  datasetKey,
}: {
  preview: AlfTablePreview | null
  loading: boolean
  error: string | null
  variant?: 'panel' | 'detail'
  views?: number
  downloads?: number
  /** Altera ao mudar de dataset — repõe o separador por defeito */
  datasetKey?: string | number
}) {
  const defaultTab: PanelTab = variant === 'detail' ? 'sample' : 'schema'
  const [tab, setTab] = useState<PanelTab>(defaultTab)

  useEffect(() => {
    setTab(defaultTab)
  }, [defaultTab, datasetKey])

  const colCount = preview?.columns.length ?? 0
  const rowCount = preview?.rows.length ?? 0
  const displayCols = preview?.columns.slice(0, variant === 'detail' ? 12 : 8) ?? []
  const sampleRows = preview?.rows.slice(0, variant === 'detail' ? 12 : 6) ?? []
  const sampleCols = preview?.columns.slice(0, variant === 'detail' ? 8 : 5) ?? []

  const columnStats = displayCols.map((col, i) => {
    const colIndex = preview?.columns.indexOf(col) ?? i
    const values = preview?.rows.map((r) => r[colIndex] ?? '') ?? []
    const t = inferColumnType(values)
    const pct = fillPercent(values)
    return { col, t, pct }
  })

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center gap-2 text-sm text-[var(--pd-ink-500)]${variant === 'detail' ? ' min-h-[280px]' : ' py-10'}`}
      >
        <Loader2 className="size-5 animate-spin text-[var(--pd-green-700)]" />
        A carregar pré-visualização…
      </div>
    )
  }

  if (error) {
    return (
      <p className={`text-sm text-[var(--pd-ink-500)]${variant === 'detail' ? ' py-12 px-6 text-center' : ' py-4'}`}>
        {error}
      </p>
    )
  }

  if (!preview) {
    return null
  }

  return (
    <div className={`alf-preview-inspector alf-preview-inspector--${variant}`}>
      <div className="alf-detail-tabs" role="tablist">
        {(variant === 'detail'
          ? ([
              ['sample', 'Amostra'],
              ['schema', 'Esquema'],
            ] as const)
          : ([
              ['schema', 'Esquema'],
              ['sample', 'Amostra'],
            ] as const)
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`alf-detail-tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={variant === 'detail' ? 'alf-preview-inspector__body' : 'alf-detail-content'}>
        <div className="alf-detail-section">
          <div className="alf-detail-section-label">Visão geral</div>
          <div className="alf-detail-stats">
            <div className="alf-detail-stat">
              <div className="alf-detail-stat-key">Colunas</div>
              <div className="alf-detail-stat-val">{colCount || '—'}</div>
            </div>
            <div className="alf-detail-stat">
              <div className="alf-detail-stat-key">Linhas (amostra)</div>
              <div className="alf-detail-stat-val">{rowCount || '—'}</div>
            </div>
            {typeof views === 'number' && (
              <div className="alf-detail-stat">
                <div className="alf-detail-stat-key">Visualizações</div>
                <div className="alf-detail-stat-val">{views.toLocaleString('pt-PT')}</div>
              </div>
            )}
            {typeof downloads === 'number' && (
              <div className="alf-detail-stat">
                <div className="alf-detail-stat-key">Downloads</div>
                <div className="alf-detail-stat-val">{downloads.toLocaleString('pt-PT')}</div>
              </div>
            )}
          </div>
          {variant === 'detail' && rowCount > 0 && (
            <p className="alf-preview-inspector__hint">
              Amostra limitada a {rowCount} linha{rowCount !== 1 ? 's' : ''} para pré-visualização rápida.
              {preview.delimiter ? (
                <>
                  {' '}
                  Delimitador: <span className="font-mono">{preview.delimiter}</span>
                </>
              ) : null}
            </p>
          )}
        </div>

        {tab === 'schema' && columnStats.length > 0 && (
          <div className="alf-detail-section">
            <div className="alf-detail-section-label">
              Esquema · {colCount} coluna{colCount !== 1 ? 's' : ''}
            </div>
            <div className="alf-schema">
              <div className="alf-schema-header">
                <div />
                <div>Coluna</div>
                <div>Preenchimento</div>
                <div>Tipo</div>
              </div>
              {columnStats.map(({ col, t, pct }) => {
                const icon = typeIcon(t)
                const barClass = pct >= 85 ? '' : pct >= 60 ? ' low' : ' bad'
                return (
                  <div key={col} className="alf-schema-row">
                    <div className={`alf-schema-icon ${icon.className}`}>{icon.letter}</div>
                    <div className="alf-schema-name" title={col}>
                      {columnLabel(col)}
                    </div>
                    <div className="alf-schema-fill">
                      <div className={`alf-schema-fill-bar${barClass}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="alf-schema-type">{typeLabelPt(t)}</div>
                  </div>
                )
              })}
              {colCount > displayCols.length && (
                <div className="alf-schema-more">
                  + {colCount - displayCols.length} colunas adicionais
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'sample' && sampleRows.length > 0 && (
          <div className="alf-detail-section">
            <div className="alf-detail-section-label">Amostra · primeiras linhas</div>
            <div className={`alf-sample-scroll${variant === 'detail' ? ' alf-sample-scroll--detail' : ''}`}>
              <table className="alf-sample-table">
                <thead>
                  <tr>
                    {sampleCols.map((c) => (
                      <th key={c}>{columnLabel(c)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row, ri) => (
                    <tr key={ri}>
                      {sampleCols.map((col) => {
                        const ci = preview.columns.indexOf(col)
                        const val = row[ci] ?? ''
                        const numeric = /^-?\d+([.,]\d+)?$/.test(String(val).trim())
                        return (
                          <td key={col} className={numeric ? 'numeric' : undefined}>
                            {val}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {colCount > sampleCols.length && (
              <p className="alf-preview-inspector__hint">
                + {colCount - sampleCols.length} colunas não mostradas na amostra
              </p>
            )}
          </div>
        )}

        {tab === 'sample' && sampleRows.length === 0 && (
          <p className="text-sm text-[var(--pd-ink-500)]">Sem linhas na amostra.</p>
        )}
      </div>
    </div>
  )
}
