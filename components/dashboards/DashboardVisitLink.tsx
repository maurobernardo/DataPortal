'use client'

import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { pushRecentlyViewed } from '@/lib/recently-viewed'

export function DashboardVisitLink({
  id,
  href,
  title,
  className,
  children,
}: {
  id: number
  href: string
  /** Nome do dashboard — regista em "vistos recentemente" quando presente. */
  title?: string
  className?: string
  children?: ReactNode
}) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    void fetch(`/api/alphanumeric-dashboards/${id}/view`, { method: 'POST' }).catch(() => {})
    if (title) {
      pushRecentlyViewed({ id, title, href: '/dashboards-alfanumericos', dataType: 'dashboard' })
    }
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <a href={href} onClick={handleClick} className={className} rel="noreferrer">
      {children ?? (
        <>
          Ver mais
          <ArrowRight className="size-4" aria-hidden />
        </>
      )}
    </a>
  )
}
