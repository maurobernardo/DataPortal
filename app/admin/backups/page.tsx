import { redirect } from 'next/navigation'
import { DatabaseBackup } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/auth'
import { listarBackups, type NivelBackup } from '@/lib/backup/rotacao'
import { AdminSidebar } from '@/components/AdminSidebar'
import { DashboardHeader } from '@/components/DashboardHeader'

export const dynamic = 'force-dynamic'

const NIVEIS: { chave: NivelBackup; titulo: string; explicacao: string }[] = [
  { chave: 'diario', titulo: 'Diários', explicacao: 'Um por dia, mantém os últimos 3.' },
  { chave: 'semanal', titulo: 'Semanais', explicacao: 'Aos domingos, mantém os últimos 2.' },
  { chave: 'mensal', titulo: 'Mensais', explicacao: 'No dia 1 de cada mês, mantém os últimos 3.' },
]

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function BackupsPage() {
  const user = await getCurrentUserProfile()
  if (!user) redirect('/login?next=/admin/backups')
  if (user.role !== 'admin') redirect('/')

  const listasPorNivel = NIVEIS.map((n) => ({ ...n, backups: listarBackups(n.chave) }))

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:block">
        <AdminSidebar user={user} />
      </div>

      <div className="flex-1 min-w-0 md:ml-64">
        <DashboardHeader user={user} />

        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <DatabaseBackup className="w-6 h-6 text-green-600" />
                Backups da Base de Dados
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Gerados automaticamente por /api/cron/backup (uma chamada diária do cPanel). Cada
                nível guarda o seu próprio conjunto de ficheiros, rodando os mais antigos conforme
                o limite de retenção.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {listasPorNivel.map((nivel) => (
                <div key={nivel.chave} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">{nivel.titulo}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{nivel.explicacao}</p>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                    {nivel.backups.length === 0 ? (
                      <p className="px-5 py-6 text-sm text-gray-400 text-center">
                        Ainda não há backups neste nível.
                      </p>
                    ) : (
                      nivel.backups.map((b) => (
                        <div key={b.nome} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800 truncate">
                              {new Date(b.criadoEm).toLocaleString('pt-PT')}
                            </p>
                            <p className="text-xs text-gray-400">{formatarTamanho(b.tamanhoBytes)}</p>
                          </div>
                          <a
                            href={`/api/admin/backups/${nivel.chave}/${encodeURIComponent(b.nome)}`}
                            className="text-xs font-semibold text-green-700 hover:underline shrink-0"
                          >
                            Descarregar
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400">
              Os ficheiros ficam apenas no disco do servidor (nunca no repositório git). Para uma
              cópia fora do servidor, descarregue periodicamente o backup mais recente de cada
              nível.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
