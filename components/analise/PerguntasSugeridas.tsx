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
    <section className="rounded-2xl border border-[#CFE3D6] bg-[#F1F8F4] p-5 mb-5 print:hidden">
      <div className="flex items-center gap-2 mb-3">
        <LineChart className="size-4 text-[#064E2C]" aria-hidden />
        <h2 className="text-base font-bold text-[var(--pd-ink-900)]">Perguntas sugeridas</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {perguntas.map((q, i) => (
          <Link
            key={i}
            href={`/analise/nova?datasets=${datasetIds}&pergunta=${encodeURIComponent(q)}`}
            className="group flex items-center justify-between gap-2 rounded-xl border border-[#E2E8E5] bg-white px-4 py-3 text-left transition-colors hover:border-[#064E2C]"
          >
            <span className="text-[13px] text-[var(--pd-ink-800)] leading-snug">{q}</span>
            <ArrowRight className="size-4 text-gray-300 group-hover:text-[#064E2C] shrink-0 transition-colors" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  )
}
