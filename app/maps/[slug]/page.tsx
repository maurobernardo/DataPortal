import { notFound } from 'next/navigation'
import { applyMapOverrides, findMapBySlug } from '@/lib/maps-catalog'
import { findMapOverride } from '@/lib/db'
import { HealthMapDashboard } from '@/components/maps/HealthMapDashboard'
import PolesMapDashboard from '@/components/maps/PolesMapDashboard'
import MalariaMapDashboard from '@/components/maps/MalariaMapDashboard'
import FeederPulseDashboard from '@/components/maps/FeederPulseDashboard'
import CerealProductionDashboard from '@/components/maps/CerealProductionDashboard'
import { MapDetailToolbar } from '@/components/maps/MapDetailToolbar'
import { RecordMapView } from '@/components/maps/RecordMapView'
import '../../maps-catalog.css'

type PageProps = { params: { slug: string } }

// Metadados podem ser editados via admin (MapOverride) — revalida periodicamente em vez de
// forçar renderização dinâmica por pedido, mantendo o benefício do generateStaticParams.
export const revalidate = 60

export function generateStaticParams() {
  return [
    { slug: 'mapa-de-saude' },
    { slug: 'diagnostico-rede-postes' },
    { slug: 'malaria-geografia-2015-2018' },
    { slug: 'feederpulse-mz' },
    { slug: 'producao-cereais' },
  ]
}

async function getMapWithOverride(slug: string) {
  const base = findMapBySlug(slug)
  if (!base) return null
  const override = await findMapOverride(slug)
  if (!override) return base
  return applyMapOverrides([base], [override])[0]
}

export async function generateMetadata({ params }: PageProps) {
  const map = await getMapWithOverride(params.slug)
  if (!map) return { title: 'Mapa não encontrado' }
  return {
    title: `${map.title} | Portal de Dados`,
    description: map.description,
  }
}

export default async function MapDetailPage({ params }: PageProps) {
  const map = await getMapWithOverride(params.slug)
  if (!map) notFound()

  return (
    <div className="mp-map-page">
      <RecordMapView slug={map.slug} title={map.title} />
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
      ) : map.kind === 'cereals' ? (
        <CerealProductionDashboard
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
