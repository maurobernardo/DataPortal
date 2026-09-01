'use client'

import { useState } from 'react'
import { Download, Loader2, Map as MapIcon, Scale, X } from 'lucide-react'

export function BatchActionBar({
  selectedIds,
  onClear,
  onCompare,
  compareLabel = 'Comparar no mapa',
}: {
  selectedIds: number[]
  onClear: () => void
  onCompare?: () => void
  /** "Comparar no mapa" só faz sentido para camadas geoespaciais (GeoCompareMap); datasets
   *  alfanuméricos comparam metadados numa tabela, não num mapa. */
  compareLabel?: string
}) {
  const [downloading, setDownloading] = useState(false)

  if (selectedIds.length === 0) return null

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch('/api/download/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        alert(data?.error || 'Erro ao gerar o ficheiro zip')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'datasets.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao gerar o ficheiro zip')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="geo-batch-bar">
      <span className="geo-batch-bar-count">{selectedIds.length} selecionado{selectedIds.length !== 1 ? 's' : ''}</span>
      <div className="geo-batch-bar-actions">
        {onCompare && (
          <button
            type="button"
            className="geo-batch-bar-btn geo-batch-bar-btn--secondary"
            onClick={onCompare}
            disabled={selectedIds.length < 2 || selectedIds.length > 3}
            title={selectedIds.length < 2 ? 'Selecione pelo menos 2 camadas' : selectedIds.length > 3 ? 'Máximo de 3 camadas' : ''}
          >
            {compareLabel === 'Comparar no mapa' ? (
              <MapIcon className="size-4" aria-hidden />
            ) : (
              <Scale className="size-4" aria-hidden />
            )}
            {compareLabel}
          </button>
        )}
        <button
          type="button"
          className="geo-batch-bar-btn opacity-50 cursor-not-allowed"
          disabled
          title="Download temporariamente indisponível"
        >
          <Download className="size-4" aria-hidden />
          Indisponível
        </button>
        <button type="button" className="geo-batch-bar-close" onClick={onClear} aria-label="Limpar seleção">
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
