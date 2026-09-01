import { Suspense } from 'react'
import { db, findDatasets } from '@/lib/db'
import { obterCoberturaGeograficaPorProvincia } from '@/lib/cobertura-geografica'
import { GeoCatalogClient } from '@/components/geo/GeoCatalogClient'
import '../geo-catalog.css'

async function getData(searchParams: { [key: string]: string | string[] | undefined }) {
  const category = searchParams.category as string | undefined
  const search = searchParams.search as string | undefined
  const source = searchParams.source as string | undefined
  const format = searchParams.format as string | undefined
  const year = searchParams.year as string | undefined
  const yearFrom = searchParams.yearFrom as string | undefined
  const yearTo = searchParams.yearTo as string | undefined
  const sortOrder = searchParams.sortOrder as string | undefined

  const datasets = await findDatasets({
    dataType: 'geoespacial',
    categoryId: category ? parseInt(category) : undefined,
    search: search || undefined,
    source: source || undefined,
    format: format || undefined,
    year: year ? parseInt(year) : undefined,
    yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
    yearTo: yearTo ? parseInt(yearTo) : undefined,
    sortOrder: sortOrder || undefined,
    offset: 0,
    take: 1000,
  })

  const conditions: string[] = ["d.dataType = 'geoespacial'"]
  const values: any[] = []
  if (category) {
    conditions.push('d.categoryId = ?')
    values.push(parseInt(category))
  }
  if (format) {
    conditions.push('d.format = ?')
    values.push(format)
  }
  if (source) {
    conditions.push('d.source = ?')
    values.push(source)
  }
  if (year) {
    conditions.push('d.year = ?')
    values.push(parseInt(year))
  }
  if (yearFrom) {
    conditions.push('d.year >= ?')
    values.push(parseInt(yearFrom))
  }
  if (yearTo) {
    conditions.push('d.year <= ?')
    values.push(parseInt(yearTo))
  }
  if (search) {
    conditions.push('(d.title LIKE ? OR d.description LIKE ? OR d.keywords LIKE ?)')
    values.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  const whereSql = `WHERE ${conditions.join(' AND ')}`

  const [categories, totalCount, stats, availableFormats, availableSources, availableYears] = await Promise.all([
    (async () => {
      const [rows] = (await db.execute(
        `SELECT c.*, COUNT(d.id) as datasetsCount
         FROM Category c
         LEFT JOIN Dataset d ON d.categoryId = c.id AND d.dataType = 'geoespacial'
         WHERE c.dataType = 'geoespacial'
         GROUP BY c.id
         ORDER BY c.name ASC`
      )) as [{ datasetsCount?: number; id: number; name: string }[], unknown]
      return rows.map((r) => ({ ...r, _count: { datasets: Number(r.datasetsCount || 0) } }))
    })(),
    (async () => {
      const [rows] = (await db.execute(`SELECT COUNT(*) as total FROM Dataset d ${whereSql}`, values)) as [
        { total?: number }[],
        unknown,
      ]
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = (await db.execute(
        `SELECT
           COALESCE(SUM(views), 0) as views,
           COALESCE(SUM(downloads), 0) as downloads,
           COUNT(*) as id
         FROM Dataset d ${whereSql}`,
        values
      )) as [{ views?: number; downloads?: number; id?: number }[], unknown]
      return {
        _sum: { views: rows[0]?.views ?? 0, downloads: rows[0]?.downloads ?? 0 },
        _count: { id: rows[0]?.id ?? 0 },
      }
    })(),
    (async () => {
      const [rows] = (await db.execute(
        `SELECT DISTINCT format FROM Dataset d WHERE d.dataType='geoespacial' AND format IS NOT NULL ORDER BY format ASC`
      )) as [{ format: string }[], unknown]
      const formats = rows.map((r) => r.format)
      return Array.from(new Set([...formats, 'Shapefile', 'GeoTiff', 'Shapefile/Csv']))
    })(),
    (async () => {
      const [rows] = (await db.execute(
        `SELECT DISTINCT source FROM Dataset d WHERE d.dataType='geoespacial' AND source IS NOT NULL ORDER BY source ASC`
      )) as [{ source: string }[], unknown]
      return rows.map((r) => r.source)
    })(),
    (async () => {
      const [rows] = (await db.execute(
        `SELECT DISTINCT year FROM Dataset d WHERE d.dataType='geoespacial' AND year IS NOT NULL ORDER BY year DESC`
      )) as [{ year: number }[], unknown]
      return rows.map((r) => r.year)
    })(),
  ])

  const coberturaGeografica = await obterCoberturaGeograficaPorProvincia().catch(() => null)

  return { datasets, categories, totalCount, stats, availableFormats, availableSources, availableYears, coberturaGeografica }
}

export default async function DadosEspaciaisPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const { datasets, categories, totalCount, stats, availableFormats, availableSources, availableYears, coberturaGeografica } =
    await getData(searchParams)

  return (
    <div className="geo-page">
      <Suspense fallback={<div className="min-h-[40vh]" aria-hidden />}>
        <GeoCatalogClient
          datasets={datasets}
          categories={categories}
          totalCount={totalCount}
          stats={stats}
          availableFormats={availableFormats}
          availableSources={availableSources}
          availableYears={availableYears}
          searchParams={searchParams}
          coberturaGeografica={coberturaGeografica}
        />
      </Suspense>
    </div>
  )
}
