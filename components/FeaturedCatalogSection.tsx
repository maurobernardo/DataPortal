'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Clock3, Download, Eye, ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react'
import { getCategoryIcon } from '@/lib/ai-category-icons'

type FeaturedDataset = {
  id: number
  title: string
  description: string
  source: string
  format: string
  updated: string
  downloads: number
  views: number
  category: string
  dataType: 'geoespacial' | 'alfanumerico'
}

function toK(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return `${n}`
}

// O `line-clamp` do CSS corta exactamente no limite da caixa, a meio de uma palavra ou frase, sem
// reticências visíveis nalguns casos (confirmado ao vivo nestes cartões) — parece um texto
// truncado por acidente, não uma descrição resumida de propósito. Cortar aqui, sempre numa
// fronteira de palavra e sempre com "…" no fim, deixa claro que há mais texto por trás do link.
function truncar(texto: string, maxChars: number) {
  if (texto.length <= maxChars) return texto
  const cortado = texto.slice(0, maxChars)
  const ultimoEspaco = cortado.lastIndexOf(' ')
  return `${cortado.slice(0, ultimoEspaco > 0 ? ultimoEspaco : maxChars).trimEnd()}…`
}

export function FeaturedCatalogSection({ datasets }: { datasets: FeaturedDataset[] }) {
  const [activeTab, setActiveTab] = useState('Todos')
  const [showAll, setShowAll] = useState(false)

  const tabs = useMemo(() => {
    const counts = new Map<string, number>()
    datasets.forEach((d) => {
      const key = d.category || (d.dataType === 'geoespacial' ? 'Geoespacial' : 'Alfanumérico')
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    const byCount = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)

    const result = ['Todos', ...byCount]
    if (result.length < 4) {
      if (!result.includes('Geoespacial')) result.push('Geoespacial')
      if (!result.includes('Alfanumérico')) result.push('Alfanumérico')
    }
    return result.slice(0, 7)
  }, [datasets])

  const filtered = useMemo(() => {
    if (activeTab === 'Todos') return datasets
    return datasets.filter(
      (d) =>
        d.category === activeTab ||
        (activeTab === 'Geoespacial' && d.dataType === 'geoespacial') ||
        (activeTab === 'Alfanumérico' && d.dataType === 'alfanumerico')
    )
  }, [activeTab, datasets])

  const visible = showAll ? filtered : filtered.slice(0, 3)

  return (
    <section className="font-body-stack py-9 md:py-10 bg-gradient-to-b from-[#f8faf8] to-[#eef4ef] border-t border-[#E2E8E5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-10">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1B14] mb-3 tracking-tight">Catálogo em destaque</h2>
            <p className="text-[15px] md:text-[16px] text-[#1F2A24] leading-relaxed">
              Datasets oficiais, prontos para análise. Filtre por categoria ou tipo de dados.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-end">
            <Link
              href="/dados-espaciais"
              className="inline-flex items-center gap-2 rounded-xl border border-[#CFE3D6] bg-white px-4 py-3 text-[#064E2C] font-semibold shadow-[0_8px_24px_rgba(6,78,44,0.1)] hover:bg-[#F1F8F4] hover:border-[#064E2C]/30 transition"
            >
              Dados geoespaciais
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/dados-alfanumericos"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-amber-950 font-semibold shadow-[0_8px_24px_rgba(120,80,0,0.08)] hover:bg-amber-100 transition"
            >
              Dados alfanuméricos
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 border-b border-[#CFE3D6] mb-8 overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const count =
              tab === 'Todos'
                ? datasets.length
                : datasets.filter(
                    (d) =>
                      d.category === tab ||
                      (tab === 'Geoespacial' && d.dataType === 'geoespacial') ||
                      (tab === 'Alfanumérico' && d.dataType === 'alfanumerico')
                  ).length
            const TabIcon = tab === 'Todos' ? LayoutGrid : getCategoryIcon(tab)
            return (
              <button
                key={tab}
                className={`inline-flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap border-b-2 -mb-px rounded-t-lg transition-colors ${
                  activeTab === tab
                    ? 'text-[#064E2C] border-[#064E2C] font-semibold bg-white/80'
                    : 'text-[#4A5A52] border-transparent hover:text-[#0B1B14] hover:bg-white/50'
                }`}
                onClick={() => {
                  setActiveTab(tab)
                  setShowAll(false)
                }}
              >
                <TabIcon size={15} className={activeTab === tab ? 'text-[#064E2C]' : 'text-[#8B9A91]'} aria-hidden />
                {tab}{' '}
                <span className={`text-xs font-medium ${activeTab === tab ? 'text-[#064E2C]/80' : 'text-[#6B7C72]'}`}>
                  ({count})
                </span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-7 items-stretch">
          {visible.map((d) => (
            <Link
              key={d.id}
              href={`/dataset/${d.id}`}
              className="group relative flex h-full min-h-[380px] flex-col overflow-hidden rounded-2xl border border-[#CFE3D6] bg-white p-6 shadow-[0_4px_18px_rgba(11,27,20,0.07)] transition duration-300 hover:-translate-y-0.5 hover:border-[#064E2C] hover:shadow-[0_16px_40px_rgba(6,78,44,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] focus-visible:ring-offset-2"
            >
              <span
                className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#064E2C] via-[#0a6b45] to-[#064E2C] opacity-90 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
              <div className="flex justify-between items-start gap-3 mb-4 pt-0.5">
                <span className="text-[12px] md:text-[13px] font-semibold uppercase tracking-wide text-[#1F2A24] line-clamp-1">
                  {d.source || 'Portal'}
                </span>
                <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide bg-[#064E2C] text-white px-2.5 py-1 rounded-md shadow-sm">
                  Top
                </span>
              </div>
              <h3 className="pd-card-desc-clamp-2 font-bold text-[18px] md:text-xl leading-snug text-[#0B1B14] mb-3 group-hover:text-[#064E2C] transition-colors">
                {truncar(d.title, 70)}
              </h3>
              <p className="text-[15px] leading-relaxed text-[#37403C] mb-5 flex-1">
                {truncar(d.description || 'Sem descrição disponível.', 150)}
              </p>
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="inline-flex items-center rounded-lg border border-[#CFE3D6] bg-[#F1F8F4] px-2.5 py-1.5 text-[12px] font-semibold text-[#064E2C]">
                  {d.format || 'Dados'}
                </span>
                <span className="inline-flex items-center rounded-lg border border-[#E2E8E5] bg-[#F7F9F8] px-2.5 py-1.5 text-[12px] font-semibold text-[#1F2A24]">
                  {d.category || 'Geral'}
                </span>
                <span
                  className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
                    d.dataType === 'geoespacial'
                      ? 'border border-[#CFE3D6] bg-[#E7F3EB] text-[#04361F]'
                      : 'border border-amber-200/80 bg-amber-50 text-amber-950'
                  }`}
                >
                  {d.dataType === 'geoespacial' ? 'Geoespacial' : 'Alfanumérico'}
                </span>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#E2E8E5] pt-4 text-[13px] text-[#1F2A24]">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Clock3 size={15} className="shrink-0 text-[#064E2C]" aria-hidden />
                  {d.updated}
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Download size={15} className="shrink-0 text-[#064E2C]" aria-hidden />
                  {toK(d.downloads)} downloads
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Eye size={15} className="shrink-0 text-[#064E2C]" aria-hidden />
                  {toK(d.views)} vistas
                </span>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length > 3 && (
          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="inline-flex items-center gap-2 rounded-full border border-[#CFE3D6] bg-white px-6 py-3 text-sm font-semibold text-[#064E2C] shadow-sm hover:bg-[#F1F8F4] hover:shadow-md transition"
            >
              {showAll ? 'Ver menos' : `Ver mais (${filtered.length - 3})`}
              {showAll ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
