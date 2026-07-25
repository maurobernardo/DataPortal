'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { normalizeDashboardEmbedUrl } from '@/lib/dashboard-utils'

function hasUsablePreviewImage(path?: string | null) {
  if (!path?.trim()) return false
  return path.startsWith('/') || /^https?:\/\//i.test(path.trim())
}

export function ExternalDashboardPreview({
  title,
  url,
  previewImagePath,
}: {
  title: string
  url: string
  previewImagePath?: string | null
}) {
  const embedUrl = useMemo(() => normalizeDashboardEmbedUrl(url), [url])
  const [imageOk, setImageOk] = useState(true)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  if (hasUsablePreviewImage(previewImagePath) && imageOk && previewImagePath) {
    return (
      <div className="w-full h-[560px] rounded-xl overflow-hidden border border-gray-200 bg-gray-100 relative">
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
    <div className="w-full h-[560px] rounded-xl overflow-hidden border border-gray-200 bg-gray-100 relative">
      {!iframeLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--pd-green-50)]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--pd-green-700)]" />
        </div>
      )}
      <iframe
        src={embedUrl}
        title={title}
        className="w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        allow="fullscreen; geolocation"
        onLoad={() => setIframeLoaded(true)}
      />
    </div>
  )
}
