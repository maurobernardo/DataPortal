'use client'

import { useEffect, useState } from 'react'
import { getCachedPreview, setCachedPreview } from '@/lib/preview-cache'

type GeoThumbData = { type: 'geo'; bbox: [number, number, number, number]; paths: [number, number][][] }

/** Miniatura real baseada na geometria do ficheiro (bbox + traçado simplificado). */
export function GeoLayerThumb({ index, datasetId }: { index: number; datasetId?: number }) {
  const [thumb, setThumb] = useState<GeoThumbData | null>(null)

  useEffect(() => {
    if (!datasetId) return
    let alive = true
    const cached = getCachedPreview<GeoThumbData>(datasetId, 'thumbnail')
    if (cached && cached.type === 'geo') {
      setThumb(cached)
      return
    }
    fetch(`/api/datasets/${datasetId}/thumbnail`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return
        setCachedPreview(datasetId, data, 'thumbnail')
        if (data?.type === 'geo' && Array.isArray(data.paths) && data.paths.length > 0) {
          setThumb(data)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [datasetId])

  if (thumb) {
    const [minX, minY, maxX, maxY] = thumb.bbox
    const w = Math.max(maxX - minX, 1e-6)
    const h = Math.max(maxY - minY, 1e-6)
    const pad = 0.1
    const vbX = minX - w * pad
    const vbY = minY - h * pad
    const vbW = w * (1 + pad * 2)
    const vbH = h * (1 + pad * 2)
    const strokeWidth = Math.max(vbW, vbH) / 180

    return (
      <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="color-mix(in srgb, var(--pd-green-50) 80%, white)" />
        <g transform={`translate(0, ${2 * vbY + vbH}) scale(1, -1)`}>
          {thumb.paths.map((path, i) => (
            <polyline
              key={i}
              points={path.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke="var(--pd-green-700)"
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.85}
            />
          ))}
        </g>
      </svg>
    )
  }

  return <GeoLayerThumbDecorative index={index} />
}

/** Miniatura decorativa (usada enquanto carrega a real, ou quando o dataset não tem geometria disponível). */
function GeoLayerThumbDecorative({ index }: { index: number }) {
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
