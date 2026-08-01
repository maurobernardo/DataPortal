import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Database,
  Download,
  FileText,
  Grid3X3,
  HardDrive,
  Layers,
  Table2,
  Tag,
  TrendingUp,
} from 'lucide-react'
import { AlfDetailPreviewCard } from '@/components/alf/AlfDetailPreviewCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { RecordRecentlyViewed } from '@/components/RecordRecentlyViewed'

type DatasetDetail = {
  id: number
  title: string
  description: string
  dataType: string
  format: string
  source: string | null
  year: number
  views: number
  downloads: number
  keywords: string | null
  coverage: string | null
  fileSize: string | null
  filePath: string | null
  category: { id: number; name: string }
}

export function AlfDatasetDetailView({ dataset }: { dataset: DatasetDetail }) {
  const keywords = dataset.keywords?.split(',').map((k) => k.trim()).filter(Boolean) ?? []

  return (
    <div className="geo-detail-page alf-detail-page">
      <div className="geo-detail-inner">
        <RecordRecentlyViewed
          id={dataset.id}
          title={dataset.title}
          href={`/dataset/${dataset.id}`}
          dataType="alfanumerico"
        />
        <Breadcrumbs
          items={[
            { label: 'Dados Alfanuméricos', href: '/dados-alfanumericos' },
            ...(dataset.category?.name
              ? [{ label: dataset.category.name, href: `/dados-alfanumericos?category=${dataset.category.id}` }]
              : []),
            { label: dataset.title },
          ]}
        />

        <Link href="/dados-alfanumericos" className="geo-detail-back">
          <ArrowLeft className="size-4" aria-hidden />
          Voltar aos Dados Alfanuméricos
        </Link>

        <div className="geo-detail-layout geo-detail-layout--alf-stack">
          <section className="geo-detail-preview-sticky geo-detail-preview-full">
            <AlfDetailPreviewCard
              datasetId={dataset.id}
              filePath={dataset.filePath}
              views={dataset.views}
              downloads={dataset.downloads}
            />
          </section>

          <div className="geo-detail-main">
            <div className="geo-detail-card">
              <header className="geo-detail-hero">
                <div className="geo-detail-hero-badges">
                  <span className="geo-detail-badge">
                    <Database className="size-3.5" aria-hidden />
                    {dataset.category.name}
                  </span>
                  <span className="geo-detail-badge">
                    <Table2 className="size-3.5" aria-hidden />
                    Tabular
                  </span>
                  <span className="geo-detail-badge">{dataset.format}</span>
                </div>
                <h1 className="geo-detail-title">{dataset.title}</h1>
                <div className="geo-detail-meta-row">
                  <span className="inline-flex items-center gap-1.5">
                    <Database className="size-4 opacity-80" aria-hidden />
                    {dataset.source || 'Fonte não informada'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-4 opacity-80" aria-hidden />
                    {dataset.year}
                  </span>
                </div>
              </header>

              <div className="geo-detail-body space-y-8">
                <section>
                  <h2 className="geo-detail-section-title">
                    <span className="geo-detail-section-icon">
                      <FileText className="size-5" aria-hidden />
                    </span>
                    Descrição
                  </h2>
                  <div className="geo-detail-prose">{dataset.description}</div>
                </section>

                <section>
                  <h2 className="geo-detail-section-title">
                    <span className="geo-detail-section-icon">
                      <Grid3X3 className="size-5" aria-hidden />
                    </span>
                    Informações técnicas
                  </h2>
                  <div className="geo-detail-info-grid">
                    <InfoCell icon={<Database className="size-4" />} label="Categoria" value={dataset.category.name} />
                    <InfoCell icon={<Database className="size-4" />} label="Fonte" value={dataset.source || 'N/A'} />
                    <InfoCell icon={<Calendar className="size-4" />} label="Ano" value={String(dataset.year)} />
                    <InfoCell icon={<Layers className="size-4" />} label="Formato" value={dataset.format} />
                    <InfoCell icon={<HardDrive className="size-4" />} label="Tamanho" value={dataset.fileSize || 'Desconhecido'} />
                    <InfoCell
                      icon={<Table2 className="size-4" />}
                      label="Cobertura"
                      value={dataset.coverage || 'N/A'}
                    />
                  </div>

                  {keywords.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-[#E2E8E5]">
                      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-[var(--pd-ink-800)]">
                        <Tag className="size-4 text-[var(--pd-green-700)]" aria-hidden />
                        Palavras-chave
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="px-3 py-1 rounded-lg bg-[var(--pd-green-50)] border border-[#CFE3D6] text-xs font-medium text-[var(--pd-green-900)]"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <div className="geo-detail-actions">
                  {dataset.filePath ? (
                    <a href={`/api/download/${dataset.id}`} className="geo-detail-btn-primary">
                      <Download className="size-5" aria-hidden />
                      Descarregar dados
                    </a>
                  ) : (
                    <button type="button" disabled className="geo-detail-btn-primary opacity-50 cursor-not-allowed">
                      Indisponível para download
                    </button>
                  )}
                </div>

                <div className="geo-detail-stats">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="size-5 opacity-90" aria-hidden />
                    Estatísticas de uso
                  </h3>
                  <div className="geo-detail-stats-grid">
                    <div className="geo-detail-stat-box">
                      <div className="geo-detail-stat-num">{dataset.views + 1}</div>
                      <div className="geo-detail-stat-label">Visualizações</div>
                    </div>
                    <div className="geo-detail-stat-box">
                      <div className="geo-detail-stat-num">{dataset.downloads}</div>
                      <div className="geo-detail-stat-label">Downloads</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="geo-detail-info-cell">
      <div className="flex items-center gap-2 text-[var(--pd-green-700)] mb-1">{icon}</div>
      <div className="geo-detail-info-label">{label}</div>
      <div className="geo-detail-info-value">{value}</div>
    </div>
  )
}
