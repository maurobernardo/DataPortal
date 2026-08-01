'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'

export function FavoriteButton({
  datasetId,
  entityType,
  entityId,
  initialFavorited,
  className,
}: {
  /** Atalho para datasets (usa /api/favorites/[id]). */
  datasetId?: number
  /** Para dashboards/relatórios/mapas (usa /api/entity-favorites/[entityType]/[entityId]). */
  entityType?: 'dashboard' | 'report' | 'map'
  entityId?: string | number
  initialFavorited: boolean
  className?: string
}) {
  const router = useRouter()
  const [favorited, setFavorited] = useState(initialFavorited)
  const [busy, setBusy] = useState(false)

  const apiPath =
    datasetId != null
      ? `/api/favorites/${datasetId}`
      : `/api/entity-favorites/${entityType}/${encodeURIComponent(String(entityId))}`

  // `initialFavorited` chega de forma assíncrona (o catálogo busca a lista de favoritos
  // depois do primeiro render) — sincroniza quando o valor real chega.
  useEffect(() => {
    setFavorited(initialFavorited)
  }, [initialFavorited])

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    const next = !favorited
    setFavorited(next)
    try {
      const res = await fetch(apiPath, { method: next ? 'POST' : 'DELETE' })
      if (res.status === 401) {
        setFavorited(!next)
        router.push('/login')
        return
      }
      if (!res.ok) {
        setFavorited(!next)
      }
    } catch {
      setFavorited(!next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorited}
      aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      title={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={`geo-favorite-btn${favorited ? ' active' : ''}${className ? ` ${className}` : ''}`}
    >
      <Heart className="size-3.5" fill={favorited ? 'currentColor' : 'none'} aria-hidden />
    </button>
  )
}
