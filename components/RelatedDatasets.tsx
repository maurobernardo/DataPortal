'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, LineChart } from 'lucide-react'

type RelatedDataset = {
  id: number
  title: string
  format: string
  dataType: string
  category: string | null
}

export function RelatedDatasets({ datasetId, sectionLabelClassName }: { datasetId: number; sectionLabelClassName?: string }) {
  const [related, setRelated] = useState<RelatedDataset[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setRelated(null)
    fetch(`/api/datasets/${datasetId}/related`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setRelated(Array.isArray(data?.related) ? data.related : [])
      })
      .catch(() => {
        if (!cancelled) setRelated([])
      })
    return () => {
      cancelled = true
    }
  }, [datasetId])

  if (!related || related.length === 0) return null

  return (
    <div className="pt-4 mt-1 border-t border-[#E2E8E5]">
      <div className={sectionLabelClassName ?? 'flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--pd-ink-500)] mb-2.5'}>
        <LineChart className="size-3.5 text-[var(--pd-green-700)]" aria-hidden />
        Datasets relacionados
      </div>
      <ul className="space-y-1.5">
        {related.map((r) => (
          <li key={r.id}>
            <Link
              href={`/dataset/${r.id}`}
              className="group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 -mx-2.5 hover:bg-[var(--pd-green-50)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C]"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-[var(--pd-ink-800)] truncate">{r.title}</span>
                <span className="block text-[11px] text-[var(--pd-ink-500)]">
                  {r.category || (r.dataType === 'geoespacial' ? 'Geoespacial' : 'Alfanumérico')} · {r.format}
                </span>
              </span>
              <ArrowRight className="size-3.5 shrink-0 text-[var(--pd-ink-400)] group-hover:text-[var(--pd-green-700)] group-hover:translate-x-0.5 transition-all" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
