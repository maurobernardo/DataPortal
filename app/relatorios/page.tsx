import { FileText, Filter, Search } from 'lucide-react'
import { findAllReports } from '@/lib/db'
import { ReportCard } from '@/components/reports/ReportCard'
import type { PublicReport } from '@/components/reports/types'
import '../reports-catalog.css'

export const dynamic = 'force-dynamic'

async function getData(searchParams: { [key: string]: string | string[] | undefined }) {
  const year = searchParams.year as string | undefined
  const coverage = searchParams.coverage as string | undefined
  const partners = searchParams.partners as string | undefined
  const pageParam = searchParams.page as string | undefined

  const page = pageParam ? parseInt(pageParam) || 1 : 1
  const take = 6
  const skip = (page - 1) * take

  const all = (await findAllReports()) as PublicReport[]
  const filtered = all.filter((r) => {
    if (year && String(r.year) !== String(year)) return false
    if (coverage && !String(r.coverage || '').toLowerCase().includes(String(coverage).toLowerCase()))
      return false
    if (partners && !String(r.partners || '').toLowerCase().includes(String(partners).toLowerCase()))
      return false
    return true
  })

  const totalReports = filtered.length
  const reports = filtered
    .slice()
    .sort((a, b) => String(b.year).localeCompare(String(a.year)))
    .slice(skip, skip + take)

  const yearValues: (string | number)[] = []
  for (const r of all) {
    if (r.year != null && r.year !== '') yearValues.push(r.year)
  }
  const availableYears = Array.from(new Set(yearValues)).sort((a, b) =>
    String(b).localeCompare(String(a))
  )
  const availableCoverages: string[] = Array.from(
    new Set(all.map((r) => r.coverage).filter(Boolean))
  ).map((v) => String(v))
  const availablePartners: string[] = Array.from(
    new Set(all.map((r) => r.partners).filter(Boolean))
  ).map((v) => String(v))

  return { reports, totalReports, totalAll: all.length, availableYears, availableCoverages, availablePartners, page, take }
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const {
    reports,
    totalReports,
    totalAll,
    availableYears,
    availableCoverages,
    availablePartners,
    page,
    take,
  } = await getData(searchParams)

  const hasMore = page * take < totalReports

  const moreParams = new URLSearchParams()
  if (searchParams.year) moreParams.set('year', String(searchParams.year))
  if (searchParams.coverage) moreParams.set('coverage', String(searchParams.coverage))
  if (searchParams.partners) moreParams.set('partners', String(searchParams.partners))
  moreParams.set('page', String(page + 1))
  const moreHref = `/relatorios?${moreParams.toString()}`

  return (
    <div className="rpt-page">
      <section className="rpt-hero">
        <div className="rpt-inner">
          <div className="rpt-eyebrow">Publicações · Estudos</div>
          <h1>
            Relatórios e <span className="accent">análises oficiais.</span>
          </h1>
          <p className="rpt-hero-lede">
            Consulte estudos, relatórios sectoriais e documentos de referência publicados no Data Portal —
            com metadados, cobertura geográfica e pedido de acesso ao documento completo.
          </p>
          <div className="rpt-hero-stats">
            <div>
              <strong>{totalAll}</strong>
              <span>Relatórios</span>
            </div>
            <div>
              <strong>{availableYears.length}</strong>
              <span>Anos</span>
            </div>
            <div>
              <strong>{availableCoverages.length}</strong>
              <span>Coberturas</span>
            </div>
            <div>
              <strong>{availablePartners.length}</strong>
              <span>Parceiros</span>
            </div>
          </div>
        </div>
      </section>

      <div className="rpt-main">
        <div className="rpt-inner">
          <div className="rpt-filters">
            <div className="rpt-filters-head">
              <Filter className="size-4" aria-hidden />
              Filtrar relatórios
            </div>
            <form method="get" className="rpt-filters-grid">
              <div className="rpt-field">
                <label htmlFor="rpt-year">Ano</label>
                <select id="rpt-year" name="year" defaultValue={searchParams.year as string}>
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
                <select id="rpt-coverage" name="coverage" defaultValue={searchParams.coverage as string}>
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
                <select id="rpt-partners" name="partners" defaultValue={searchParams.partners as string}>
                  <option value="">Todos os parceiros</option>
                  {availablePartners.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rpt-filters-actions">
                <button type="submit" className="rpt-btn rpt-btn-primary">
                  <Search className="size-4" aria-hidden />
                  Aplicar filtros
                </button>
                <a href="/relatorios" className="rpt-btn rpt-btn-ghost">
                  Limpar
                </a>
              </div>
            </form>
          </div>

          {reports.length > 0 ? (
            <>
              <div className="rpt-grid">
                {reports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
              {hasMore && (
                <div className="rpt-load-more">
                  <a href={moreHref} className="rpt-btn rpt-btn-primary">
                    Carregar mais relatórios
                  </a>
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
              <a href="/relatorios" className="rpt-btn rpt-btn-primary">
                Limpar filtros
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
