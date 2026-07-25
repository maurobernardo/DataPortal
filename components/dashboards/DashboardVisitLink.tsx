'use client'

import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

export function DashboardVisitLink({
  id,
  href,
  className,
  children,
}: {
  id: number
  href: string
  className?: string
  children?: ReactNode
}) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    void fetch(`/api/alphanumeric-dashboards/${id}/view`, { method: 'POST' }).catch(() => {})
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
