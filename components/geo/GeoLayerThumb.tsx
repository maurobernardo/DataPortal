/** Miniatura decorativa SVG (sem dados fictícios — padrão visual por índice). */
export function GeoLayerThumb({ index }: { index: number }) {
  const variant = index % 4
  if (variant === 0) {
    return (
      <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g stroke="color-mix(in srgb, var(--pd-green-700) 25%, transparent)" strokeWidth="0.5">
          <path d="M40,30 L120,20 L160,55 L100,80 L50,70 Z" fill="var(--pd-green-700)" opacity="0.7" />
          <path d="M120,20 L200,40 L220,80 L160,55 Z" fill="var(--pd-green-700)" opacity="0.85" />
          <path d="M50,70 L100,80 L110,120 L60,130 Z" fill="var(--pd-green-700)" opacity="0.5" />
        </g>
        <circle cx="90" cy="60" r="3" fill="var(--pd-accent-red)" />
        <circle cx="170" cy="80" r="3" fill="var(--pd-accent-red)" />
      </svg>
    )
  }
  if (variant === 1) {
    return (
      <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width="320" height="160" fill="color-mix(in srgb, var(--pd-green-50) 80%, white)" />
        <g stroke="var(--pd-green-700)" strokeWidth="1.5" fill="none" opacity="0.85">
          <path d="M0,20 Q80,40 120,80 Q160,120 200,140 L320,100" />
          <path d="M40,0 Q60,50 80,110" />
        </g>
      </svg>
    )
  }
  if (variant === 2) {
    return (
      <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g stroke="color-mix(in srgb, var(--pd-green-700) 40%, transparent)" strokeWidth="0.8">
          <path d="M40,20 L130,15 L160,55 L100,80 L50,70 Z" fill="var(--pd-green-700)" opacity="0.4" />
          <path d="M130,15 L210,25 L230,60 L160,55 Z" fill="var(--pd-green-700)" opacity="0.5" />
        </g>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <g stroke="var(--pd-accent-amber)" strokeWidth="1.2" fill="none" opacity="0.8">
        <path d="M0,80 L320,80" />
        <path d="M80,0 L80,160" />
        <path d="M0,40 L320,40" />
        <path d="M0,120 L320,120" />
      </g>
    </svg>
  )
}
