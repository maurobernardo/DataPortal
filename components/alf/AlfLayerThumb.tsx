'use client'

import { useEffect, useState } from 'react'
import { getCachedPreview, setCachedPreview } from '@/lib/preview-cache'

type AlfThumbData =
  | { type: 'alf-series'; column: string; values: number[] }
  | { type: 'alf-dist'; str: number; num: number; date: number }

/** Miniatura real: sparkline da primeira coluna numérica, ou distribuição de tipos de coluna. */
export function AlfLayerThumb({ index, datasetId }: { index: number; datasetId?: number }) {
  const [thumb, setThumb] = useState<AlfThumbData | null>(null)

  useEffect(() => {
    if (!datasetId) return
    let alive = true
    const cached = getCachedPreview<AlfThumbData>(datasetId, 'thumbnail')
    if (cached && (cached.type === 'alf-series' || cached.type === 'alf-dist')) {
      setThumb(cached)
      return
    }
    fetch(`/api/datasets/${datasetId}/thumbnail`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return
        setCachedPreview(datasetId, data, 'thumbnail')
        if (data?.type === 'alf-series' || data?.type === 'alf-dist') setThumb(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [datasetId])

  if (thumb?.type === 'alf-series' && thumb.values.length >= 3) {
    const values = thumb.values
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = Math.max(max - min, 1e-6)
    const w = 320
    const h = 140
    const stepX = w / (values.length - 1)
    const points = values.map((v, i) => {
      const x = i * stepX
      const y = h - 10 - ((v - min) / range) * (h - 30)
      return [x, y] as const
    })
    const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
    const areaPath = `${linePath} L${w},${h} L0,${h} Z`

    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id={`alf-sp-real-${datasetId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pd-green-700)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--pd-green-700)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#alf-sp-real-${datasetId})`} />
        <path d={linePath} stroke="var(--pd-green-700)" strokeWidth="2" fill="none" strokeLinejoin="round" />
      </svg>
    )
  }

  if (thumb?.type === 'alf-dist' && thumb.str + thumb.num + thumb.date > 0) {
    const total = thumb.str + thumb.num + thumb.date
    const segments = [
      { value: thumb.num, color: 'var(--pd-green-700)' },
      { value: thumb.date, color: 'var(--pd-accent-amber)' },
      { value: thumb.str, color: 'var(--pd-accent-blue)' },
    ].filter((s) => s.value > 0)

    const r = 48
    const circumference = 2 * Math.PI * r
    let offset = 0
    return (
      <svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {segments.map((s, i) => {
          const frac = s.value / total
          const dash = frac * circumference
          const el = (
            <circle
              key={i}
              cx="160"
              cy="70"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="10"
              strokeDasharray={`${dash},${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          )
          offset += dash
          return el
        })}
      </svg>
    )
  }

  return <AlfLayerThumbDecorative index={index} />
}

/** Miniatura decorativa (usada enquanto carrega a real, ou sem dados suficientes para um gráfico). */
function AlfLayerThumbDecorative({ index }: { index: number }) {
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
