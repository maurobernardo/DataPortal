import { findAllReports, findEntityFavoriteIds } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ReportsCatalogClient } from '@/components/reports/ReportsCatalogClient'
import { RecentlyViewedRail } from '@/components/RecentlyViewedRail'
import type { PublicReport } from '@/components/reports/types'
import '../reports-catalog.css'

export const dynamic = 'force-dynamic'

async function getData() {
  const all = (await findAllReports()) as PublicReport[]

  const yearValues: (string | number)[] = []
  for (const r of all) {
    if (r.year != null && r.year !== '') yearValues.push(r.year)
  }
  const availableYears = Array.from(new Set(yearValues)).sort((a, b) => String(b).localeCompare(String(a)))
  const availableCoverages: string[] = Array.from(new Set(all.map((r) => r.coverage).filter(Boolean))).map((v) =>
    String(v)
  )
  const availablePartners: string[] = Array.from(new Set(all.map((r) => r.partners).filter(Boolean))).map((v) =>
    String(v)
  )

  return { all, availableYears, availableCoverages, availablePartners }
}

export default async function RelatoriosPage() {
  const session = await getCurrentUser()
  const [{ all, availableYears, availableCoverages, availablePartners }, favoriteIds] = await Promise.all([
    getData(),
    session ? findEntityFavoriteIds(session.userId, 'report') : Promise.resolve([]),
  ])
  const favoriteIdSet = new Set(favoriteIds)

  return (
    <div className="rpt-page">
      <section className="rpt-hero">
        <div className="rpt-inner">
          <div className="rpt-eyebrow">Publicações · Estudos</div>
          <h1>
            Relatórios e <span className="accent">análises oficiais.</span>
          </h1>
          <p className="rpt-hero-lede">
            Consulte estudos, relatórios sectoriais e documentos de referência publicados no Data Portal,
            com metadados, cobertura geográfica e pedido de acesso ao documento completo.
          </p>
          <div className="rpt-hero-stats">
            <div>
              <strong>{all.length}</strong>
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
          <RecentlyViewedRail dataType="report" />
          <ReportsCatalogClient
            allReports={all}
            availableYears={availableYears}
            availableCoverages={availableCoverages}
            availablePartners={availablePartners}
            favoriteIds={favoriteIdSet}
          />
        </div>
      </div>
    </div>
  )
}
