'use client'

import { useEffect } from 'react'
import { pushRecentlyViewed } from '@/lib/recently-viewed'

export function RecordMapView({ slug, title }: { slug: string; title: string }) {
  useEffect(() => {
    pushRecentlyViewed({ id: slug, title, href: `/maps/${slug}`, dataType: 'map' })
    void fetch(`/api/maps/${slug}/view`, { method: 'POST' }).catch(() => {})
  }, [slug, title])

  return null
}
