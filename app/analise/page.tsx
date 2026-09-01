import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, LineChart } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { listarAnalisesDoUtilizador } from '@/lib/analysis/persistencia'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import '@/app/geo-catalog.css'
import '@/app/ai-insights.css'

export const dynamic = 'force-dynamic'

/**
 * O estado de cada análise. Três degraus, e não cinco cores: a curso (dourado, ainda a acontecer),
 * pronta (sálvia, pode abrir-se) e não publicada (terracota, o motor recusou). Os três estados de
 * processamento partilham a mesma cor porque, para quem espera, são a mesma coisa.
 */
const ROTULO_ESTADO: Record<string, { texto: string; classe: string }> = {
  planeando: { texto: 'A planear', classe: 'a-curso' },
  executando: { texto: 'A calcular', classe: 'a-curso' },
  compondo: { texto: 'A rever', classe: 'a-curso' },
  pronto: { texto: 'Pronta', classe: 'pronta' },
  erro: { texto: 'Não publicada', classe: 'recusada' },
}

export default async function PaginaListaAnalises() {
  const sessao = await getCurrentUser()
  if (!sessao) redirect('/login?next=/analise')

  const analises = await listarAnalisesDoUtilizador(sessao.userId, 50)

  return (
    <div className="pdx min-h-screen">
      {/* Mesma largura das restantes telas de análise: a 768px a lista ficava numa coluna estreita
          ao meio de um ecrã vazio, e uma pergunta de sessenta caracteres cortava sem necessidade. */}
      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        <Breadcrumbs items={[{ label: 'AI Insights', href: '/analise/nova' }, { label: 'Minhas análises' }]} />

        <div className="pdx-cabecalho-pagina flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="pdx-selo">
              <LineChart className="size-3.5" aria-hidden />
              Motor de análise profunda
            </p>
            <h1>Minhas análises</h1>
            <p>
              {analises.length === 0
                ? 'As perguntas que fizer aos dados ficam guardadas aqui.'
                : `${analises.length} ${analises.length === 1 ? 'pergunta guardada' : 'perguntas guardadas'}. Uma análise continua a correr mesmo que saia da página.`}
            </p>
          </div>
          <Link href="/analise/nova" className="pdx-btn pdx-btn-primary shrink-0">
            <LineChart className="size-4" aria-hidden />
            Nova análise
          </Link>
        </div>

        {analises.length === 0 ? (
          <div className="pdx-panel">
            <div className="pdx-panel-body p-8 text-center">
              <p className="text-[14px] mb-4" style={{ color: 'var(--ink-soft)' }}>
                Ainda não fez nenhuma análise.
              </p>
              <Link href="/analise/nova" className="pdx-btn pdx-btn-primary">
                Fazer a primeira pergunta
              </Link>
            </div>
          </div>
        ) : (
          <ul className="pdx-lista-analises">
            {analises.map((a) => {
              const estado = ROTULO_ESTADO[a.estado] || ROTULO_ESTADO.erro
              return (
                <li key={a.id}>
                  <Link
                    // `?de=lista` é o que faz o "Voltar" da análise regressar aqui em vez de
                    // atirar sempre para "Nova análise". Sem isto, quem entrava por "Minhas
                    // análises" perdia o sítio de onde veio.
                    href={`/analise/${a.id}?de=lista`}
                    className="pdx-analise-item"
                  >
                    <span className="texto">
                      {/* A pergunta em serifa: é a voz de quem perguntou, e é o que distingue uma
                          linha da outra numa lista de cinquenta. */}
                      <span className="pergunta">{a.pergunta}</span>
                      <span className="quando pdx-num">
                        {new Date(a.criado_em).toLocaleString('pt-PT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className={`pdx-estado ${estado.classe}`}>{estado.texto}</span>
                      <ArrowRight className="seta size-4" aria-hidden />
                    </span>
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
