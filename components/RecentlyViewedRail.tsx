'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { History } from 'lucide-react'
import { getRecentlyViewed, type RecentlyViewedEntry } from '@/lib/recently-viewed'

export function RecentlyViewedRail({ dataType }: { dataType?: string }) {
  const [entries, setEntries] = useState<RecentlyViewedEntry[]>([])

  useEffect(() => {
    const all = getRecentlyViewed()
    setEntries(dataType ? all.filter((e) => e.dataType === dataType) : all)
  }, [dataType])

  if (entries.length === 0) return null

  return (
    <div className="geo-recently-viewed">
      <span className="geo-recently-viewed-label">
        <History className="size-3.5" aria-hidden />
        Vistos recentemente
      </span>
      <div className="geo-recently-viewed-list">
        {entries.map((e) => (
          <Link key={e.id} href={e.href} className="geo-recently-viewed-chip" title={e.title}>
            {e.title}
          </Link>
        ))}
      </div>
    </div>
  )
}
