'use client'

import { usePathname } from 'next/navigation'
import { Navigation } from './Navigation'

export function ConditionalNavigation() {
  const pathname = usePathname()
  
  // Não mostrar navegação no dashboard, admin ou visualização full-screen de mapas
  const isMainDashboard = pathname === '/dashboard' || pathname?.startsWith('/dashboard/')
  const isMapViewer = pathname?.startsWith('/maps/') && pathname !== '/maps'
  if (isMainDashboard || pathname?.startsWith('/admin') || isMapViewer) {
    return null
  }
  
  return <Navigation />
}













