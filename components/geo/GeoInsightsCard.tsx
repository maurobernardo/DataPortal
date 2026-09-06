import { MapPinned, Ruler, Shapes } from 'lucide-react'
import type { GeoInsights } from '@/lib/geo-intelligence'

const GEOMETRY_LABELS_PT: Record<string, string> = {
  Point: 'Ponto',
  MultiPoint: 'Multiponto',
  LineString: 'Linha',
  MultiLineString: 'Multilinha',
  Polygon: 'Polígono',
  MultiPolygon: 'Multipolígono',
}

function formatNumber(n: number, unit: string) {
  return `${n.toLocaleString('pt-PT', { maximumFractionDigits: n >= 100 ? 0 : 1 })} ${unit}`
}

export function GeoInsightsCard({ insights }: { insights: GeoInsights | null }) {
  if (!insights) return null

  const hasStats = insights.totalAreaKm2 != null || insights.totalLengthKm != null || insights.centroid != null

  return (
    <div className="geo-ldp-section">
      <div className="geo-ldp-section-label">Análise automática</div>

      {/* insights.crsWarning é um aviso técnico para quem gere o catálogo (ficheiro com sistema
          de coordenadas suspeito) — nunca mostrado aqui, esta página é pública. Lido por quem
          consulta o catálogo, "coordenadas fora do intervalo esperado" lê-se como "os dados deste
          portal têm um erro", que é exactamente a leitura errada a evitar (mesmo princípio dos
          selos de qualidade em /admin/qualidade-dados). */}

      <div className="geo-ldp-formats mb-3">
        {insights.geometryTypes.map(({ type, count }) => (
          <span key={type} className="geo-ldp-format-chip inline-flex items-center gap-1.5">
            <Shapes className="size-3" aria-hidden />
            {GEOMETRY_LABELS_PT[type] || type} · {count}
          </span>
        ))}
      </div>

      {hasStats && (
        <div className="geo-ldp-attrs mb-3">
          {insights.totalAreaKm2 != null && (
            <div className="geo-ldp-attr">
              <div className="geo-ldp-attr-key">Área total</div>
              <div className="geo-ldp-attr-val">{formatNumber(insights.totalAreaKm2, 'km²')}</div>
            </div>
          )}
          {insights.totalLengthKm != null && (
            <div className="geo-ldp-attr">
              <div className="geo-ldp-attr-key">Extensão total</div>
              <div className="geo-ldp-attr-val">{formatNumber(insights.totalLengthKm, 'km')}</div>
            </div>
          )}
          {insights.centroid && (
            <div className="geo-ldp-attr">
              <div className="geo-ldp-attr-key">Centro geográfico</div>
              <div className="geo-ldp-attr-val inline-flex items-center gap-1">
                <MapPinned className="size-3.5 shrink-0" aria-hidden />
                {insights.centroid[1].toFixed(2)}°, {insights.centroid[0].toFixed(2)}°
              </div>
            </div>
          )}
        </div>
      )}

      {insights.coverage && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--pd-ink-700)] mb-2">
            <Ruler className="size-3.5 text-[var(--pd-green-700)]" aria-hidden />
            Cobre {insights.coverage.total} unidade{insights.coverage.total !== 1 ? 's' : ''} administrativa
            {insights.coverage.total !== 1 ? 's' : ''}
          </div>
          <div className="geo-ldp-formats">
            {insights.coverage.values.map((v) => (
              <span key={v} className="geo-ldp-format-chip">{v}</span>
            ))}
            {insights.coverage.total > insights.coverage.values.length && (
              <span className="geo-ldp-format-chip">+{insights.coverage.total - insights.coverage.values.length}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
