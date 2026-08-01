'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MapRequestButton } from '@/components/maps/MapRequestButton'
import { FavoriteButton } from '@/components/FavoriteButton'

type MapDetailToolbarProps = {
  map: {
    title: string
    slug: string
    coverage?: string
    description?: string
  }
}

export function MapDetailToolbar({ map }: MapDetailToolbarProps) {
  const [favorited, setFavorited] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/entity-favorites/ids?entityType=map')
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return
        setFavorited(Array.isArray(data?.ids) && data.ids.includes(map.slug))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [map.slug])

  return (
    <div className="mp-detail-toolbar">
      <Link href="/maps" className="mp-detail-nav-card">
        <span className="mp-detail-nav-icon" aria-hidden>
          <ArrowLeft className="size-5" strokeWidth={2.25} />
        </span>
        <span className="mp-detail-nav-text">
          <span className="mp-detail-nav-label">Mapas inteligentes</span>
          <span className="mp-detail-nav-title">Voltar ao catálogo</span>
        </span>
      </Link>

      <div className="mp-detail-toolbar-actions">
        <FavoriteButton
          entityType="map"
          entityId={map.slug}
          initialFavorited={favorited}
          className="mp-detail-favorite-btn"
        />
        <MapRequestButton
          map={map}
          className="mp-btn mp-btn-primary mp-detail-request-btn"
          label="Solicitar informação"
        />
      </div>
    </div>
  )
}
