'use client'

import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ForecastSpec } from '@/lib/ai-insights'

export function AIForecastChart({ forecast }: { forecast: ForecastSpec }) {
  const historicalRows = forecast.historical_labels.map((label, i) => ({
    label,
    historico: forecast.historical_values[i],
  }))

  const lastLabel = forecast.historical_labels[forecast.historical_labels.length - 1]
  const lastValue = forecast.historical_values[forecast.historical_values.length - 1]

  const bridgeRow =
    lastLabel !== undefined
      ? [{ label: lastLabel, previsto: lastValue, banda: [lastValue, lastValue] as [number, number] }]
      : []

  const forecastRows = forecast.forecast_labels.map((label, i) => ({
    label,
    previsto: forecast.forecast_values[i],
    banda: [forecast.forecast_lower[i], forecast.forecast_upper[i]] as [number, number],
  }))

  const data = [...historicalRows, ...bridgeRow, ...forecastRows]

  return (
    <div className="rounded-2xl border border-[#E2E8E5] bg-white p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-800">Previsão{forecast.unit ? ` (${forecast.unit})` : ''}</p>
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
          Estimativa da IA
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Area
            dataKey="banda"
            name="Intervalo de confiança"
            stroke="none"
            fill="#6B4FBB"
            fillOpacity={0.12}
            connectNulls
          />
          <Line
            dataKey="historico"
            name="Histórico"
            stroke="#064E2C"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            dataKey="previsto"
            name="Previsão"
            stroke="#6B4FBB"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={{ r: 3 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
        Projecção gerada por IA com base nos dados fornecidos, não é um modelo estatístico validado
        formalmente. Use como indicação, não como certeza.
      </p>
    </div>
  )
}
