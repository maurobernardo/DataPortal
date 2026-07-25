'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type Category = { id: number; name: string }

export function GeoActiveFilters({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const chips = useMemo(() => {
    const list: { key: string; label: string }[] = []
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const format = searchParams.get('format')
    const source = searchParams.get('source')
    const year = searchParams.get('year')
    const yearFrom = searchParams.get('yearFrom')
    const yearTo = searchParams.get('yearTo')

    if (search) list.push({ key: 'search', label: `"${search}"` })
    if (category) {
      const cat = categories.find((c) => String(c.id) === category)
      list.push({ key: 'category', label: cat ? cat.name : `Categoria ${category}` })
    }
    if (format) list.push({ key: 'format', label: format })
    if (source) list.push({ key: 'source', label: source })
    if (year) list.push({ key: 'year', label: year })
    if (yearFrom || yearTo) {
      list.push({ key: 'yearRange', label: `${yearFrom || '…'}–${yearTo || '…'}` })
    }
    return list
  }, [searchParams, categories])

  if (chips.length === 0) return null

  const remove = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (key === 'yearRange') {
      params.delete('yearFrom')
      params.delete('yearTo')
    } else {
      params.delete(key)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="geo-active-filters">
      <span className="geo-active-filter-label">Filtros activos:</span>
      {chips.map((chip) => (
        <span key={chip.key} className="geo-active-filter-chip">
          {chip.label}
          <button type="button" onClick={() => remove(chip.key)} aria-label={`Remover filtro ${chip.label}`}>
            ✕
          </button>
        </span>
      ))}
    </div>
  )
}
