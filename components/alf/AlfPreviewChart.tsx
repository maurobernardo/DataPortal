'use client'

import { useMemo } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { columnLabel, inferColumnType, type AlfTablePreview } from '@/components/alf/alf-preview-utils'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend)

function parseNumber(value: string): number | null {
  const n = Number.parseFloat(String(value).trim().replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function AlfPreviewChart({ preview }: { preview: AlfTablePreview }) {
  const chart = useMemo(() => {
    const colCount = preview.columns.length
    const types = Array.from({ length: colCount }, (_, i) =>
      inferColumnType(preview.rows.map((r) => r[i] ?? ''))
    )

    const numericIdx = types.findIndex((t) => t === 'num')
    if (numericIdx === -1) return null

    const values: number[] = []
    const labels: string[] = []
    for (const row of preview.rows.slice(0, 24)) {
      const n = parseNumber(row[numericIdx] ?? '')
      if (n == null) continue
      values.push(n)
      const labelIdx = types.findIndex((t, i) => i !== numericIdx && (t === 'date' || t === 'str'))
      labels.push(labelIdx !== -1 ? String(row[labelIdx] ?? '').slice(0, 16) || `#${values.length}` : `#${values.length}`)
    }

    if (values.length < 3) return null

    const dateIdx = types.findIndex((t, i) => i !== numericIdx && t === 'date')
    return {
      kind: dateIdx !== -1 ? ('line' as const) : ('bar' as const),
      column: preview.columns[numericIdx],
      values,
      labels,
    }
  }, [preview])

  if (!chart) {
    return (
      <p className="text-sm text-[var(--pd-ink-500)] py-6 text-center">
        Sem coluna numérica suficiente na amostra para gerar um gráfico.
      </p>
    )
  }

  const data = {
    labels: chart.labels,
    datasets: [
      {
        label: columnLabel(chart.column),
        data: chart.values,
        backgroundColor: 'color-mix(in srgb, var(--pd-green-700) 55%, transparent)',
        borderColor: 'var(--pd-green-700)',
        borderWidth: chart.kind === 'line' ? 2 : 0,
        borderRadius: chart.kind === 'bar' ? 4 : undefined,
        tension: 0.3,
        pointRadius: chart.kind === 'line' ? 2 : undefined,
        fill: chart.kind === 'line',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true, font: { size: 10 } } },
      y: { beginAtZero: false, ticks: { font: { size: 10 } } },
    },
  }

  return (
    <div className="alf-detail-section">
      <div className="alf-detail-section-label">Gráfico · {columnLabel(chart.column)}</div>
      <div style={{ height: 200 }}>
        {chart.kind === 'line' ? <Line data={data} options={options} /> : <Bar data={data} options={options} />}
      </div>
      <p className="alf-preview-inspector__hint">
        Baseado na amostra ({chart.values.length} valor{chart.values.length !== 1 ? 'es' : ''}). Faça download para
        análise completa.
      </p>
    </div>
  )
}
