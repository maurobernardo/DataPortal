import Link from 'next/link'
import { db, countDatasets } from '@/lib/db'
import { HeroSection } from '@/components/HeroSection'
import { StatsSection } from '@/components/StatsSection'
import { AboutSection } from '@/components/AboutSection'
import { SpatialDataSection } from '@/components/SpatialDataSection'
import { FeaturesSection } from '@/components/FeaturesSection'
import { ContactsSection } from '@/components/ContactsSection'
export const dynamic = 'force-dynamic'

async function getStats() {
  try {
    const [totalDatasets, sums] = await Promise.all([
      countDatasets(),
      (async () => {
        const [rows] = await db.execute(
          'SELECT COALESCE(SUM(views), 0) as views, COALESCE(SUM(downloads), 0) as downloads FROM Dataset'
        ) as any
        return rows[0] || { views: 0, downloads: 0 }
      })(),
    ])

    return {
      datasets: totalDatasets,
      views: sums.views || 0,
      downloads: sums.downloads || 0,
    }
  } catch (error) {
    return { datasets: 0, views: 0, downloads: 0 }
  }
}

export default async function Home() {
  const stats = await getStats()

  return (
    <div className="relative overflow-hidden">
      {/* Background decorativo global */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-yellow-300 rounded-full mix-blend-multiply filter blur-2xl opacity-15 animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-2xl opacity-15 animate-float" style={{ animationDelay: '3s' }}></div>
      </div>

      <HeroSection />
      <AboutSection />
      <StatsSection 
        totalDatasets={stats.datasets}
        totalViews={stats.views}
        totalDownloads={stats.downloads}
      />
      <FeaturesSection />
      <SpatialDataSection />
      <ContactsSection />
    </div>
  )
}
