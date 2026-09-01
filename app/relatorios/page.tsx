import { FileSearch, Languages, MessageCircleQuestion, ScanSearch } from 'lucide-react'
import { findAllReports, findEntityFavoriteIds } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { contarProcessados } from '@/lib/relatorios/persistencia'
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
  const availableSectors: string[] = Array.from(new Set(all.map((r) => r.sector).filter(Boolean)))
    .map((v) => String(v))
    .sort((a, b) => a.localeCompare(b))

  return { all, availableYears, availableCoverages, availablePartners, availableSectors }
}

export default async function RelatoriosPage() {
  const session = await getCurrentUser()
  const [{ all, availableYears, availableCoverages, availablePartners, availableSectors }, favoriteIds, relatoriosAnalisados] =
    await Promise.all([
      getData(),
      session ? findEntityFavoriteIds(session.userId, 'report') : Promise.resolve([]),
      contarProcessados().catch(() => 0),
    ])
  const favoriteIdSet = new Set(favoriteIds)

  return (
    <div className="rpt-page">
      <section className="rpt-hero pd-photo-hero">
        <div className="pd-photo-hero-bg" style={{ backgroundImage: "url('/images/fundo15.webp')" }} aria-hidden />
        <div className="pd-photo-hero-scrim" aria-hidden />
        <div className="rpt-inner">
          <div className="rpt-eyebrow">Publicações · Estudos</div>
          <h1>
            Relatórios e <span className="accent">análises oficiais.</span>
          </h1>
          <p className="rpt-hero-lede">
            Consulte estudos, relatórios sectoriais e documentos de referência publicados no Data
            Portal. Em qualquer relatório com PDF, peça a análise: um resumo com os principais
            pontos, cada um com a página onde se confirma, perguntas directas ao documento, e
            verificação contra os dados do próprio portal.
          </p>
          <div className="rpt-hero-stats">
            <div>
              <strong>{all.length}</strong>
              <span>Relatórios</span>
            </div>
            <div>
              <strong>{relatoriosAnalisados}</strong>
              <span>Já analisados</span>
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
              <strong>{availableSectors.length}</strong>
              <span>Sectores</span>
            </div>
          </div>
        </div>
      </section>

      <div className="rpt-main">
        <div className="rpt-inner">
          {/*
            Uma secção de propósito, não outro card do catálogo: explica o que a análise faz e
            porque vale a pena, antes de alguém abrir um relatório e ter de descobrir sozinho. Fica
            aqui, na página que lista TODOS os relatórios, e não em cada um deles, porque é a mesma
            explicação em qualquer relatório.
          */}
          <section className="rpt-explica">
            <div className="rpt-explica-cabecalho">
              <span className="rpt-explica-eyebrow">
                <ScanSearch className="size-3.5" aria-hidden />
                Novo neste portal
              </span>
              <h2>Não precisa de ler o relatório todo</h2>
              <p>
                Qualquer relatório com PDF pode ser analisado pelo portal. Uma vez pronta, a análise
                fica disponível na sua conta, e leva menos de um minuto a pedir.
              </p>
            </div>

            <div className="rpt-explica-passos">
              <div>
                <span className="rpt-explica-numero">1</span>
                <h3>Abra um relatório</h3>
                <p>Escolha qualquer relatório do catálogo que já tenha um ficheiro PDF associado.</p>
              </div>
              <div>
                <span className="rpt-explica-numero">2</span>
                <h3>Peça a análise</h3>
                <p>
                  Inicie sessão e carregue em <strong>"Analisar este relatório"</strong>. Um
                  documento longo pode levar alguns minutos a preparar.
                </p>
              </div>
              <div>
                <span className="rpt-explica-numero">3</span>
                <h3>Leia, pergunte, confirme</h3>
                <p>Três profundidades de resumo, perguntas directas ao documento, e um PDF para descarregar.</p>
              </div>
            </div>

            <div className="rpt-explica-razoes">
              <span className="rpt-explica-razoes-rotulo">Porquê analisar aqui</span>
              <div className="rpt-explica-razoes-lista">
                <div>
                  <FileSearch className="size-4" aria-hidden />
                  <span>Cada achado e recomendação vem com a página exacta do PDF onde se confirma.</span>
                </div>
                <div>
                  <MessageCircleQuestion className="size-4" aria-hidden />
                  <span>Pergunte directamente ao relatório em vez de o ler todo; sem resposta inventada quando o documento não diz.</span>
                </div>
                <div>
                  <Languages className="size-4" aria-hidden />
                  <span>Resumo também disponível em inglês, com verificação para nenhum número mudar na tradução.</span>
                </div>
                <div>
                  <ScanSearch className="size-4" aria-hidden />
                  <span>Pré-visualização do documento na própria página, sem descarregar nada primeiro.</span>
                </div>
              </div>
            </div>
          </section>

          <RecentlyViewedRail dataType="report" />
          <ReportsCatalogClient
            allReports={all}
            availableYears={availableYears}
            availableCoverages={availableCoverages}
            availablePartners={availablePartners}
            availableSectors={availableSectors}
            favoriteIds={favoriteIdSet}
          />
        </div>
      </div>
    </div>
  )
}
