import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Globe,
  LayoutDashboard,
  Map,
  MapPinned,
} from 'lucide-react'
import { MapRequestButton } from '@/components/maps/MapRequestButton'
import {
  MAP_EXPERIENCE_LABELS,
  type MapExperienceType,
  type PublicMapDashboard,
} from '@/lib/maps-catalog'

const EXPERIENCE_ICONS: Record<MapExperienceType, typeof Map> = {
  map: MapPinned,
  dashboard: LayoutDashboard,
  'map-dashboard': Map,
}

export function MapCard({ map }: { map: PublicMapDashboard }) {
  const exp = MAP_EXPERIENCE_LABELS[map.experienceType]
  const ExpIcon = EXPERIENCE_ICONS[map.experienceType]
  const highlights = (map.highlights ?? []).slice(0, 2)

  return (
    <article className="mp-card">
      <div className="mp-card-thumb" aria-hidden>
        <ExpIcon className="mp-card-thumb-icon" strokeWidth={1.5} />
        <span className={`mp-card-type mp-card-type--${map.experienceType}`}>
          {exp.short}
        </span>
        <div className="mp-card-badges">
          {map.badges.slice(0, 2).map((b) => (
            <span key={b} className="mp-card-badge">
              {b}
            </span>
          ))}
        </div>
      </div>

      <div className="mp-card-body">
        <div className="mp-card-head">
          <span className="mp-card-category">{map.category}</span>
          <span className="mp-card-type-inline" title={exp.description}>
            {exp.label}
          </span>
        </div>
        <h3 className="mp-card-title">
          <Link href={`/maps/${map.slug}`}>{map.title}</Link>
        </h3>
        {map.subtitle ? <p className="mp-card-sub">{map.subtitle}</p> : null}

        {highlights.length > 0 ? (
          <ul className="mp-card-highlights">
            {highlights.map((h) => (
              <li key={h}>
                <BarChart3 className="size-3 shrink-0" aria-hidden />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mp-card-desc">{map.description}</p>
        )}

        <ul className="mp-card-meta">
          <li>
            <Globe className="size-3.5 shrink-0" aria-hidden />
            <span>{map.coverage}</span>
          </li>
        </ul>

        <div className="mp-card-actions">
          <Link href={`/maps/${map.slug}`} className="mp-btn mp-btn-outline">
            Abrir experiência
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <MapRequestButton
            map={{
              title: map.title,
              slug: map.slug,
              coverage: map.coverage,
              description: map.description,
            }}
            className="mp-btn mp-btn-ghost"
          />
        </div>
      </div>
    </article>
  )
}
