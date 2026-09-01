import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, FileText, Globe, Users } from 'lucide-react'
import { findReportById } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ReportRequestButton } from '@/components/ReportRequestButton'
import { RecordRecentlyViewed } from '@/components/RecordRecentlyViewed'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PainelDigesto } from '@/components/reports/PainelDigesto'
import { PerguntarAoRelatorio } from '@/components/reports/PerguntarAoRelatorio'
import { PreVisualizacaoPdf } from '@/components/reports/PreVisualizacaoPdf'
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
  const isPdf = hasFile && report.filePath!.toLowerCase().endsWith('.pdf')
  const sessao = await getCurrentUser()
  const autenticado = !!sessao

  return (
    <div className="rpt-page">
      <div className="rpt-main">
        {/*
          Não usa `rpt-inner-narrow` (800px): essa largura é para uma ficha de relatório só com
          texto, e esta página passou a ter uma pré-visualização de PDF e ferramentas de análise
          ao lado do resumo — a 800px ficava uma coluna estreita a meio de um ecrã largo, com
          muito espaço vazio dos dois lados.
        */}
        <div className="rpt-inner animate-fade-in">
          <RecordRecentlyViewed
            id={report.id}
            title={report.title}
            href={`/relatorios/${report.id}`}
            dataType="report"
          />
          <Breadcrumbs items={[{ label: 'Relatórios', href: '/relatorios' }, { label: report.title }]} />
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
              <h2 className="rpt-descricao-titulo">
                <FileText className="size-5" aria-hidden />
                Ficha do relatório
              </h2>
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
                {/*
                  Nenhum link directo para `report.filePath`: o ficheiro original nunca deve sair
                  daqui em lado nenhum da página, só a pré-visualização (desenhada, não descarregável
                  como está) e os resumos gerados pelo portal. "Abrir ficheiro" dava exactamente
                  isso, e foi removido de propósito.
                */}
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

              {isPdf && (
                <div className="rpt-detail-pdf-preview">
                  {/*
                    Nem <iframe> nem <object>: as duas versões anteriores dependiam do visualizador
                    NATIVO de PDF do browser, e quando esse visualizador falta (ou está desligado),
                    a caixa fica em branco sem aviso nenhum — foi visto ao vivo com as duas. Este
                    componente desenha as páginas ele próprio, com o pdf.js, e por isso não depende
                    de mais nada existir no browser de quem visita a página.
                  */}
                  <PreVisualizacaoPdf url={report.filePath!} titulo={report.title} />
                </div>
              )}
            </div>
          </article>

          {/*
            A análise só faz sentido quando há um PDF para ler: sem ficheiro, não há o que
            processar, e mostrar a secção a dizer isso a cada relatório sem ficheiro só repetiria
            o que "Os detalhes deste relatório ainda não foram cadastrados" já diz.

            Quem tem sessão iniciada pode pedir a análise na hora (é um custo por relatório,
            cobrado uma vez); a equipa do portal também a pode preparar com antecedência no painel
            administrativo. Vem do mesmo processamento, guardado uma só vez.
          */}
          {isPdf && (
            <div id="analise">
              <PainelDigesto reportId={report.id} titulo={report.title} ano={report.year} autenticado={autenticado} />
              <PerguntarAoRelatorio reportId={report.id} autenticado={autenticado} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
