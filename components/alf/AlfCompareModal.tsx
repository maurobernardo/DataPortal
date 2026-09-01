'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

type DatasetCompare = {
  id: number
  title: string
  category: string | null
  source: string | null
  year: number | string | null
  format: string | null
  coverage: string | null
  description: string | null
  keywords: string | null
  views: number
  downloads: number
}

const LINHAS: { rotulo: string; chave: keyof DatasetCompare }[] = [
  { rotulo: 'Categoria', chave: 'category' },
  { rotulo: 'Fonte', chave: 'source' },
  { rotulo: 'Ano', chave: 'year' },
  { rotulo: 'Cobertura geográfica', chave: 'coverage' },
  { rotulo: 'Formato', chave: 'format' },
  { rotulo: 'Palavras-chave', chave: 'keywords' },
  { rotulo: 'Visualizações', chave: 'views' },
  { rotulo: 'Downloads', chave: 'downloads' },
]

/**
 * Comparação lado a lado dos metadados de até 3 datasets alfanuméricos ou relatórios — versão
 * tabular do que o GeoCompareMap faz para camadas geoespaciais (aí a comparação é espacial, num
 * mapa; aqui não há geometria, por isso é uma tabela de metadados, não um mapa).
 */
export function AlfCompareModal({ ids, onClose }: { ids: number[]; onClose: () => void }) {
  const [datasets, setDatasets] = useState<DatasetCompare[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    fetch(`/api/datasets/compare?ids=${ids.join(',')}`)
      .then((r) => r.json())
      .then((data) => {
        if (!vivo) return
        setDatasets(Array.isArray(data?.datasets) ? data.datasets : [])
      })
      .catch(() => vivo && setErro('Não foi possível carregar a comparação.'))
    return () => {
      vivo = false
    }
  }, [ids])

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', aoTeclar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comparação de datasets"
        className="w-full max-w-4xl max-h-[85vh] overflow-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E2E8E5] bg-white px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">Comparar datasets</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="p-5">
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          {!erro && !datasets && <p className="text-sm text-gray-400 text-center py-10">A carregar…</p>}
          {datasets && datasets.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-bold uppercase tracking-wide text-gray-400 pb-3 pr-4 w-32">
                      Dataset
                    </th>
                    {datasets.map((d) => (
                      <th key={d.id} className="text-left pb-3 pr-4 align-top">
                        <p className="text-[13.5px] font-bold text-gray-900 leading-snug">{d.title}</p>
                        {d.description && (
                          <p className="text-xs text-gray-500 mt-1 leading-snug line-clamp-3">{d.description}</p>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {LINHAS.map((linha) => (
                    <tr key={linha.chave}>
                      <td className="py-2.5 pr-4 text-xs font-bold uppercase tracking-wide text-gray-400 align-top">
                        {linha.rotulo}
                      </td>
                      {datasets.map((d) => (
                        <td key={d.id} className="py-2.5 pr-4 text-gray-700 align-top">
                          {d[linha.chave] || 'N/D'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {datasets && datasets.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">Nenhum dataset encontrado.</p>
          )}
        </div>
      </div>
    </div>
  )
}
