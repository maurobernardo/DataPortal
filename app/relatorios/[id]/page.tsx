import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, Download, FileText, Globe, Users } from 'lucide-react'
import { findReportById } from '@/lib/db'
import { ReportRequestButton } from '@/components/ReportRequestButton'
import '../../reports-catalog.css'

export const dynamic = 'force-dynamic'

export default async function RelatorioDetalhesPage({
  params,
}: {
  params: { id: string }
}) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    notFound()
  }

  const report = await findReportById(id)
  if (!report) {
    notFound()
  }

  const hasFile = Boolean(report.filePath?.trim())

  return (
    <div className="rpt-page">
      <div className="rpt-main">
        <div className="rpt-inner rpt-inner-narrow">
          <Link href="/relatorios" className="rpt-detail-back" prefetch={false}>
            <span className="rpt-detail-back-icon" aria-hidden>
              <ArrowLeft className="size-4" />
            </span>
            Voltar para relatórios
          </Link>

          <article className="rpt-detail-hero">
            <header className="rpt-detail-hero-top">
              <span className="rpt-detail-year">{report.year}</span>
              <h1 className="rpt-detail-title">{report.title}</h1>
              <div className="rpt-detail-meta">
                <span>
                  <Globe className="size-4" aria-hidden />
                  {report.coverage}
                </span>
                <span>
                  <Calendar className="size-4" aria-hidden />
                  {report.year}
                </span>
                {report.partners ? (
                  <span>
                    <Users className="size-4" aria-hidden />
                    {report.partners}
                  </span>
                ) : null}
              </div>
            </header>

            <div className="rpt-detail-body">
              <h2>Resumo do relatório</h2>
              {report.detailsText ? (
                <p className="rpt-detail-text">{report.detailsText}</p>
              ) : (
                <div className="rpt-detail-placeholder">
                  Os detalhes deste relatório ainda não foram cadastrados no painel administrativo.
                </div>
              )}

              {report.author ? (
                <p className="rpt-detail-author">
                  <FileText className="size-4" aria-hidden />
                  <span>
                    <strong>Autor:</strong> {report.author}
                  </span>
                </p>
              ) : null}

              <div className="rpt-detail-actions">
                {hasFile ? (
                  <a
                    href={report.filePath!}
                    target="_blank"
                    rel="noreferrer"
                    className="rpt-btn rpt-btn-outline"
                    download
                  >
                    <Download className="size-4" aria-hidden />
                    Descarregar ficheiro
                    {report.fileSize ? ` (${report.fileSize})` : ''}
                  </a>
                ) : null}
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
        </div>
      </div>
    </div>
  )
}
