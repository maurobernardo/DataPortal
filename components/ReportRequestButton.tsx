'use client'

import { Mail } from 'lucide-react'
import { useState } from 'react'

interface ReportRequestButtonProps {
  report: {
    id: number
    title: string
    year: string
    coverage: string
    author?: string | null
    partners?: string | null
  }
  email?: string
  className?: string
}

export function ReportRequestButton({
  report,
  email = 'portaldedados@data4moz.com',
  className = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed',
}: ReportRequestButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    try {
      // Registra o request no backend (melhor esforço, sem bloquear o e-mail)
      fetch('/api/report-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id }),
      }).catch(() => {
        // silencioso; não bloqueia o e-mail
      })

      const subject = `Request - Relatório completo: ${report.title} (${report.year})`
      const body =
        `Olá,\n\n` +
        `Gostaria de solicitar o relatório completo por e-mail.\n\n` +
        `Estudo: ${report.title}\n` +
        `Ano: ${report.year}\n` +
        `Cobertura: ${report.coverage}` +
        `${report.author ? `\nAutor: ${report.author}` : ''}` +
        `${report.partners ? `\nParceiro(s): ${report.partners}` : ''}\n\n` +
        `Obrigado.`

      const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`

      window.location.href = mailtoUrl
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
      aria-label={`Request do relatório completo: ${report.title}`}
    >
      <Mail className="w-4 h-4" />
      {loading ? 'A enviar…' : 'Solicitar relatório'}
    </button>
  )
}



