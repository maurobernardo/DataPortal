import type { Metadata } from 'next'
import './ai-insights.css'

import { countDatasets, findAllCategories } from '@/lib/db'
import { AIInsightsHero } from '@/components/ai-insights/AIInsightsHero'
import { AICapabilities } from '@/components/ai-insights/AICapabilities'
import {
  AIPersonas,
  AITrust,
  AIFinalCTA,
} from '@/components/ai-insights/AISections'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const totalDatasets = await countDatasets().catch(() => 0)

  return {
    title: 'AI Insights: DataPortal · Data4Moz',
    description:
      'Pergunte aos seus dados em linguagem natural. Visualizações automáticas, previsões e fontes auditáveis, sem SQL, sem GIS.',
    openGraph: {
      title: 'AI Insights: DataPortal',
      description: `Transforme os ${totalDatasets} datasets oficiais do portal em análises accionáveis com IA.`,
      url: 'https://www.dataportall.com/ai-insights',
      siteName: 'DataPortal',
      locale: 'pt_MZ',
      type: 'website',
    },
  }
}

export default async function AIInsightsPage() {
  const [totalDatasets, categories] = await Promise.all([
    countDatasets().catch(() => 0),
    findAllCategories().catch(() => []),
  ])
  const totalCategories = new Set((categories as any[]).map((c) => c.name)).size

  return (
    <div className="ai-page font-body-stack overflow-x-hidden">
      <AIInsightsHero totalDatasets={Number(totalDatasets) || 0} totalCategories={totalCategories} />
      <AICapabilities />
      <AIPersonas />
      <AITrust />
      <AIFinalCTA />
    </div>
  )
}
