import Link from 'next/link'
import { CatalogHeader } from '@/components/CatalogHeader'
import { CatalogFilters } from '@/components/CatalogFilters'
import { DatasetCard } from '@/components/DatasetCard'
import { Search, X } from 'lucide-react'
import { db, findDatasets } from '@/lib/db'

async function getDatasets(searchParams: { [key: string]: string | string[] | undefined }) {
  const category = searchParams.category as string | undefined
  const year = searchParams.year ? parseInt(searchParams.year as string) : undefined
  const format = searchParams.format as string | undefined
  const search = searchParams.search as string | undefined

  const conditions: string[] = []
  const values: any[] = []
  if (category) { conditions.push('d.categoryId = ?'); values.push(parseInt(category)) }
  if (year) { conditions.push('d.year = ?'); values.push(year) }
  if (format) { conditions.push('d.format = ?'); values.push(format) }
  if (search) {
    conditions.push('(d.title LIKE ? OR d.description LIKE ? OR d.keywords LIKE ?)')
    values.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [datasets, totalCount, categories, years] = await Promise.all([
    findDatasets({
      categoryId: category ? parseInt(category) : undefined,
      year,
      format,
      search,
      sortOrder: 'newest',
      offset: 0,
      take: 1000,
    } as any),
    (async () => {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as total FROM Dataset d ${whereSql}`,
        values
      ) as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT c.*, COUNT(d.id) as datasetsCount
         FROM Category c
         LEFT JOIN Dataset d ON d.categoryId = c.id
         GROUP BY c.id
         ORDER BY c.name ASC`
      ) as any
      return rows.map((r: any) => ({
        ...r,
        _count: { datasets: Number(r.datasetsCount || 0) },
      }))
    })(),
    (async () => {
      const [rows] = await db.execute(
        'SELECT DISTINCT year FROM Dataset WHERE year IS NOT NULL ORDER BY year DESC'
      ) as any
      return rows.map((r: any) => r.year)
    })(),
  ])

  return { datasets, categories, years, totalCount }
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const { datasets, categories, years, totalCount } = await getDatasets(searchParams)
  
  // Obter formatos e fontes disponíveis
  const availableFormats: string[] = []
  const availableSources: string[] = []
  
  datasets.forEach((dataset: any) => {
    if (!availableFormats.includes(dataset.format)) {
      availableFormats.push(dataset.format)
    }
    if (!availableSources.includes(dataset.source)) {
      availableSources.push(dataset.source)
    }
  })

  return (
    <div className="pt-24 pb-16 px-4 min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <div className="container mx-auto max-w-7xl">
        {/* Header com Estatísticas */}
        <CatalogHeader totalCount={totalCount} />

        {/* Filtros */}
        <CatalogFilters
          categories={categories}
          availableYears={years}
          availableFormats={availableFormats}
          availableSources={availableSources}
        />

        {/* Lista de Datasets */}
        {datasets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {datasets.map((dataset: any, index: number) => (
              <DatasetCard key={dataset.id} dataset={dataset} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl shadow-xl border border-gray-100 mt-8 animate-slide-up">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-6">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Nenhum dataset encontrado</h3>
            <p className="text-gray-500 mb-4">Tente ajustar os filtros de busca para encontrar o que procura.</p>
            <Link
              href="/dados-espaciais"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold"
            >
              <X className="w-4 h-4" />
              <span>Limpar Filtros</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
