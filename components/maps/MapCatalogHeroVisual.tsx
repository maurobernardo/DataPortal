import Link from 'next/link'
import { ArrowRight, Check, MapPin } from 'lucide-react'
import {
  MAP_EXPERIENCE_LABELS,
  type PublicMapDashboard,
} from '@/lib/maps-catalog'
import type { PreviewMapa } from '@/lib/maps-preview-data'

type MapCatalogHeroVisualProps = {
  map: PublicMapDashboard
  /** Pontos reais projectados (ver lib/maps-preview-data.ts) — só existe quando há uma função
   *  dedicada para o tipo de mapa em destaque. Sem isto, nunca se desenha um mapa falso: usa-se um
   *  fundo neutro em vez de fingir dados que não existem. */
  preview?: PreviewMapa | null
}

/** Pré-visualização compacta do hero — mapa + dashboard */
export function MapCatalogHeroVisual({ map, preview }: MapCatalogHeroVisualProps) {
  const exp = MAP_EXPERIENCE_LABELS[map.experienceType]
  const highlights = (map.highlights ?? []).slice(0, 3)
  const pontos = preview?.pontos ?? []
  const temPreviewReal = pontos.length > 0

  return (
    <div className="mp-hero-visual">
      <div className="mp-hero-visual-canvas">
        {temPreviewReal ? (
          <>
            <svg
              className="mp-hero-visual-svg"
              viewBox="0 0 100 80"
              preserveAspectRatio="xMidYMid slice"
              role="img"
              aria-label={`Distribuição real de ${pontos.length} unidades usadas no mapa, coloridas por ${preview!.rotuloCamada}`}
            >
              <rect width="100" height="80" fill="#04361f" />
              {pontos.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={pontos.length > 50 ? 0.9 : 2.1}
                  fill={preview!.legenda[p.corIndice]?.cor ?? '#4FAE75'}
                  opacity={0.92}
                />
              ))}
            </svg>
            <div className="mp-hero-visual-layer-label">{preview!.rotuloCamada}</div>
            <div className="mp-hero-visual-legend" aria-hidden>
              {preview!.legenda.map((l) => (
                <span key={l.rotulo} className="mp-hero-visual-legend-item">
                  <span className="mp-hero-visual-legend-dot" style={{ background: l.cor }} />
                  <small>{l.rotulo}</small>
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="mp-hero-visual-svg mp-hero-visual-fallback" aria-hidden />
        )}

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
