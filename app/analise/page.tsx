import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, LineChart } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { listarAnalisesDoUtilizador } from '@/lib/analysis/persistencia'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import '@/app/geo-catalog.css'

export const dynamic = 'force-dynamic'

const ROTULO_ESTADO: Record<string, { texto: string; cor: string }> = {
  planeando: { texto: 'A planear', cor: 'text-amber-700 bg-amber-50' },
  executando: { texto: 'A calcular', cor: 'text-amber-700 bg-amber-50' },
  compondo: { texto: 'A rever', cor: 'text-amber-700 bg-amber-50' },
  pronto: { texto: 'Pronta', cor: 'text-[#064E2C] bg-[#F1F8F4]' },
  erro: { texto: 'Não publicada', cor: 'text-red-700 bg-red-50' },
}

export default async function PaginaListaAnalises() {
  const sessao = await getCurrentUser()
  if (!sessao) redirect('/login?next=/analise')

  const analises = await listarAnalisesDoUtilizador(sessao.userId, 50)

  return (
    <div className="geo-detail-page">
      <div className="geo-detail-inner max-w-3xl">
        <Breadcrumbs items={[{ label: 'AI Insights', href: '/analise/nova' }, { label: 'Minhas análises' }]} />

        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-extrabold text-[var(--pd-ink-900)] tracking-tight">Minhas análises</h1>
          <Link
            href="/analise/nova"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#064E2C] to-[#1FA365] text-white text-sm font-semibold px-4 py-2 shadow-sm hover:shadow-md transition-all"
          >
            <LineChart className="w-4 h-4" />
            Nova análise
          </Link>
        </div>

        {analises.length === 0 ? (
          <div className="geo-detail-card p-8 text-center">
            <p className="text-sm text-[var(--pd-ink-500)] mb-4">Ainda não fez nenhuma análise.</p>
            <Link href="/analise/nova" className="geo-detail-btn-primary inline-flex">
              Fazer a primeira pergunta
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {analises.map((a) => {
              const estado = ROTULO_ESTADO[a.estado] || ROTULO_ESTADO.erro
              return (
                <li key={a.id}>
                  <Link
                    href={`/analise/${a.id}`}
                    className="flex items-center justify-between gap-4 rounded-[14px] border border-[#E2E8E5] bg-white px-5 py-4 hover:border-[#CFE3D6] hover:shadow-sm transition-all group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--pd-ink-900)] truncate">{a.pergunta}</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {new Date(a.criado_em).toLocaleString('pt-PT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${estado.cor}`}>
                        {estado.texto}
                      </span>
                      <ArrowRight className="size-4 text-gray-300 group-hover:text-[#064E2C] transition-colors" aria-hidden />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
