'use client'

import { Mail } from 'lucide-react'
import { useState } from 'react'
import { RequestInfoModal } from '@/components/RequestInfoModal'

type MapRequestButtonProps = {
  map: {
    title: string
    slug: string
    coverage?: string
    description?: string
  }
  className?: string
  label?: string
}

export function MapRequestButton({
  map,
  className = 'mp-btn mp-btn-primary',
  label = 'Solicitar acesso',
}: MapRequestButtonProps) {
  const [open, setOpen] = useState(false)

  async function handleSubmit(data: { name: string; email: string; message: string }) {
    try {
      const res = await fetch('/api/map-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: map.slug, ...data }),
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
        aria-label={`Pedido relacionado com o mapa: ${map.title}`}
      >
        <Mail className="size-4 shrink-0" aria-hidden />
        {label}
      </button>
      {open && (
        <RequestInfoModal
          title={`Pedido: ${map.title}`}
          subtitle={map.coverage}
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
