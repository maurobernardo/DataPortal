import Link from 'next/link'
import { ArrowRight, Calendar, FileText, Globe, Users } from 'lucide-react'
import { ReportRequestButton } from '@/components/ReportRequestButton'
import { FavoriteButton } from '@/components/FavoriteButton'
import type { PublicReport } from '@/components/reports/types'

export function ReportCard({ report, isFavorited }: { report: PublicReport; isFavorited?: boolean }) {
  return (
    <article className="rpt-card">
      <div className="rpt-card-thumb" aria-hidden>
        <FileText className="rpt-card-thumb-icon" />
        <span className="rpt-card-year">{report.year}</span>
      </div>
      <FavoriteButton
        entityType="report"
        entityId={report.id}
        initialFavorited={isFavorited ?? false}
        className="rpt-card-favorite"
      />

      <div className="rpt-card-body">
        <span className="rpt-card-coverage">{report.coverage}</span>
        <h3 className="rpt-card-title">
          <Link href={`/relatorios/${report.id}`}>{report.title}</Link>
        </h3>
        {report.detailsText ? (
          <p className="rpt-card-desc">{report.detailsText}</p>
        ) : null}

        <ul className="rpt-card-meta">
          <li>
            <Calendar className="size-3.5 shrink-0" aria-hidden />
            <span>{report.year}</span>
          </li>
          <li>
            <Globe className="size-3.5 shrink-0" aria-hidden />
            <span>{report.coverage}</span>
          </li>
          {report.author ? (
            <li>
              <FileText className="size-3.5 shrink-0" aria-hidden />
              <span>{report.author}</span>
            </li>
          ) : null}
          {report.partners ? (
            <li>
              <Users className="size-3.5 shrink-0" aria-hidden />
              <span>{report.partners}</span>
            </li>
          ) : null}
        </ul>

        <div className="rpt-card-actions">
          <Link href={`/relatorios/${report.id}`} className="rpt-btn rpt-btn-outline">
            Ver detalhes
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <ReportRequestButton
            report={{
              id: report.id,
              title: report.title,
              year: report.year,
              coverage: report.coverage,
              author: report.author,
              partners: report.partners,
            }}
            className="rpt-btn rpt-btn-primary"
          />
        </div>
      </div>
    </article>
  )
}
