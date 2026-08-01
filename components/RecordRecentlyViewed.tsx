'use client'

import { useEffect } from 'react'
import { pushRecentlyViewed } from '@/lib/recently-viewed'

export function RecordRecentlyViewed({
  id,
  title,
  href,
  dataType,
}: {
  id: number
  title: string
  href: string
  dataType: string
}) {
  useEffect(() => {
    pushRecentlyViewed({ id, title, href, dataType })
  }, [id, title, href, dataType])

  return null
}
