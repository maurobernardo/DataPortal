'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import type { UsoRelatorio, AcessoRelatorio } from '@/lib/relatorios/persistencia'

/**
 * A lista de quantas pessoas desbloquearam cada relatório, com a lista de quem, à distância de um
 * clique. Os nomes por relatório só são pedidos quando a linha é aberta (`/api/admin/relatorios-uso/
 * [id]`), não todos de uma vez: para um catálogo com muitos relatórios, carregar a lista de acessos
 * de todos eles à partida seria a maior parte do pedido para informação que a maioria das vezes
 * ninguém vai abrir.
 */
export function RelatoriosUsoTable({ linhas }: { linhas: UsoRelatorio[] }) {
  const [abertoId, setAbertoId] = useState<number | null>(null)
  const [acessos, setAcessos] = useState<Record<number, AcessoRelatorio[]>>({})
  const [aCarregar, setACarregar] = useState<number | null>(null)

  async function alternar(reportId: number) {
    if (abertoId === reportId) {
      setAbertoId(null)
      return
    }
    setAbertoId(reportId)
    if (acessos[reportId]) return
    setACarregar(reportId)
    try {
      const r = await fetch(`/api/admin/relatorios-uso/${reportId}`)
      const d = await r.json()
      setAcessos((prev) => ({ ...prev, [reportId]: d.acessos || [] }))
    } finally {
      setACarregar(null)
    }
  }

  if (linhas.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">Ainda não há relatórios cadastrados.</p>
  }

  return (
    <table className="w-full text-sm pd-responsive-table">
      <thead>
        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
          <th className="px-5 py-2.5 w-8" />
          <th className="px-5 py-2.5">Relatório</th>
          <th className="px-5 py-2.5 text-right">Utilizadores</th>
          <th className="px-5 py-2.5">Último acesso</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <Fragment key={l.reportId}>
            <tr
              onClick={() => alternar(l.reportId)}
              className="border-b border-gray-50 cursor-pointer hover:bg-gray-50"
            >
              <td className="px-5 py-3 text-gray-400">
                {abertoId === l.reportId ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </td>
              <td className="px-5 py-3 font-medium text-gray-900">{l.titulo}</td>
              <td className="px-5 py-3 text-right tabular-nums">
                <span
                  className={
                    l.nUtilizadores > 0
                      ? 'inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold text-xs'
                      : 'inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-bold text-xs'
                  }
                >
                  {l.nUtilizadores}
                </span>
              </td>
              <td className="px-5 py-3 text-gray-500">
                {l.ultimoAcesso ? new Date(l.ultimoAcesso).toLocaleString('pt-PT') : 'Nunca'}
              </td>
            </tr>
            {abertoId === l.reportId && (
              <tr className="bg-gray-50 border-b border-gray-100">
                <td colSpan={4} className="px-5 py-3">
                  {aCarregar === l.reportId ? (
                    <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> A carregar...
                    </div>
                  ) : (acessos[l.reportId]?.length ?? 0) === 0 ? (
                    <p className="text-xs text-gray-400 py-2">Nenhuma pessoa desbloqueou este relatório ainda.</p>
                  ) : (
                    <ul className="space-y-1.5 py-1">
                      {acessos[l.reportId].map((a, i) => (
                        <li key={i} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">
                            {a.nome} <span className="text-gray-400">· {a.email}</span>
                          </span>
                          <span className="text-gray-400 tabular-nums">{new Date(a.criadoEm).toLocaleString('pt-PT')}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}
