export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db, findAllAlphanumericDashboards, findAllReports } from '@/lib/db'
import {
  mergeSearchEntries,
  searchMapCatalog,
  searchPortalSections,
  type PortalSearchEntry,
} from '@/lib/portal-search'
import { logger } from '@/lib/logger'

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }
  return dp[a.length][b.length]
}

type TitleRow = { title: string; dataType: string }

/** Para termos de fonte/palavra-chave: descobre se só existem datasets de um tipo e devolve o href certo. */
async function hrefForPoolTerm(term: string): Promise<string> {
  const t = term.trim()
  if (!t) return `/catalogo?search=${encodeURIComponent(term)}`
  const tl = t.toLowerCase()
  const [rows] = (await db.execute(
    `SELECT DISTINCT dataType FROM Dataset 
     WHERE LOWER(TRIM(COALESCE(source,''))) = ?
        OR (keywords IS NOT NULL AND LOWER(keywords) LIKE CONCAT('%', ?, '%'))`,
    [tl, tl]
  )) as any
  const types = new Set(
    (rows as { dataType?: string }[]).map((r) => String(r.dataType || '').trim()).filter(Boolean)
  )
  if (types.size === 1) {
    const dt = types.values().next().value as string
    const base = dt === 'alfanumerico' ? '/dados-alfanumericos' : '/dados-espaciais'
    return `${base}?search=${encodeURIComponent(t)}`
  }
  return `/catalogo?search=${encodeURIComponent(t)}`
}

async function searchDashboards(q: string, limit = 3): Promise<PortalSearchEntry[]> {
  try {
    const rows = await findAllAlphanumericDashboards()
    return (rows as { name?: string; description?: string; category?: string }[])
      .filter((r) => {
        const hay = `${r.name || ''} ${r.description || ''} ${r.category || ''}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, limit)
      .map((r) => ({
        label: String(r.name || 'Dashboard'),
        href: `/dashboards-alfanumericos?search=${encodeURIComponent(String(r.name || q))}`,
        kind: 'dashboard',
      }))
  } catch {
    return []
  }
}

async function searchReports(q: string, limit = 3): Promise<PortalSearchEntry[]> {
  try {
    const rows = await findAllReports()
    return (rows as { id?: number; title?: string; coverage?: string; author?: string }[])
      .filter((r) => {
        const hay = `${r.title || ''} ${r.coverage || ''} ${r.author || ''}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, limit)
      .map((r) => ({
        label: String(r.title || 'Relatório'),
        href: `/relatorios/${r.id}`,
        kind: 'relatorio',
      }))
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().toLowerCase()
    const dataType = searchParams.get('dataType')

    if (!q || q.length < 2) {
      return NextResponse.json({ suggestions: [], entries: [], corrected: null })
    }

    const filters: string[] = []
    const values: any[] = []
    if (dataType) {
      filters.push('dataType = ?')
      values.push(dataType)
    }
    const baseWhere = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const sourceWhere = baseWhere ? `${baseWhere} AND source IS NOT NULL` : 'WHERE source IS NOT NULL'
    const keywordWhere = baseWhere ? `${baseWhere} AND keywords IS NOT NULL` : 'WHERE keywords IS NOT NULL'

    const titleFilterParts = [...filters, 'title IS NOT NULL', 'LOWER(title) LIKE ?']
    const titleWhere = `WHERE ${titleFilterParts.join(' AND ')}`
    const titleValues = [...values, `%${q}%`]

    const [sourcesRows, keywordsRows, titleRowsResult] = await Promise.all([
      (async () => {
        const [rows] = await db.execute(`SELECT DISTINCT source FROM Dataset ${sourceWhere} ORDER BY source ASC`, values) as any
        return rows.map((r: any) => String(r.source || '')).filter(Boolean)
      })(),
      (async () => {
        const [rows] = await db.execute(`SELECT keywords FROM Dataset ${keywordWhere}`, values) as any
        const all: string[] = []
        for (const row of rows) {
          const parts = String(row.keywords || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          all.push(...parts)
        }
        return Array.from(new Set(all))
      })(),
      (async () => {
        const [rows] = await db.execute(
          `SELECT DISTINCT title, dataType FROM Dataset ${titleWhere} ORDER BY title ASC LIMIT 40`,
          titleValues
        ) as any
        return (rows as any[]).map((r) => ({
          title: String(r.title || '').trim(),
          dataType: String(r.dataType || 'geoespacial'),
        })).filter((r: TitleRow) => r.title.length > 0)
      })(),
    ])

    const titlePairs = titleRowsResult as TitleRow[]

    const pool = Array.from(new Set([...sourcesRows, ...keywordsRows, ...titlePairs.map((t) => t.title)]))
    const suggestions = pool
      .filter((term) => term.toLowerCase().includes(q))
      .slice(0, 8)

    let corrected: string | null = null
    if (!suggestions.length) {
      let bestTerm: string | null = null
      let bestDistance = Number.POSITIVE_INFINITY
      for (const term of pool) {
        const d = levenshtein(q, term.toLowerCase())
        if (d < bestDistance) {
          bestDistance = d
          bestTerm = term
        }
      }
      if (bestTerm && bestDistance <= 2 && bestTerm.toLowerCase() !== q) {
        corrected = bestTerm
      }
    }

    // Home (sem dataType): mapas, dashboards, relatórios e datasets
    let entries: Array<{ label: string; href: string }> = []
    if (!dataType) {
      const hrefForType = (dt: string, label: string) => {
        const base = dt === 'alfanumerico' ? '/dados-alfanumericos' : '/dados-espaciais'
        return `${base}?search=${encodeURIComponent(label)}`
      }

      const datasetEntries: PortalSearchEntry[] = []
      for (const p of titlePairs) {
        if (!p.title.toLowerCase().includes(q)) continue
        datasetEntries.push({
          label: p.title,
          href: hrefForType(p.dataType, p.title),
          kind: p.dataType === 'alfanumerico' ? 'alfanumerico' : 'geoespacial',
        })
      }

      const poolTerms = suggestions.filter((term) => term.toLowerCase().includes(q))
      const hrefsForPool = await Promise.all(poolTerms.map((term) => hrefForPoolTerm(term)))
      poolTerms.forEach((term, i) => {
        datasetEntries.push({ label: term, href: hrefsForPool[i] })
      })

      const [dashEntries, reportEntries] = await Promise.all([
        searchDashboards(q, 4),
        searchReports(q, 3),
      ])

      entries = mergeSearchEntries(
        searchPortalSections(q),
        searchMapCatalog(q, 4),
        dashEntries,
        reportEntries,
        datasetEntries
      )
        .slice(0, 10)
        .map(({ label, href }) => ({ label, href }))
    }

    return NextResponse.json({ suggestions, entries, corrected })
  } catch (error) {
    logger.error('error_loading_search_suggestions', { error: error })
    return NextResponse.json({ suggestions: [], entries: [], corrected: null })
  }
}