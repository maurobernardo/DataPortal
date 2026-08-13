import { Code2 } from 'lucide-react'

/** Fase 6 (explicabilidade): quando uma sub-pergunta usou execução de código (último recurso do
 *  catálogo), o código real fica visível aqui — não escondido, reforça confiança em vez de
 *  parecer uma caixa preta ainda mais opaca. Partilhado entre detalhe e dashboard. */
export function CodigoExecutado({
  codigo,
}: {
  codigo: { passo_id: string; instrucao: string; codigo: string }[]
}) {
  if (!codigo?.length) return null

  return (
    <section className="rounded-2xl border border-[#E2E8E5] bg-white p-5 mb-5 print:hidden">
      <div className="flex items-center gap-2 mb-3">
        <Code2 className="size-4 text-[#064E2C]" aria-hidden />
        <h2 className="text-base font-bold text-[var(--pd-ink-900)]">Código executado</h2>
      </div>
      <div className="space-y-2">
        {codigo.map((c, i) => (
          <details key={`${c.passo_id}-${i}`} className="group rounded-lg border border-[#E2E8E5]">
            <summary className="cursor-pointer list-none px-3.5 py-2.5 text-[12.5px] font-semibold text-[var(--pd-ink-800)] flex items-center justify-between gap-2">
              {c.instrucao}
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 shrink-0">Ver código</span>
            </summary>
            <pre className="overflow-x-auto rounded-b-lg bg-[#0B1210] text-[#D7F3E3] text-[11.5px] leading-relaxed px-3.5 py-3 whitespace-pre">
              <code>{c.codigo}</code>
            </pre>
          </details>
        ))}
      </div>
    </section>
  )
}
