'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Download, Loader2 } from 'lucide-react'

type AnalyticsResponse = {
  days: number
  topDownloads: Array<{ id: number; title: string; downloads: number; views: number; dataType: string; format: string; year: number; source: string }>
  topViews: Array<{ id: number; title: string; views: number; downloads: number; dataType: string; format: string; year: number; source: string }>
  downloadsByDay: Array<{ day: string; downloads: number }>
}

function toCsv(rows: Array<Record<string, any>>) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: any) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
}

export function AdminAnalytics() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/admin/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        setData(d)
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [days])

  const downloadsCsv = useMemo(() => {
    if (!data) return ''
    return toCsv(data.downloadsByDay)
  }, [data])

  function exportDownloadsCsv() {
    if (!downloadsCsv) return
    const blob = new Blob([downloadsCsv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `downloads-${days}d.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
        <p className="text-gray-600">Carregando analytics…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
            <p className="text-sm text-gray-600">Top datasets e downloads por período</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
          >
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
            <option value={365}>365 dias</option>
          </select>
          <button
            type="button"
            onClick={exportDownloadsCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 font-bold text-gray-900">Top downloads</div>
          <div className="divide-y divide-gray-100">
            {(data?.topDownloads || []).map((d) => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-800 truncate">{d.title}</div>
                  <div className="text-xs text-gray-500 truncate">{d.source} • {d.year} • {d.format}</div>
                </div>
                <div className="text-sm font-bold text-green-700">{Number(d.downloads || 0).toLocaleString('pt-BR')}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 font-bold text-gray-900">Top visualizações</div>
          <div className="divide-y divide-gray-100">
            {(data?.topViews || []).map((d) => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-800 truncate">{d.title}</div>
                  <div className="text-xs text-gray-500 truncate">{d.source} • {d.year} • {d.format}</div>
                </div>
                <div className="text-sm font-bold text-green-700">{Number(d.views || 0).toLocaleString('pt-BR')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 font-bold text-gray-900">Downloads por dia ({days} dias)</div>
        <div className="p-5 text-sm text-gray-700">
          {(data?.downloadsByDay || []).length === 0 ? (
            <div className="text-gray-500">Sem dados no período.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {data!.downloadsByDay.map((r) => (
                <div key={r.day} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[10px] font-bold text-gray-500 uppercase">{r.day}</div>
                  <div className="text-lg font-extrabold text-green-700">{Number(r.downloads).toLocaleString('pt-BR')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

