'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react'
import {
  columnLabel,
  ordenarColunasPorVariacao,
  columnRange,
  countDuplicateRows,
  countOutliers,
  distinctCount,
  fillPercent,
  inferColumnType,
  type AlfTablePreview,
  typeIcon,
  typeLabelPt,
} from '@/components/alf/alf-preview-utils'
import { AlfPreviewChart } from '@/components/alf/AlfPreviewChart'
import { RelatedDatasets } from '@/components/RelatedDatasets'

type PanelTab = 'schema' | 'sample' | 'chart'

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
  const [expanded, setExpanded] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    setTab(defaultTab)
    setExpanded(false)
    setFilterText('')
    setSortCol(null)
  }, [defaultTab, datasetKey])

  const colCount = preview?.columns.length ?? 0
  const rowCount = preview?.rows.length ?? 0
  const displayCols = preview?.columns.slice(0, variant === 'detail' ? 12 : 8) ?? []
  // A amostra mostra TODAS as colunas: o corte às 5 ou 8 primeiras deixava de fora exactamente as
  // que interessavam nos ficheiros em formato longo, e a caixa já rola na horizontal.
  // Memorizado porque `sampleCols` é dependência do useMemo das linhas filtradas: um array novo a
  // cada render fazia essa memorização nunca acertar, e o filtro recalculava tudo a cada tecla.
  const ordenacao = useMemo(
    () => ordenarColunasPorVariacao(preview?.columns ?? [], preview?.rows ?? []),
    [preview]
  )
  const sampleCols = ordenacao.columns
  const colunasMovidas = ordenacao.constantes.length + ordenacao.identificadores.length
  const collapsedLimit = variant === 'detail' ? 12 : 6

  const columnStats = displayCols.map((col, i) => {
    const colIndex = preview?.columns.indexOf(col) ?? i
    const values = preview?.rows.map((r) => r[colIndex] ?? '') ?? []
    const t = inferColumnType(values)
    const pct = fillPercent(values)
    const outliers = t === 'num' ? countOutliers(values) : 0
    const distinct = distinctCount(values)
    const range = columnRange(values, t)
    return { col, t, pct, outliers, distinct, range }
  })

  const duplicateCount = preview ? countDuplicateRows(preview.rows) : 0

  const filteredRows = useMemo(() => {
    if (!preview) return []
    const cols = sampleCols
    const colIndexes = cols.map((c) => preview.columns.indexOf(c))
    let rows = preview.rows
    const q = filterText.trim().toLowerCase()
    if (q) {
      rows = rows.filter((row) => colIndexes.some((ci) => String(row[ci] ?? '').toLowerCase().includes(q)))
    }
    if (sortCol) {
      const ci = preview.columns.indexOf(sortCol)
      const isNumeric = inferColumnType(preview.rows.map((r) => r[ci] ?? '')) === 'num'
      rows = [...rows].sort((a, b) => {
        const av = a[ci] ?? ''
        const bv = b[ci] ?? ''
        let cmp: number
        if (isNumeric) {
          cmp = (Number.parseFloat(av.replace(',', '.')) || 0) - (Number.parseFloat(bv.replace(',', '.')) || 0)
        } else {
          cmp = av.localeCompare(bv)
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [preview, sampleCols, filterText, sortCol, sortDir])

  const sampleRows = filteredRows.slice(0, expanded ? filteredRows.length : collapsedLimit)

  const toggleSort = (col: string) => {
    if (sortCol !== col) {
      setSortCol(col)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortCol(null)
    }
  }

  if (loading) {
    return (
      <div className={`p-3${variant === 'detail' ? ' min-h-[280px]' : ''}`} aria-label="A carregar pré-visualização">
        <div className="flex gap-2 mb-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="pd-skeleton h-6 flex-1" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
        {[...Array(6)].map((_, r) => (
          <div key={r} className="flex gap-2 mb-2">
            {[...Array(5)].map((_, c) => (
              <div
                key={c}
                className="pd-skeleton h-4 flex-1"
                style={{ animationDelay: `${(r * 5 + c) * 30}ms`, opacity: 1 - r * 0.1 }}
              />
            ))}
          </div>
        ))}
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
              ['chart', 'Gráfico'],
            ] as const)
          : ([
              ['schema', 'Esquema'],
              ['sample', 'Amostra'],
              ['chart', 'Gráfico'],
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
              <div className="alf-detail-stat-val">{colCount || 'N/D'}</div>
            </div>
            <div className="alf-detail-stat">
              <div className="alf-detail-stat-key">Linhas (amostra)</div>
              <div className="alf-detail-stat-val">{rowCount || 'N/D'}</div>
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
            {rowCount > 0 && (
              <div className="alf-detail-stat">
                <div className="alf-detail-stat-key">Duplicados</div>
                <div className="alf-detail-stat-val">{duplicateCount || '0'}</div>
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
              {columnStats.map(({ col, t, pct, outliers, distinct, range }) => {
                const icon = typeIcon(t)
                const barClass = pct >= 85 ? '' : pct >= 60 ? ' low' : ' bad'
                return (
                  <div key={col} className="alf-schema-row">
                    <div className={`alf-schema-icon ${icon.className}`}>{icon.letter}</div>
                    <div className="alf-schema-name" title={col}>
                      {columnLabel(col)}
                      <span className="block text-[10px] font-normal text-gray-500 mt-0.5">
                        {distinct} distinto{distinct !== 1 ? 's' : ''}
                        {range ? ` · ${range.min}–${range.max}` : ''}
                      </span>
                    </div>
                    <div className="alf-schema-fill">
                      <div className={`alf-schema-fill-bar${barClass}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="alf-schema-type">
                      {typeLabelPt(t)}
                      {outliers > 0 && (
                        <span className="alf-schema-outlier-badge" title={`${outliers} valor(es) fora do padrão (IQR)`}>
                          ⚠ {outliers}
                        </span>
                      )}
                    </div>
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

        {tab === 'sample' && preview.rows.length > 0 && (
          <div className="alf-detail-section">
            <div className="alf-detail-section-label">Amostra · primeiras linhas</div>
            <div className="alf-sample-filter">
              <Search className="size-3.5 opacity-50" aria-hidden />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filtrar amostra…"
                className="alf-sample-filter-input"
              />
            </div>
            {sampleRows.length > 0 ? (
              <>
                <div className={`alf-sample-scroll${variant === 'detail' ? ' alf-sample-scroll--detail' : ''}`}>
                  <table className="alf-sample-table">
                    <thead>
                      <tr>
                        {sampleCols.map((c) => (
                          <th key={c}>
                            <button type="button" className="alf-sample-sort-btn" onClick={() => toggleSort(c)}>
                              {columnLabel(c)}
                              {sortCol === c ? (
                                sortDir === 'asc' ? (
                                  <ArrowUp className="size-3" aria-hidden />
                                ) : (
                                  <ArrowDown className="size-3" aria-hidden />
                                )
                              ) : (
                                <ArrowUpDown className="size-3 opacity-30" aria-hidden />
                              )}
                            </button>
                          </th>
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
                {filteredRows.length > collapsedLimit && (
                  <button type="button" className="alf-sample-expand-btn" onClick={() => setExpanded((v) => !v)}>
                    {expanded ? 'Mostrar menos' : `Mostrar mais (${filteredRows.length - collapsedLimit} linhas)`}
                  </button>
                )}
                {colunasMovidas > 0 && (
                  <p className="alf-preview-inspector__hint">
                    {colunasMovidas === 1 ? '1 coluna foi movida' : `${colunasMovidas} colunas foram movidas`} para
                    o fim da tabela: identificadores, ou colunas com o mesmo valor em todas as linhas da amostra.
                    Nenhuma foi escondida.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--pd-ink-500)] py-4">Nenhuma linha corresponde ao filtro.</p>
            )}
          </div>
        )}

        {tab === 'sample' && preview.rows.length === 0 && (
          <p className="text-sm text-[var(--pd-ink-500)]">Sem linhas na amostra.</p>
        )}

        {tab === 'chart' && <AlfPreviewChart preview={preview} />}

        {typeof datasetKey === 'number' && (
          <div className="alf-detail-section">
            <RelatedDatasets datasetId={datasetKey} />
          </div>
        )}
      </div>
    </div>
  )
}
