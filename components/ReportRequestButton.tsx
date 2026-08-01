'use client'

import { Mail } from 'lucide-react'
import { useState } from 'react'
import { RequestInfoModal } from '@/components/RequestInfoModal'

interface ReportRequestButtonProps {
  report: {
    id: number
    title: string
    year: string
    coverage: string
    author?: string | null
    partners?: string | null
  }
  className?: string
}

export function ReportRequestButton({
  report,
  className = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed',
}: ReportRequestButtonProps) {
  const [open, setOpen] = useState(false)

  async function handleSubmit(data: { name: string; email: string; message: string }) {
    try {
      const res = await fetch('/api/report-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, ...data }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        return { ok: false, error: body?.error }
      }
      return { ok: true }
    } catch {
      return { ok: false, error: 'Falha de ligação. Tente novamente.' }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label={`Pedido do relatório completo: ${report.title}`}
      >
        <Mail className="w-4 h-4" />
        Solicitar relatório
      </button>
      {open && (
        <RequestInfoModal
          title={`Pedido: ${report.title}`}
          subtitle={`${report.year} · ${report.coverage}`}
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
