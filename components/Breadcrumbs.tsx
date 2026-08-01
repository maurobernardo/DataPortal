import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export type BreadcrumbItem = {
  label: string
  href?: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Localização actual" className="pd-breadcrumbs">
      <Link href="/" className="pd-breadcrumbs-item pd-breadcrumbs-home" aria-label="Início">
        <Home className="size-3.5" aria-hidden />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="pd-breadcrumbs-segment">
            <ChevronRight className="size-3.5 pd-breadcrumbs-sep" aria-hidden />
            {item.href && !isLast ? (
              <Link href={item.href} className="pd-breadcrumbs-item">
                {item.label}
              </Link>
            ) : (
              <span className="pd-breadcrumbs-item pd-breadcrumbs-current" aria-current="page">
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
