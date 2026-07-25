'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, Check, ShieldCheck, Loader2 } from 'lucide-react'

export function DatasetDownloadTools({ datasetId }: { datasetId: number }) {
  const [copied, setCopied] = useState(false)
  const [checksum, setChecksum] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const downloadUrl = useMemo(() => `/api/download/${datasetId}`, [datasetId])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin + downloadUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // fallback simples
      const el = document.createElement('textarea')
      el.value = window.location.origin + downloadUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/datasets/${datasetId}/checksum`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return
        setChecksum(typeof data?.sha256 === 'string' ? data.sha256 : null)
      })
      .catch(() => {
        if (!alive) return
        setChecksum(null)
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [datasetId])

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Link direto</div>
        <div className="text-sm font-medium text-slate-700 truncate">{downloadUrl}</div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition"
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiado' : 'Copiar link'}
        </button>

        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <div className="text-xs text-slate-500">
            SHA256:{' '}
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                calculando…
              </span>
            ) : checksum ? (
              <span className="font-mono text-slate-700">{checksum.slice(0, 12)}…</span>
            ) : (
              <span className="text-slate-400">indisponível</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

