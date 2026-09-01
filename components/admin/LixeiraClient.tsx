'use client'

import { useState } from 'react'
import { Trash2, RotateCcw, AlertTriangle, X } from 'lucide-react'
import type { listarLixeiraDatasets } from '@/lib/db'

type ItemLixeira = Awaited<ReturnType<typeof listarLixeiraDatasets>>[number]

export function LixeiraClient({ datasetsIniciais }: { datasetsIniciais: ItemLixeira[] }) {
  const [datasets, setDatasets] = useState(datasetsIniciais)
  const [aProcessar, setAProcessar] = useState<number | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [confirmarPurga, setConfirmarPurga] = useState<number | null>(null)

  async function restaurar(lixeiraId: number) {
    setAProcessar(lixeiraId)
    setMensagem(null)
    try {
      const resposta = await fetch(`/api/admin/lixeira/${lixeiraId}`, { method: 'POST' })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error || 'Falha ao restaurar')
      setDatasets((anterior) => anterior.filter((d) => d.lixeiraId !== lixeiraId))
      setMensagem('Dataset restaurado com sucesso.')
    } catch (erro: any) {
      setMensagem(erro?.message || 'Erro ao restaurar dataset.')
    } finally {
      setAProcessar(null)
    }
  }

  async function eliminarDefinitivamente(lixeiraId: number) {
    setAProcessar(lixeiraId)
    setMensagem(null)
    try {
      const resposta = await fetch(`/api/admin/lixeira/${lixeiraId}`, { method: 'DELETE' })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error || 'Falha ao eliminar')
      setDatasets((anterior) => anterior.filter((d) => d.lixeiraId !== lixeiraId))
      setMensagem('Dataset eliminado definitivamente.')
    } catch (erro: any) {
      setMensagem(erro?.message || 'Erro ao eliminar definitivamente.')
    } finally {
      setAProcessar(null)
      setConfirmarPurga(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-gray-500" />
          Lixeira de Datasets
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Datasets eliminados ficam aqui, recuperáveis, em vez de desaparecerem de imediato. Só a
          remoção definitiva a partir daqui é irreversível.
        </p>
      </div>

      {mensagem && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          {mensagem}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {datasets.length === 0 ? (
          <p className="px-5 py-10 text-center text-gray-400 text-sm">A lixeira está vazia.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {datasets.map((d) => (
              <li key={d.lixeiraId} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{d.titulo}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Eliminado por {d.eliminadoPor} em {new Date(d.eliminadoEm).toLocaleString('pt-PT')}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => restaurar(d.lixeiraId)}
                    disabled={aProcessar === d.lixeiraId}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#064E2C] text-white text-xs font-semibold px-3 py-2 hover:bg-[#04361F] disabled:opacity-60"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar
                  </button>

                  {confirmarPurga === d.lixeiraId ? (
                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5">
                      <span className="text-[11px] font-semibold text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Confirmar?
                      </span>
                      <button
                        onClick={() => eliminarDefinitivamente(d.lixeiraId)}
                        disabled={aProcessar === d.lixeiraId}
                        className="text-[11px] font-bold text-red-700 hover:text-red-900 underline"
                      >
                        Sim, eliminar
                      </button>
                      <button
                        onClick={() => setConfirmarPurga(null)}
                        className="text-red-400 hover:text-red-600"
                        aria-label="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmarPurga(d.lixeiraId)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold px-3 py-2 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar definitivamente
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
