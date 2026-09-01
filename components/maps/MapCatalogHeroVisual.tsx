import Link from 'next/link'
import { ArrowRight, Check, MapPin } from 'lucide-react'
import {
  MAP_EXPERIENCE_LABELS,
  type PublicMapDashboard,
} from '@/lib/maps-catalog'
import type { PreviewMapa } from '@/lib/maps-preview-data'

type MapCatalogHeroVisualProps = {
  map: PublicMapDashboard
  preview?: PreviewMapa | null
}

/**
 * Pré-visualização do hero: em vez de um esboço abstracto (pontos genéricos), mostra o próprio
 * ecrã do mapa/dashboard real, reduzido, dentro de um iframe — o que o utilizador vê aqui é
 * exactamente o que vai encontrar ao abrir. `pointer-events: none` no iframe porque é só uma
 * pré-visualização: os filtros não precisam de funcionar aqui, só em "/maps/[slug]" a sério.
 */
export function MapCatalogHeroVisual({ map }: MapCatalogHeroVisualProps) {
  const exp = MAP_EXPERIENCE_LABELS[map.experienceType]
  const highlights = (map.highlights ?? []).slice(0, 3)

  return (
    <div className="mp-hero-visual">
      <div className="mp-hero-visual-canvas">
        <div className="mp-hero-visual-iframe-wrap" aria-hidden>
          <iframe
            src={`/maps/${map.slug}`}
            title=""
            tabIndex={-1}
            loading="lazy"
          />
        </div>

        <div className="mp-hero-visual-panel">
          <div className="mp-hero-visual-tags">
            <span className="mp-hero-visual-type">{exp.short}</span>
            <span className="mp-hero-visual-tag">
              <MapPin className="size-3" aria-hidden />
              {map.category}
            </span>
          </div>
          <h3 className="mp-hero-visual-title">{map.title}</h3>
          <p className="mp-hero-visual-desc">{map.subtitle}</p>
          {highlights.length > 0 ? (
            <ul className="mp-hero-visual-list">
              {highlights.map((h) => (
                <li key={h}>
                  <Check className="size-3" aria-hidden />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <Link href={`/maps/${map.slug}`} className="mp-hero-visual-cta">
            Explorar
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  )
}
