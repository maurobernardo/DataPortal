'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Loader2 } from 'lucide-react'
import { normalizeDashboardEmbedUrl } from '@/lib/dashboard-utils'

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
