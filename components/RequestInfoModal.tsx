'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Mail, X } from 'lucide-react'

export function RequestInfoModal({
  title,
  subtitle,
  onSubmit,
  onClose,
}: {
  title: string
  subtitle?: string
  onSubmit: (data: { name: string; email: string; message: string }) => Promise<{ ok: boolean; error?: string }>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    const result = await onSubmit({ name: name.trim(), email: email.trim(), message: message.trim() })
    setSubmitting(false)
    if (result.ok) {
      setDone(true)
    } else {
      setError(result.error || 'Não foi possível enviar o pedido. Tente novamente.')
    }
  }

  return (
    <div className="req-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="req-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="req-modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="req-modal-close">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {done ? (
          <div className="req-modal-success">
            <CheckCircle2 className="size-10 text-[var(--pd-green-700)]" aria-hidden />
            <p>Pedido enviado com sucesso. A nossa equipa entrará em contacto brevemente.</p>
            <button type="button" className="req-modal-btn-primary" onClick={onClose}>
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="req-modal-form">
            <div className="req-modal-field">
              <label htmlFor="req-modal-name">Nome</label>
              <input
                id="req-modal-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="req-modal-field">
              <label htmlFor="req-modal-email">Email</label>
              <input
                id="req-modal-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
              />
            </div>
            <div className="req-modal-field">
              <label htmlFor="req-modal-message">Mensagem (opcional)</label>
              <textarea
                id="req-modal-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={5000}
              />
            </div>

            {error && <p className="req-modal-error">{error}</p>}

            <button type="submit" className="req-modal-btn-primary" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}
              {submitting ? 'A enviar…' : 'Enviar pedido'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
