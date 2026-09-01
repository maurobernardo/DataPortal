'use client'

import { useEffect, useState } from 'react'
import { Loader2, Mail, MapPinned, MessageSquare } from 'lucide-react'

type SubTab = 'report' | 'map' | 'contact'

type ReportRequestRow = {
  id: number
  reportId: number
  name: string | null
  email: string | null
  message: string | null
  createdAt: string
  reportTitle: string | null
  reportYear: string | null
}

type MapRequestRow = {
  id: number
  slug: string
  name: string | null
  email: string | null
  message: string | null
  createdAt: string
}

type ContactMessageRow = {
  id: number
  name: string
  email: string
  subject: string
  message: string
  createdAt: string
}

const TABS: { id: SubTab; label: string; icon: typeof Mail }[] = [
  { id: 'report', label: 'Relatórios', icon: MessageSquare },
  { id: 'map', label: 'Mapas', icon: MapPinned },
  { id: 'contact', label: 'Contacto', icon: Mail },
]

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString('pt-PT')
  } catch {
    return value
  }
}

export function RequestsPanel() {
  const [tab, setTab] = useState<SubTab>('report')
  const [rows, setRows] = useState<(ReportRequestRow | MapRequestRow | ContactMessageRow)[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetch(`/api/admin/requests?type=${tab}`)
      .then(async (res) => {
        const data = await res.json()
        if (!alive) return
        if (!res.ok) {
          setError(data?.error || 'Erro ao carregar solicitações')
          setRows([])
          return
        }
        setRows(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (alive) setError('Erro ao carregar solicitações')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [tab])

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap shrink-0 ${
              tab === id ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          A carregar…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 py-8 text-center">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-16 text-center">Ainda não há solicitações deste tipo.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm pd-responsive-table">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5">Contacto</th>
                <th className="px-4 py-2.5">{tab === 'contact' ? 'Assunto' : tab === 'map' ? 'Mapa' : 'Relatório'}</th>
                <th className="px-4 py-2.5">Mensagem</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Data</th>
              </tr>
            </thead>
            <tbody>
              {tab === 'report' &&
                (rows as ReportRequestRow[]).map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0 align-top">
                    <td data-label="Contacto" className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{r.name || 'N/D'}</div>
                      {r.email && (
                        <a href={`mailto:${r.email}`} className="text-xs text-green-700 hover:underline">
                          {r.email}
                        </a>
                      )}
                    </td>
                    <td data-label="Relatório" className="px-4 py-3 text-gray-700">
                      {r.reportTitle || `#${r.reportId}`}
                      {r.reportYear ? ` (${r.reportYear})` : ''}
                    </td>
                    <td data-label="Mensagem" className="px-4 py-3 text-gray-600 max-w-xs truncate" title={r.message || ''}>
                      {r.message || 'N/D'}
                    </td>
                    <td data-label="Data" className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              {tab === 'map' &&
                (rows as MapRequestRow[]).map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0 align-top">
                    <td data-label="Contacto" className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{r.name || 'N/D'}</div>
                      {r.email && (
                        <a href={`mailto:${r.email}`} className="text-xs text-green-700 hover:underline">
                          {r.email}
                        </a>
                      )}
                    </td>
                    <td data-label="Mapa" className="px-4 py-3 text-gray-700">{r.slug}</td>
                    <td data-label="Mensagem" className="px-4 py-3 text-gray-600 max-w-xs truncate" title={r.message || ''}>
                      {r.message || 'N/D'}
                    </td>
                    <td data-label="Data" className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              {tab === 'contact' &&
                (rows as ContactMessageRow[]).map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0 align-top">
                    <td data-label="Contacto" className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{r.name}</div>
                      <a href={`mailto:${r.email}`} className="text-xs text-green-700 hover:underline">
                        {r.email}
                      </a>
                    </td>
                    <td data-label="Assunto" className="px-4 py-3 text-gray-700">{r.subject}</td>
                    <td data-label="Mensagem" className="px-4 py-3 text-gray-600 max-w-xs truncate" title={r.message}>
                      {r.message}
                    </td>
                    <td data-label="Data" className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
