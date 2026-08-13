'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { getCachedPreview, setCachedPreview } from '@/lib/preview-cache'

const DatasetMapPreview = dynamic(() => import('@/components/DatasetMapPreview'), { ssr: false })

type PreviewGeo = { geojson: any; bbox: [number, number, number, number] | null }

/**
 * Miniatura real de mapa (mesma pré-visualização da tela de detalhe, a verde) para os cards do
 * catálogo geoespacial — em vez do esboço decorativo genérico, mostra logo o traçado real sobre
 * o basemap, para o utilizador reconhecer o dataset antes de abrir.
 */
export function GeoLayerCardMap({ datasetId }: { datasetId: number }) {
  const [preview, setPreview] = useState<PreviewGeo | null | 'indisponivel'>(null)

  useEffect(() => {
    let vivo = true
    const emCache = getCachedPreview<any>(datasetId)
    if (emCache) {
      aplicar(emCache)
      return
    }
    fetch(`/api/datasets/${datasetId}/preview`)
      .then((r) => r.json())
      .then((data) => {
        if (!vivo) return
        setCachedPreview(datasetId, data)
        aplicar(data)
      })
      .catch(() => vivo && setPreview('indisponivel'))

    function aplicar(data: any) {
      if (!vivo) return
      if (data?.type === 'geo' && data.geojson) {
        setPreview({ geojson: data.geojson, bbox: data.bbox ?? null })
      } else {
        setPreview('indisponivel')
      }
    }
    return () => {
      vivo = false
    }
  }, [datasetId])

  if (preview === 'indisponivel') return null

  if (!preview) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[var(--pd-green-50)]">
        <Loader2 className="size-4 animate-spin text-[var(--pd-green-700)]" aria-hidden />
      </div>
    )
  }

  return (
    <DatasetMapPreview
      geojson={preview.geojson}
      bbox={preview.bbox}
      showToggle={false}
      className="w-full h-full pointer-events-none [&_.leaflet-control-zoom]:hidden [&_.leaflet-control-attribution]:hidden"
    />
  )
}
