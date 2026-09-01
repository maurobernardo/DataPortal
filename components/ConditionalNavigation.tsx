'use client'

import { usePathname } from 'next/navigation'
import { Navigation } from './Navigation'

export function ConditionalNavigation() {
  const pathname = usePathname()
  
  // Não mostrar navegação no dashboard, admin, visualização full-screen de mapas
  // ou páginas de partilha de análises de IA (pensadas para embed/iframe)
  const isMainDashboard = pathname === '/dashboard' || pathname?.startsWith('/dashboard/')
  const isMapViewer = pathname?.startsWith('/maps/') && pathname !== '/maps'
  const isAiShare = pathname?.startsWith('/ai-insights/share/')
  const isEmbed = pathname?.startsWith('/embed/')
  if (isMainDashboard || pathname?.startsWith('/admin') || isMapViewer || isAiShare || isEmbed) {
    return null
  }
  
  return <Navigation />
}













