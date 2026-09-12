'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Loader2 } from 'lucide-react'

/** Botão de download de um único dataset: só é apresentado como activo quando o dataset está
 *  marcado como público (downloadPublico) pelo administrador. O acesso ainda exige sessão
 *  iniciada, verificado no servidor em /api/download/[id] (401 redireciona para o login). */
export function DownloadDatasetButton({
  datasetId,
  fileName,
  className,
  label = 'Download',
}: {
  datasetId: number
  fileName?: string
  className: string
  label?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch(`/api/download/${datasetId}`)
      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        alert(data?.error || 'Erro ao descarregar o ficheiro')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName || `dataset-${datasetId}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao descarregar o ficheiro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button type="button" onClick={handleDownload} disabled={loading} className={className}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
      {loading ? 'A preparar...' : label}
    </button>
  )
}
