import type { Metadata } from 'next'
import './ai-insights.css'

import { AIInsightsHero } from '@/components/ai-insights/AIInsightsHero'
import { AICapabilities } from '@/components/ai-insights/AICapabilities'
import { AIWorkspaceDemo } from '@/components/ai-insights/AIWorkspaceDemo'
import {
  AIPersonas,
  AIPricingMatrix,
  AITrust,
  AIFinalCTA,
} from '@/components/ai-insights/AISections'

export const metadata: Metadata = {
  title: 'AI Insights — DataPortal · Data4Moz',
  description:
    'Pergunte aos seus dados em linguagem natural. Visualizações automáticas, previsões e federação de fontes externas — sem SQL, sem GIS.',
  openGraph: {
    title: 'AI Insights — DataPortal',
    description: 'Transforme 12.847 datasets nacionais em análises accionáveis.',
    url: 'https://www.dataportall.com/ai-insights',
    siteName: 'DataPortal',
    locale: 'pt_MZ',
    type: 'website',
  },
}

export default function AIInsightsPage() {
  return (
    <div className="ai-page font-body-stack overflow-x-hidden">
      <AIInsightsHero />
      <AICapabilities />
      <AIWorkspaceDemo />
      <AIPersonas />
      <AIPricingMatrix />
      <AITrust />
      <AIFinalCTA />
    </div>
  )
}
