'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, FileText, Filter, Search } from 'lucide-react'
import { ReportCard } from '@/components/reports/ReportCard'
import type { PublicReport } from '@/components/reports/types'

const PAGE_SIZE = 6

export function ReportsCatalogClient({
  allReports,
  availableYears,
  availableCoverages,
  availablePartners,
  favoriteIds,
}: {
  allReports: PublicReport[]
  availableYears: (string | number)[]
  availableCoverages: string[]
  availablePartners: string[]
  favoriteIds?: Set<string>
}) {
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('')
  const [coverage, setCoverage] = useState('')
  const [partners, setPartners] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allReports
      .filter((r) => {
        if (year && String(r.year) !== year) return false
        if (coverage && !String(r.coverage || '').toLowerCase().includes(coverage.toLowerCase())) return false
        if (partners && !String(r.partners || '').toLowerCase().includes(partners.toLowerCase())) return false
        if (q) {
          const hay = [r.title, r.detailsText, r.author, r.partners, r.coverage].join(' ').toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => String(b.year).localeCompare(String(a.year)))
  }, [allReports, search, year, coverage, partners])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, year, coverage, partners])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  return (
    <>
      <div className="rpt-filters">
        <div className="rpt-filters-head">
          <Filter className="size-4" aria-hidden />
          Filtrar relatórios
        </div>
        <div className="rpt-filters-grid">
          <div className="rpt-field rpt-field-search">
            <label htmlFor="rpt-search">Pesquisar</label>
            <div className="rpt-search-input">
              <Search className="size-4" aria-hidden />
              <input
                id="rpt-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Título, autor, parceiro…"
              />
            </div>
          </div>
          <div className="rpt-field">
            <label htmlFor="rpt-year">Ano</label>
            <select id="rpt-year" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Todos os anos</option>
              {availableYears.map((y) => (
                <option key={String(y)} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="rpt-field">
            <label htmlFor="rpt-coverage">Cobertura</label>
            <select id="rpt-coverage" value={coverage} onChange={(e) => setCoverage(e.target.value)}>
              <option value="">Todas as coberturas</option>
              {availableCoverages.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="rpt-field">
            <label htmlFor="rpt-partners">Parceiros</label>
            <select id="rpt-partners" value={partners} onChange={(e) => setPartners(e.target.value)}>
              <option value="">Todos os parceiros</option>
              {availablePartners.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="rpt-filters-actions">
            <button
              type="button"
              className="rpt-btn rpt-btn-ghost"
              onClick={() => {
                setSearch('')
                setYear('')
                setCoverage('')
                setPartners('')
              }}
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {visible.length > 0 ? (
        <>
          <p className="rpt-results-meta">
            A mostrar <strong>{visible.length}</strong> de <strong>{filtered.length}</strong> relatório
            {filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="rpt-grid">
            {visible.map((report) => (
              <ReportCard key={report.id} report={report} isFavorited={favoriteIds?.has(String(report.id))} />
            ))}
          </div>
          {hasMore && (
            <div className="rpt-load-more">
              <button
                type="button"
                className="rpt-btn rpt-btn-primary"
                onClick={() => setVisibleCount((n) => Math.min(n + PAGE_SIZE, filtered.length))}
              >
                Carregar mais relatórios
                <ChevronDown className="size-4" aria-hidden />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rpt-empty">
          <div className="rpt-empty-icon">
            <FileText className="size-8" aria-hidden />
          </div>
          <h3>Nenhum relatório encontrado</h3>
          <p>Ajuste os filtros ou limpe a pesquisa para ver todos os relatórios disponíveis.</p>
          <button
            type="button"
            className="rpt-btn rpt-btn-primary"
            onClick={() => {
              setSearch('')
              setYear('')
              setCoverage('')
              setPartners('')
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}
    </>
  )
}
