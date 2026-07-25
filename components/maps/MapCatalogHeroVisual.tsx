import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'
import {
  MAP_EXPERIENCE_LABELS,
  type PublicMapDashboard,
} from '@/lib/maps-catalog'

type MapCatalogHeroVisualProps = {
  map: PublicMapDashboard
}

/** Pré-visualização compacta do hero — mapa + dashboard */
export function MapCatalogHeroVisual({ map }: MapCatalogHeroVisualProps) {
  const exp = MAP_EXPERIENCE_LABELS[map.experienceType]
  const highlights = (map.highlights ?? []).slice(0, 3)
  const dots = [
    { x: 18, y: 42, c: '#22c55e', r: 5 },
    { x: 38, y: 38, c: '#eab308', r: 6 },
    { x: 55, y: 35, c: '#ef4444', r: 4 },
    { x: 72, y: 58, c: '#eab308', r: 4 },
    { x: 48, y: 52, c: '#f97316', r: 5 },
    { x: 68, y: 40, c: '#84cc16', r: 4 },
  ]

  return (
    <div className="mp-hero-visual">
      <div className="mp-hero-visual-canvas">
        <svg
          className="mp-hero-visual-svg"
          viewBox="0 0 100 80"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <defs>
            <linearGradient id="mp-hero-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#04361f" />
              <stop offset="100%" stopColor="#0a5c38" />
            </linearGradient>
          </defs>
          <rect width="100" height="80" fill="url(#mp-hero-bg)" />
          <path
            d="M12 28 Q22 18 35 22 T58 20 T82 32 T88 48 T72 62 T48 68 T28 58 T14 42 Z"
            fill="rgba(255,255,255,0.06)"
            stroke="rgba(231,243,235,0.25)"
            strokeWidth="0.8"
          />
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity={0.8} />
          ))}
        </svg>
        <div className="mp-hero-visual-legend" aria-hidden>
          <span style={{ background: '#22c55e' }} />
          <span style={{ background: '#eab308' }} />
          <span style={{ background: '#ef4444' }} />
          <small>Melhor → Pior</small>
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
            <ul className="mp-hero-visual-chips">
              {highlights.map((h) => (
                <li key={h}>{h}</li>
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
