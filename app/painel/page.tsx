import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, ArrowRight, LineChart } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { obterAnalise } from '@/lib/analysis/persistencia'
import { listarVivasDoUtilizador, proximaCorrida, ultimaComparacao } from '@/lib/analysis/viva'
import { houveMudanca } from '@/lib/analysis/comparar-corridas'
import { CabecalhoDoPainel } from '@/components/analise/CabecalhoDoPainel'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import '@/app/ai-insights.css'

export const dynamic = 'force-dynamic'

/**
 * O painel do parceiro.
 *
 * Uma análise responde a uma pergunta uma vez. Um painel responde a um conjunto de perguntas de
 * forma continuada, e é isso que um ministério ou um financiador quer abrir de manhã.
 *
 * Só entram análises VIVAS, e é a decisão que define a página. Um painel com análises paradas seria
 * um arquivo com aspecto de painel: os números estariam certos à data em que foram calculados e
 * errados na manhã em que alguém os lesse, sem nada no ecrã a dizer qual das duas coisas se está a
 * ver. Aqui, tudo o que aparece tem uma data de última corrida e uma data da próxima.
 */
export default async function PaginaPainel() {
  const sessao = await getCurrentUser()
  if (!sessao) redirect('/login?next=/painel')

  const vivas = await listarVivasDoUtilizador(sessao.userId)

  const cartoes = await Promise.all(
    vivas.map(async (viva) => {
      // A análise a mostrar é a da ÚLTIMA corrida, não a raiz: a raiz é a pergunta, e o que
      // interessa num painel é a resposta mais recente que existe para ela.
      const idAMostrar = viva.ultima_analise_id || viva.raiz_id
      const [analise, comparacao] = await Promise.all([
        obterAnalise(idAMostrar).catch(() => null),
        ultimaComparacao(viva.raiz_id).catch(() => null),
      ])
      const n: any = analise?.narrativa?.resolvida
      return {
        viva,
        idAMostrar,
        titulo: n?.titulo || viva.pergunta,
        resposta: n?.resposta_directa || '',
        numeros: (n?.numeros_chave || []).slice(0, 3),
        comparacao,
        proxima: proximaCorrida(viva),
      }
    })
  )

  return (
    <div className="pdx min-h-screen">
      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        <Breadcrumbs items={[{ label: 'AI Insights', href: '/analise/nova' }, { label: 'Painel' }]} />

        <CabecalhoDoPainel total={cartoes.length} />

        {cartoes.length === 0 ? (
          <section className="pdx-panel">
            <div className="pdx-panel-body">
              <p className="pdx-nota mb-3">
                Ainda não há nenhuma pergunta a ser acompanhada. Abra uma análise, e no fim do
                dashboard ligue o acompanhamento: a partir daí ela aparece aqui, sempre com a data da
                última corrida à vista.
              </p>
              <Link href="/analise" className="pdx-btn pdx-btn-primary">
                <LineChart className="size-4" aria-hidden />
                Ver as minhas análises
              </Link>
            </div>
          </section>
        ) : (
          <div className="pdx-painel-grelha">
            {cartoes.map((c) => (
              <article key={c.viva.raiz_id} className="pdx-panel">
                <div className="pdx-panel-head">
                  <span className="pdx-panel-icone" aria-hidden>
                    <Activity className="size-3.5" />
                  </span>
                  <h2>{c.titulo}</h2>
                </div>

                <div className="pdx-panel-body">
                  {c.resposta && <p className="pdx-painel-resposta">{c.resposta}</p>}

                  {c.numeros.length > 0 && (
                    <div className="pdx-painel-numeros">
                      {c.numeros.map((k: any) => (
                        <div key={k.calc_id}>
                          <span className="valor">{k.valor}</span>
                          <span className="rotulo">{k.rotulo}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="pdx-painel-estado">
                    {c.viva.ultima_corrida
                      ? `Última corrida em ${new Date(c.viva.ultima_corrida).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}`
                      : 'Ainda não voltou a correr desde que foi criada'}
                    {' · '}
                    próxima por volta de{' '}
                    {c.proxima.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                  </p>

                  {/*
                    O aviso de mudança é sóbrio de propósito. Um painel que grita a cada variação
                    ensina as pessoas a ignorá-lo, e a partir daí a que interessava passa também
                    despercebida.
                  */}
                  {c.comparacao && houveMudanca(c.comparacao) && (
                    <p className="pdx-painel-mudou">
                      {c.comparacao.unidades.length + c.comparacao.numeros.length} valores mudaram
                      desde a corrida anterior
                    </p>
                  )}

                  <Link href={`/analise/${c.idAMostrar}/dashboard`} className="pdx-ligacao mt-3">
                    Abrir o relatório
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
