/** Miniatura decorativa para datasets tabulares (sparklines / barras). */
export function AlfLayerThumb({ index }: { index: number }) {
  const variant = index % 4
  if (variant === 0) {
    return (
      <svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id={`alf-sp-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pd-green-700)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--pd-green-700)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,95 L40,85 L80,80 L120,68 L160,58 L200,48 L240,40 L280,32 L320,24 L320,140 L0,140 Z"
          fill={`url(#alf-sp-${index})`}
        />
        <path
          d="M0,95 L40,85 L80,80 L120,68 L160,58 L200,48 L240,40 L280,32 L320,24"
          stroke="var(--pd-green-700)"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    )
  }
  if (variant === 1) {
    const bars = [40, 35, 38, 30, 28, 22, 18, 15, 12, 10]
    return (
      <svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {bars.map((h, i) => (
          <rect
            key={i}
            x={8 + i * 30}
            y={140 - h}
            width={22}
            height={h}
            fill="var(--pd-green-700)"
            opacity={0.5 + (i / bars.length) * 0.4}
            rx={2}
          />
        ))}
      </svg>
    )
  }
  if (variant === 2) {
    return (
      <svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <circle
          cx="160"
          cy="70"
          r="48"
          fill="none"
          stroke="var(--pd-green-500)"
          strokeWidth="10"
          strokeDasharray="90,120"
        />
        <circle
          cx="160"
          cy="70"
          r="48"
          fill="none"
          stroke="var(--pd-accent-amber)"
          strokeWidth="10"
          strokeDasharray="70,140"
          strokeDashoffset="-90"
        />
        <circle
          cx="160"
          cy="70"
          r="48"
          fill="none"
          stroke="var(--pd-accent-blue)"
          strokeWidth="10"
          strokeDasharray="50,160"
          strokeDashoffset="-160"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {Array.from({ length: 24 }).map((_, i) => {
        const col = i % 6
        const row = Math.floor(i / 6)
        const op = 0.25 + ((i * 7) % 10) / 15
        return (
          <rect
            key={i}
            x={col * 52 + 4}
            y={row * 34 + 4}
            width={48}
            height={30}
            fill="var(--pd-green-700)"
            opacity={op}
            rx={3}
          />
        )
      })}
    </svg>
  )
}
