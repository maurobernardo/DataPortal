/** Completude por coluna — partilhado entre a página de detalhe e o dashboard, para que a mesma
 *  análise mostre a mesma informação de qualidade nos dois sítios em vez de só num deles. */
export function QualidadeDados({
  qualidade,
}: {
  qualidade: { coluna: string; completude_pct: number; n_distintos: number; tipo: string }[]
}) {
  if (!qualidade?.length) return null

  return (
    <section className="rounded-2xl border border-[#E2E8E5] bg-white p-5 mb-5">
      <h2 className="text-base font-bold text-[var(--pd-ink-900)] mb-3">Qualidade dos dados</h2>
      <div className="space-y-2.5">
        {qualidade.map((q) => (
          <div key={q.coluna} className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-[12px] text-[var(--pd-ink-700)] truncate" title={q.coluna}>
              {q.coluna}
            </span>
            <div className="flex-1 h-2 rounded-full bg-[#F0F2F1] overflow-hidden">
              <div
                className={`h-full rounded-full ${q.completude_pct >= 90 ? 'bg-[#064E2C]' : q.completude_pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.max(2, q.completude_pct)}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[12px] font-bold tabular-nums text-[var(--pd-ink-800)]">
              {q.completude_pct}%
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
