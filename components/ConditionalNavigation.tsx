'use client'

import { usePathname } from 'next/navigation'
import { Navigation } from './Navigation'

export function ConditionalNavigation() {
  const pathname = usePathname()
  
  // Não mostrar navegação no dashboard e admin (eles têm seus próprios headers)
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
    return null
  }
  
  return <Navigation />
}













