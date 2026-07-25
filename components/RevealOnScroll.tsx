'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'

interface RevealOnScrollProps {
  children: ReactNode
  delayMs?: number
  className?: string
}

export function RevealOnScroll({ children, delayMs = 0, className = '' }: RevealOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.16 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal-on-scroll ${isVisible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ ['--reveal-delay' as any]: `${delayMs}ms` }}
    >
      {children}
    </div>
  )
}
