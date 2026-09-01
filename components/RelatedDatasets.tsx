'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, LineChart } from 'lucide-react'
import { CategoryIconChip } from '@/components/geo/CategoryIconChip'

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
      <div className={sectionLabelClassName ?? 'flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--pd-ink-500)] mb-3'}>
        <LineChart className="size-3.5 text-[var(--pd-green-700)]" aria-hidden />
        Datasets relacionados
      </div>
      <ul className="space-y-1.5">
        {related.map((r) => (
          <li key={r.id}>
            <Link
              href={`/dataset/${r.id}`}
              className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 -mx-2 hover:border-[var(--pd-green-100)] hover:bg-[var(--pd-green-50)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C]"
            >
              <CategoryIconChip title={r.title} category={r.category || ''} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-[var(--pd-ink-800)] leading-snug truncate">
                  {r.title}
                </span>
                <span className="block text-[11.5px] text-[var(--pd-ink-500)] mt-0.5">
                  {r.category || (r.dataType === 'geoespacial' ? 'Geoespacial' : 'Alfanumérico')} · {r.format}
                </span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-[var(--pd-ink-300)] group-hover:text-[var(--pd-green-700)] group-hover:translate-x-0.5 transition-all"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
