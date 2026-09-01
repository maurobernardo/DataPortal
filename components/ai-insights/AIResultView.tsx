'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Bookmark,
  Download,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  ListChecks,
  Loader2,
  MessageCircle,
  Quote,
} from 'lucide-react'
import { AIChartRenderer } from '@/components/ai-insights/AIChartRenderer'
import { AIForecastChart } from '@/components/ai-insights/AIForecastChart'
import { DatasetSubscribeButton } from '@/components/ai-insights/DatasetSubscribeButton'
import type { AiAnalysisResult, ChartSpec } from '@/lib/ai-insights'
import { downloadDataUrl, downloadSvg, svgElementToPngDataUrl } from '@/lib/svg-export'

const AIChoroplethMap = dynamic(
  () => import('@/components/ai-insights/AIChoroplethMap').then((m) => m.AIChoroplethMap),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-[#E2E8E5] bg-white p-4 h-[320px] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#064E2C]" />
      </div>
    ),
  }
)

export type AiSource = { id: number; title: string; source: string | null; year: number | string | null }
export type AiAnalysisResultWithSources = AiAnalysisResult & { sources: AiSource[] }

const CHART_TYPE_LABELS: Record<ChartSpec['type'], string> = {
  bar: 'Barras',
  line: 'Linha',
  area: 'Área',
  pie: 'Circular',
}

export function AIResultView({
  result,
  onSave,
  saving,
  saved,
  showSaveButton = true,
  allowSubscriptions = false,
}: {
  result: AiAnalysisResultWithSources
  onSave?: () => void
  saving?: boolean
  saved?: boolean
  showSaveButton?: boolean
  /** Mostra um botão "Avisar-me" por fonte — só faz sentido numa página privada e autenticada. */
  allowSubscriptions?: boolean
}) {
  const [chartType, setChartType] = useState<ChartSpec['type'] | null>(result.chart?.type ?? null)
  const [exporting, setExporting] = useState<'png' | 'svg' | 'pdf' | null>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const forecastWrapperRef = useRef<HTMLDivElement>(null)

  const effectiveChart: ChartSpec | null = result.chart
    ? { ...result.chart, type: chartType ?? result.chart.type }
    : null

  const canExportImage = Boolean(effectiveChart || result.forecast)

  async function handleExportPng() {
    const svg = chartWrapperRef.current?.querySelector('svg')
    if (!svg) return
    setExporting('png')
    try {
      const dataUrl = await svgElementToPngDataUrl(svg as SVGSVGElement)
      downloadDataUrl(dataUrl, 'analise-data-portal.png')
    } catch {
      /* falha silenciosa — exportação é um extra, não crítico */
    } finally {
      setExporting(null)
    }
  }

  function handleExportSvg() {
    const svg = chartWrapperRef.current?.querySelector('svg')
    if (!svg) return
    downloadSvg(svg as SVGSVGElement, 'analise-data-portal.svg')
  }

  async function handleExportPdf() {
    setExporting('pdf')
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const marginX = 14
      const pageWidth = 210
      const maxWidth = pageWidth - marginX * 2
      let y = 18

      doc.setFontSize(15)
      doc.text('Data Portal: Análise de dados com IA', marginX, y)
      y += 9

      doc.setFontSize(10)
      doc.setTextColor(40)
      const narrativeLines = doc.splitTextToSize(result.narrative, maxWidth)
      doc.text(narrativeLines, marginX, y)
      y += narrativeLines.length * 5 + 6

      if (result.key_findings.length > 0) {
        doc.setFontSize(12)
        doc.setTextColor(6, 78, 44)
        doc.text('Principais conclusões', marginX, y)
        y += 6
        doc.setFontSize(10)
        doc.setTextColor(40)
        for (const finding of result.key_findings) {
          const lines = doc.splitTextToSize(`•  ${finding}`, maxWidth)
          if (y + lines.length * 5 > 280) {
            doc.addPage()
            y = 18
          }
          doc.text(lines, marginX, y)
          y += lines.length * 5 + 2
        }
        y += 4
      }

      if (result.recommendation) {
        if (y > 260) {
          doc.addPage()
          y = 18
        }
        doc.setFontSize(12)
        doc.setTextColor(6, 78, 44)
        doc.text('Recomendação', marginX, y)
        y += 6
        doc.setFontSize(10)
        doc.setTextColor(40)
        const lines = doc.splitTextToSize(result.recommendation, maxWidth)
        doc.text(lines, marginX, y)
        y += lines.length * 5 + 6
      }

      const svg = chartWrapperRef.current?.querySelector('svg')
      if (svg) {
        try {
          const dataUrl = await svgElementToPngDataUrl(svg as SVGSVGElement)
          if (y > 190) {
            doc.addPage()
            y = 18
          }
          doc.addImage(dataUrl, 'PNG', marginX, y, maxWidth, (maxWidth * 260) / 600)
          y += (maxWidth * 260) / 600 + 8
        } catch {
          /* imagem é um extra — falha não bloqueia o resto do PDF */
        }
      }

      const forecastSvg = forecastWrapperRef.current?.querySelector('svg')
      if (forecastSvg) {
        try {
          if (y > 230) {
            doc.addPage()
            y = 18
          }
          doc.setFontSize(12)
          doc.setTextColor(6, 78, 44)
          doc.text('Previsão', marginX, y)
          y += 6
          const dataUrl = await svgElementToPngDataUrl(forecastSvg as SVGSVGElement)
          if (y > 190) {
            doc.addPage()
            y = 18
          }
          doc.addImage(dataUrl, 'PNG', marginX, y, maxWidth, (maxWidth * 260) / 600)
          y += (maxWidth * 260) / 600 + 8
        } catch {
          /* imagem é um extra — falha não bloqueia o resto do PDF */
        }
      }

      if (result.map && result.map.values.length > 0) {
        if (y > 250) {
          doc.addPage()
          y = 18
        }
        doc.setFontSize(12)
        doc.setTextColor(6, 78, 44)
        doc.text(`Mapa por ${result.map.unit_type}`, marginX, y)
        y += 7
        doc.setFontSize(9)
        doc.setTextColor(40)
        const sortedValues = [...result.map.values].sort((a, b) => b.value - a.value)
        for (const v of sortedValues) {
          if (y > 285) {
            doc.addPage()
            y = 18
          }
          const line = `${v.name}`
          const valueText = v.value.toLocaleString('pt-PT')
          doc.text(line, marginX, y)
          doc.text(valueText, marginX + maxWidth - doc.getTextWidth(valueText), y)
          y += 5
        }
        y += 4
      }

      if (result.sources.length > 0) {
        if (y > 260) {
          doc.addPage()
          y = 18
        }
        doc.setFontSize(11)
        doc.setTextColor(6, 78, 44)
        doc.text('Fontes', marginX, y)
        y += 6
        doc.setFontSize(9)
        doc.setTextColor(90)
        for (const s of result.sources) {
          const line = `- ${s.title}, ${s.source || 'Fonte não especificada'} (${s.year ?? 'N/D'})`
          const lines = doc.splitTextToSize(line, maxWidth)
          if (y + lines.length * 5 > 285) {
            doc.addPage()
            y = 18
          }
          doc.text(lines, marginX, y)
          y += lines.length * 5 + 1
        }
      }

      doc.save('relatorio-data-portal.pdf')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Resposta principal */}
      <div className="rounded-2xl border border-[#E2E8E5] bg-gradient-to-br from-white to-[#F8FAF9] p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#064E2C]/70">
            <Quote className="w-3.5 h-3.5" />
            Resposta da IA
          </span>
        </div>
        <p className="text-[15px] text-gray-800 leading-relaxed whitespace-pre-line">{result.narrative}</p>
      </div>

      {result.key_findings.length > 0 && (
        <div className="rounded-2xl border border-[#E2E8E5] bg-white p-5 md:p-6 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">
            <ListChecks className="w-4 h-4 text-[#064E2C]" />
            Principais conclusões
          </p>
          <ul className="space-y-2.5">
            {result.key_findings.map((f, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F1F8F4] text-[#064E2C] text-[11px] font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.recommendation && (
        <div className="rounded-2xl border border-[#CFE3D6] bg-gradient-to-br from-[#F1F8F4] to-[#E7F3EB] p-5 md:p-6 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#064E2C] mb-2">
            <Lightbulb className="w-4 h-4" />
            Recomendação
          </p>
          <p className="text-sm text-[#0B3320] leading-relaxed">{result.recommendation}</p>
        </div>
      )}

      {effectiveChart && (
        <div className="rounded-2xl border border-[#E2E8E5] bg-white p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Visualização</p>
            <div className="flex gap-1">
              {(['bar', 'line', 'area', 'pie'] as ChartSpec['type'][]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setChartType(t)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    (chartType ?? result.chart?.type) === t
                      ? 'bg-[#064E2C] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {CHART_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div ref={chartWrapperRef}>
            <AIChartRenderer chart={effectiveChart} />
          </div>
        </div>
      )}

      {result.forecast && (
        <div ref={forecastWrapperRef}>
          <AIForecastChart forecast={result.forecast} />
        </div>
      )}

      {result.map && <AIChoroplethMap map={result.map} />}

      {result.sources.length > 0 && (
        <div className="rounded-2xl border border-[#E2E8E5] bg-white p-5 md:p-6 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">
            <MessageCircle className="w-4 h-4 text-[#064E2C]" />
            Fontes
          </p>
          <ul className="space-y-2">
            {result.sources.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <Link href={`/dataset/${s.id}`} className="text-sm text-[#064E2C] hover:underline font-semibold">
                  {s.title}
                </Link>
                <span className="text-xs text-gray-500">
                  , {s.source || 'Fonte não especificada'} · {s.year ?? 'N/D'}
                </span>
                {allowSubscriptions && <DatasetSubscribeButton datasetId={s.id} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-[#E2E8E5] bg-[#FAFBFA] p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {showSaveButton && onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saving || saved}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE3D6] bg-[#F1F8F4] px-3.5 py-2 text-xs font-semibold text-[#064E2C] hover:bg-[#064E2C] hover:text-white transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
              {saved ? 'Guardado' : 'Guardar no meu dashboard'}
            </button>
          )}
          {canExportImage && (
            <>
              <button
                type="button"
                onClick={handleExportPng}
                disabled={exporting !== null}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-60"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                PNG
              </button>
              <button
                type="button"
                onClick={handleExportSvg}
                disabled={exporting !== null}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" />
                SVG
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-60"
          >
            {exporting === 'pdf' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            Relatório PDF
          </button>
        </div>
      </div>
    </div>
  )
}
