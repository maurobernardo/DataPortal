import { CatalogHeader } from '@/components/CatalogHeader'
import { CatalogFilters } from '@/components/CatalogFilters'
import { DatasetCatalogCard } from '@/components/DatasetCatalogCard'
import { InfiniteDatasetList } from '@/components/InfiniteDatasetList'
import { TrendingUp, Database, Download, Calendar, ArrowUp, ArrowDown, FolderTree } from 'lucide-react'
import Image from 'next/image'
import { db, findDatasets } from '@/lib/db'

async function getData(searchParams: { [key: string]: string | string[] | undefined }) {
  const category = searchParams.category as string | undefined
  const search = searchParams.search as string | undefined
  const source = searchParams.source as string | undefined
  const format = searchParams.format as string | undefined
  const year = searchParams.year as string | undefined
  const sortOrder = searchParams.sortOrder as string | undefined

  const datasets = await findDatasets({
    categoryId: category ? parseInt(category) : undefined,
    search: search || undefined,
    source: source || undefined,
    format: format || undefined,
    year: year ? parseInt(year) : undefined,
    sortOrder: sortOrder || undefined,
    offset: 0,
    take: 1000,
  })

  const conditions: string[] = ["d.dataType = 'alfanumerico'"]
  const values: any[] = []
  if (category) { conditions.push('d.categoryId = ?'); values.push(parseInt(category)) }
  if (format) { conditions.push('d.format = ?'); values.push(format) }
  if (source) { conditions.push('d.source = ?'); values.push(source) }
  if (year) { conditions.push('d.year = ?'); values.push(parseInt(year)) }
  if (search) {
    conditions.push('(d.title LIKE ? OR d.description LIKE ? OR d.keywords LIKE ?)')
    values.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  const whereSql = `WHERE ${conditions.join(' AND ')}`

  const [categories, totalCount, stats, availableFormats, availableSources, availableYears] = await Promise.all([
    (async () => {
      const [rows] = await db.execute(
        `SELECT c.*, COUNT(d.id) as datasetsCount
         FROM Category c
         LEFT JOIN Dataset d ON d.categoryId = c.id AND d.dataType = 'alfanumerico'
         WHERE c.dataType = 'alfanumerico'
         GROUP BY c.id
         ORDER BY c.name ASC`
      ) as any
      return rows.map((r: any) => ({ ...r, _count: { datasets: Number(r.datasetsCount || 0) } }))
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as total FROM Dataset d ${whereSql}`,
        values
      ) as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT
           COALESCE(SUM(views), 0) as views,
           COALESCE(SUM(downloads), 0) as downloads,
           COUNT(*) as id
         FROM Dataset d ${whereSql}`,
        values
      ) as any
      return { _sum: { views: rows[0]?.views ?? 0, downloads: rows[0]?.downloads ?? 0 }, _count: { id: rows[0]?.id ?? 0 } }
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT DISTINCT format FROM Dataset d WHERE d.dataType='alfanumerico' AND format IS NOT NULL ORDER BY format ASC`
      ) as any
      const formats = rows.map((r: any) => r.format)
      return Array.from(new Set([...formats, 'CSV', 'Excel', 'JSON', 'XML']))
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT DISTINCT source FROM Dataset d WHERE d.dataType='alfanumerico' AND source IS NOT NULL ORDER BY source ASC`
      ) as any
      return rows.map((r: any) => r.source)
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT DISTINCT year FROM Dataset d WHERE d.dataType='alfanumerico' AND year IS NOT NULL ORDER BY year DESC`
      ) as any
      return rows.map((r: any) => r.year)
    })(),
  ])

  return { datasets, categories, totalCount, stats, availableFormats, availableSources, availableYears }
}

export default async function DadosAlfanumericosPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const { datasets, categories, totalCount, stats, availableFormats, availableSources, availableYears } = await getData(searchParams)
  const hasFilters = !!(searchParams.search || searchParams.category || searchParams.source || searchParams.format || searchParams.year)

  // Função para criar query string mantendo filtros mas removendo sortOrder
  const getPopularidadeHref = () => {
    const params = { ...searchParams }
    delete params.sortOrder
    
    if (Object.keys(params).length === 0) {
      return '/dados-alfanumericos'
    }
    
    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
      .join('&')
    
    return `?${queryString}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 mt-24">
        {/* Enhanced Header */}
        <div className="mb-10">
          <div className="bg-gradient-to-r from-green-500 via-green-600 to-green-700 rounded-2xl shadow-xl overflow-hidden mb-8">
            <div className="bg-white/10 backdrop-blur-sm p-8 md:p-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg p-2">
                  <Image 
                    src="/images/logo.png" 
                    alt="Data Portal Logo" 
                    width={28} 
                    height={28} 
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                    Catálogo de Dados Alfanuméricos
                  </h1>
                  <p className="text-green-100 text-sm md:text-base">
                    Explore e baixe dados alfanuméricos de alta qualidade
                  </p>
                </div>
              </div>
              
              {/* Quick Stats */}
              {!hasFilters && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Database className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats._count.id}</div>
                      <div className="text-xs text-green-100">Datasets</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {(stats._sum.views || 0).toLocaleString('pt-BR')}
                      </div>
                      <div className="text-xs text-green-100">Visualizações</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Download className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {(stats._sum.downloads || 0).toLocaleString('pt-BR')}
                      </div>
                      <div className="text-xs text-green-100">Downloads</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <FolderTree className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{categories.length}</div>
                      <div className="text-xs text-green-100">Categorias</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <CatalogHeader 
            initialSearch={searchParams.search as string} 
            totalCount={totalCount}
          />
        </div>

        {/* Main Layout: Filters Left + Grid Center */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left Sidebar - Filters */}
          <div className="lg:w-64 lg:flex-shrink-0">
            <CatalogFilters
              categories={categories}
              activeCategory={searchParams.category as string}
              activeFormat={searchParams.format as string}
              availableFormats={availableFormats}
              availableSources={availableSources}
              availableYears={availableYears}
              activeYear={searchParams.year as string}
              activeSortOrder={searchParams.sortOrder as string}
            />
          </div>

          {/* Center Content - Grid of Dataset Cards */}
          <div className="flex-1 min-w-0">
            {datasets.length > 0 ? (
              <>
                {/* Results Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {totalCount} dataset{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
                    </h2>
                    {hasFilters && (
                      <p className="text-sm text-gray-500 mt-1">
                        Filtros aplicados
                      </p>
                    )}
                  </div>
                  
                  {/* Sort Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600 hidden sm:block">Ordenar por:</span>
                    
                    <a 
                      href={getPopularidadeHref()} 
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        !searchParams.sortOrder 
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                      }`}
                    >
                      Popularidade
                    </a>
                    
                    <a 
                      href={`?${new URLSearchParams({ ...searchParams, sortOrder: 'newest' }).toString()}`} 
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                        searchParams.sortOrder === 'newest'
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                      }`}
                    >
                      Mais recentes
                      <ArrowDown className="w-3 h-3" />
                    </a>
                    
                    <a 
                      href={`?${new URLSearchParams({ ...searchParams, sortOrder: 'oldest' }).toString()}`} 
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                        searchParams.sortOrder === 'oldest'
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                      }`}
                    >
                      Mais antigos
                      <ArrowUp className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Lista com paginação infinita */}
                <InfiniteDatasetList 
                  initialDatasets={datasets} 
                  totalCount={totalCount} 
                  category={searchParams.category as string}
                  search={searchParams.search as string}
                  source={searchParams.source as string}
                  format={searchParams.format as string}
                />
              </>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-sm p-16 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Database className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Nenhum dataset encontrado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Não encontramos datasets que correspondam aos seus critérios de busca. Tente ajustar os filtros ou limpar a busca.
                  </p>
                  <a
                    href="/dados-alfanumericos"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition shadow-sm hover:shadow"
                  >
                    Limpar filtros
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

