'use client'

import { Mail } from 'lucide-react'
import { useState } from 'react'
import { buildMapRequestMailto } from '@/lib/site'

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
  const [loading, setLoading] = useState(false)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const { href } = buildMapRequestMailto(map)
      window.location.href = href
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
      aria-label={`Pedido relacionado com o mapa: ${map.title}`}
    >
      <Mail className="size-4 shrink-0" aria-hidden />
      {loading ? 'A abrir…' : label}
    </button>
  )
}
