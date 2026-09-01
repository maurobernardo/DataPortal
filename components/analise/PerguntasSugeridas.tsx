import Link from 'next/link'
import { ArrowRight, LineChart } from 'lucide-react'

/** Convida a continuar a explorar os mesmos datasets em vez de terminar a experiência num ecrã
 *  estático — partilhado entre a página de detalhe e o dashboard. */
export function PerguntasSugeridas({
  perguntas,
  datasetIds,
}: {
  perguntas: string[]
  datasetIds: string
}) {
  if (!perguntas.length || !datasetIds) return null

  return (
    <section className="pdx-panel pdx-panel-convite mb-5 print:hidden">
      <div className="pdx-panel-head">
        <span className="pdx-panel-icone" aria-hidden>
          <LineChart className="size-3.5" />
        </span>
        <h2>Perguntas sugeridas</h2>
        <span className="pdx-panel-sub">Verificadas contra estes dados</span>
      </div>
      <div className="pdx-panel-body grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {perguntas.map((q, i) => (
          <Link
            key={i}
            href={`/analise/nova?datasets=${datasetIds}&pergunta=${encodeURIComponent(q)}`}
            className="pdx-sugestao"
          >
            <span>{q}</span>
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  )
}
