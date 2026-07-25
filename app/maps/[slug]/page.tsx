import { notFound } from 'next/navigation'
import { findMapBySlug } from '@/lib/maps-catalog'
import { HealthMapDashboard } from '@/components/maps/HealthMapDashboard'
import PolesMapDashboard from '@/components/maps/PolesMapDashboard'
import MalariaMapDashboard from '@/components/maps/MalariaMapDashboard'
import FeederPulseDashboard from '@/components/maps/FeederPulseDashboard'
import { MapDetailToolbar } from '@/components/maps/MapDetailToolbar'
import '../../maps-catalog.css'

type PageProps = { params: { slug: string } }

export function generateStaticParams() {
  return [
    { slug: 'mapa-de-saude' },
    { slug: 'diagnostico-rede-postes' },
    { slug: 'malaria-geografia-2015-2018' },
    { slug: 'feederpulse-mz' },
  ]
}

export async function generateMetadata({ params }: PageProps) {
  const map = findMapBySlug(params.slug)
  if (!map) return { title: 'Mapa não encontrado' }
  return {
    title: `${map.title} | Portal de Dados`,
    description: map.description,
  }
}

export default function MapDetailPage({ params }: PageProps) {
  const map = findMapBySlug(params.slug)
  if (!map) notFound()

  return (
    <div className="mp-map-page">
      <MapDetailToolbar
        map={{
          title: map.title,
          slug: map.slug,
          coverage: map.coverage,
          description: map.description,
        }}
      />

      {map.kind === 'poles' ? (
        <PolesMapDashboard
          dataPath={map.dataPath}
          title={map.title}
          subtitle={map.subtitle}
          badges={map.badges}
        />
      ) : map.kind === 'malaria' ? (
        <MalariaMapDashboard
          dataPath={map.dataPath}
          title={map.title}
          subtitle={map.subtitle}
          badges={map.badges}
        />
      ) : map.kind === 'feeder' ? (
        <FeederPulseDashboard
          dataPath={map.dataPath}
          title={map.title}
          subtitle={map.subtitle}
          badges={map.badges}
        />
      ) : (
        <HealthMapDashboard
          geojsonPath={map.dataPath}
          title={map.title}
          subtitle={map.subtitle}
          badges={map.badges}
        />
      )}
    </div>
  )
}
