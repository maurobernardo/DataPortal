import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MapRequestButton } from '@/components/maps/MapRequestButton'

type MapDetailToolbarProps = {
  map: {
    title: string
    slug: string
    coverage?: string
    description?: string
  }
}

export function MapDetailToolbar({ map }: MapDetailToolbarProps) {
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

      <MapRequestButton
        map={map}
        className="mp-btn mp-btn-primary mp-detail-request-btn"
        label="Solicitar informação"
      />
    </div>
  )
}
