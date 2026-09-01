'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ShieldOff, UserCheck, UserX } from 'lucide-react'

type Utilizador = {
  id: number
  name: string
  email: string
  emailVerified: boolean
  role: 'user' | 'admin'
  createdAt: string | Date
  active: boolean
}

export function UsersAdminTable({
  utilizadores,
  idAdminActual,
}: {
  utilizadores: Utilizador[]
  idAdminActual: number
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function actualizar(id: number, corpo: Record<string, unknown>) {
    setOcupado(id)
    setErro(null)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro(data?.error || 'Não foi possível actualizar este utilizador.')
        return
      }
      router.refresh()
    } catch {
      setErro('Erro de rede. Tente novamente.')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {erro && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200 text-sm text-red-700">{erro}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm pd-responsive-table">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Registado em</th>
              <th className="px-4 py-3 text-right">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {utilizadores.map((u) => {
              const ehEuProprio = u.id === idAdminActual
              return (
                <tr key={u.id} className={!u.active ? 'opacity-50' : undefined}>
                  <td data-label="Nome" className="px-4 py-3 font-semibold text-gray-800">{u.name || 'Sem nome'}</td>
                  <td data-label="Email" className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td data-label="Estado" className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                        u.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.active ? 'Activa' : 'Desactivada'}
                    </span>
                    {!u.emailVerified && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                        Email não confirmado
                      </span>
                    )}
                  </td>
                  <td data-label="Papel" className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                        u.role === 'admin' ? 'bg-[#F1F8F4] text-[#064E2C]' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.role === 'admin' ? 'Administrador' : 'Utilizador'}
                    </span>
                  </td>
                  <td data-label="Registado em" className="px-4 py-3 text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString('pt-PT')}
                  </td>
                  <td data-label="Acções" className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={ocupado === u.id || ehEuProprio}
                        title={ehEuProprio ? 'Não pode alterar o seu próprio papel' : undefined}
                        onClick={() => actualizar(u.id, { role: u.role === 'admin' ? 'user' : 'admin' })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {u.role === 'admin' ? (
                          <>
                            <ShieldOff className="size-3.5" aria-hidden />
                            Remover admin
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="size-3.5" aria-hidden />
                            Tornar admin
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={ocupado === u.id || ehEuProprio}
                        title={ehEuProprio ? 'Não pode desactivar a sua própria conta' : undefined}
                        onClick={() => actualizar(u.id, { active: !u.active })}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                          u.active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-200 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {u.active ? (
                          <>
                            <UserX className="size-3.5" aria-hidden />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <UserCheck className="size-3.5" aria-hidden />
                            Activar
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
