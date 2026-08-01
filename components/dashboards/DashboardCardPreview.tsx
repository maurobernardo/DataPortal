'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react'
import { normalizeDashboardEmbedUrl } from '@/lib/dashboard-utils'

const EMBED_TIMEOUT_MS = 9000

function hasUsablePreviewImage(path?: string | null) {
  if (!path?.trim()) return false
  return path.startsWith('/') || /^https?:\/\//i.test(path.trim())
}

export function DashboardCardPreview({
  title,
  url,
  previewImagePath,
  compact = false,
  large = false,
  featured = false,
  fill = false,
  interactive = false,
}: {
  title: string
  url: string
  previewImagePath?: string | null
  compact?: boolean
  /** Pré-visualização alta (galeria e cards principais) */
  large?: boolean
  featured?: boolean
  fill?: boolean
  interactive?: boolean
}) {
  const embedUrl = useMemo(() => normalizeDashboardEmbedUrl(url), [url])
  const [imageOk, setImageOk] = useState(true)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [embedTimedOut, setEmbedTimedOut] = useState(false)

  // Muitos provedores (Tableau Public, Looker Studio, etc.) bloqueiam o embed via
  // X-Frame-Options/CSP sem disparar onError no iframe — o spinner ficaria eterno.
  // Um timeout é a única forma prática de detectar isto e mostrar uma alternativa.
  useEffect(() => {
    if (iframeLoaded) return
    const timer = setTimeout(() => setEmbedTimedOut(true), EMBED_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [iframeLoaded, embedUrl])

  const sizeClass = fill
    ? 'db-preview--fill'
    : featured
      ? 'db-preview--featured'
      : large
        ? 'db-preview--large'
        : compact
          ? 'db-preview--compact'
          : 'db-preview--default'

  const showImage = hasUsablePreviewImage(previewImagePath) && imageOk

  if (showImage && previewImagePath) {
    return (
      <div className={`db-card-preview ${sizeClass} relative db-card-preview-image`}>
        <img
          src={previewImagePath}
          alt={`Pré-visualização ${title}`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImageOk(false)}
        />
      </div>
    )
  }

  if (embedTimedOut && !iframeLoaded) {
    return (
      <div className={`db-card-preview ${sizeClass} db-card-preview-fallback`}>
        <AlertTriangle className="size-6 text-amber-600" aria-hidden />
        <p>Pré-visualização indisponível para este painel.</p>
        <Link href={url} target="_blank" rel="noreferrer" className="db-card-preview-fallback-link">
          <ExternalLink className="size-3.5" aria-hidden />
          Abrir no site oficial
        </Link>
      </div>
    )
  }

  return (
    <div
      className={`db-card-preview ${sizeClass} db-card-preview-embed${interactive ? ' db-card-preview-interactive' : ''}`}
    >
      {!iframeLoaded && (
        <div className="db-card-preview-loading" aria-hidden>
          <Loader2 className="size-6 animate-spin text-[var(--pd-green-700)]" />
        </div>
      )}
      <iframe
        src={embedUrl}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        allow="fullscreen; geolocation"
        className="db-card-preview-iframe"
        onLoad={() => setIframeLoaded(true)}
      />
      {!interactive && (
        <Link
          href={url}
          target="_blank"
          rel="noreferrer"
          className="db-card-preview-open"
          aria-label={`Abrir ${title} no site oficial`}
        >
          <ExternalLink className="size-3.5" aria-hidden />
          Abrir
        </Link>
      )}
    </div>
  )
}
