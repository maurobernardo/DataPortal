import { FileText, Calendar, Globe, Users, Search, Filter } from 'lucide-react'
import Image from 'next/image'
import { ReportRequestButton } from '@/components/ReportRequestButton'
import { findAllReports } from '@/lib/db'

async function getData(searchParams: { [key: string]: string | string[] | undefined }) {
  const year = searchParams.year as string | undefined
  const coverage = searchParams.coverage as string | undefined
  const partners = searchParams.partners as string | undefined
  const pageParam = searchParams.page as string | undefined

  const page = pageParam ? parseInt(pageParam) || 1 : 1
  const take = 6
  const skip = (page - 1) * take

  const all = await findAllReports()
  const filtered = all.filter((r: any) => {
    if (year && String(r.year) !== String(year)) return false
    if (coverage && !String(r.coverage || '').toLowerCase().includes(String(coverage).toLowerCase())) return false
    if (partners && !String(r.partners || '').toLowerCase().includes(String(partners).toLowerCase())) return false
    return true
  })

  const totalReports = filtered.length
  const reports = filtered
    .slice()
    .sort((a: any, b: any) => String(b.year).localeCompare(String(a.year)))
    .slice(skip, skip + take)

  const yearValues = all
    .map((r: any) => r.year as string | number | null | undefined)
    .filter((v: string | number | null | undefined): v is string | number => v !== null && v !== undefined)
  const availableYears: Array<string | number> = Array.from(new Set<string | number>(yearValues))
    .sort((a, b) => String(b).localeCompare(String(a)))
  const availableCoverages: string[] = Array.from(
    new Set(all.map((r: any) => r.coverage).filter(Boolean))
  ).map((v) => String(v))
  const availablePartners: string[] = Array.from(
    new Set(all.map((r: any) => r.partners).filter(Boolean))
  ).map((v) => String(v))

  return { reports, totalReports, availableYears, availableCoverages, availablePartners, page, take }
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const {
    reports,
    totalReports,
    availableYears,
    availableCoverages,
    availablePartners,
    page,
    take,
  } = await getData(searchParams)
  const hasFilters = !!(searchParams.year || searchParams.coverage || searchParams.partners)
  const hasMore = page * take < totalReports

  const moreParams = new URLSearchParams()
  if (searchParams.year) moreParams.set('year', String(searchParams.year))
  if (searchParams.coverage) moreParams.set('coverage', String(searchParams.coverage))
  if (searchParams.partners) moreParams.set('partners', String(searchParams.partners))
  moreParams.set('page', String(page + 1))
  const moreHref = `/relatorios?${moreParams.toString()}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 mt-24">
        {/* Header */}
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
                    Relatórios
                  </h1>
                  <p className="text-green-100 text-sm md:text-base">
                    Explore nossa coleção de relatórios
                  </p>
                </div>
              </div>
              
              {!hasFilters && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{reports.length}</div>
                      <div className="text-xs text-green-100">Relatórios</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{availableYears.length}</div>
                      <div className="text-xs text-green-100">Anos</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{availableCoverages.length}</div>
                      <div className="text-xs text-green-100">Coberturas</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{availablePartners.length}</div>
                      <div className="text-xs text-green-100">Parceiros</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800">Filtros</h2>
          </div>
          <form method="get" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ano</label>
              <select
                name="year"
                defaultValue={searchParams.year as string}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Todos os anos</option>
                {availableYears.map((year) => (
                  <option key={String(year)} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cobertura</label>
              <select
                name="coverage"
                defaultValue={searchParams.coverage as string}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Todas as coberturas</option>
                {availableCoverages.map((coverage) => (
                  <option key={coverage} value={coverage}>
                    {coverage}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parceiros</label>
              <select
                name="partners"
                defaultValue={searchParams.partners as string}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Todos os parceiros</option>
                {availablePartners.map((partner) => (
                  <option key={partner} value={partner}>
                    {partner}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3 flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Filtrar
              </button>
              <a
                href="/relatorios"
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Limpar
              </a>
            </div>
          </form>
        </div>

        {/* Lista de Relatórios */}
        <div>
          {reports.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report: any) => (
                  <div
                    key={report.id}
                    className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden group"
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                          {report.year}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-green-600 transition line-clamp-2">
                        {report.title}
                      </h3>
                      <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          <span>{report.coverage}</span>
                        </div>
                        {report.author && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span className="line-clamp-1">{report.author}</span>
                          </div>
                        )}
                        {report.partners && (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span className="line-clamp-1">{report.partners}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-5">
                        <ReportRequestButton
                          report={{
                            id: report.id,
                            title: report.title,
                            year: report.year,
                            coverage: report.coverage,
                            author: report.author,
                            partners: report.partners,
                          }}
                          email="portaldedados@data4moz.com"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <a
                    href={moreHref}
                    className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition shadow-sm hover:shadow text-sm"
                  >
                    Ver mais
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-sm p-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nenhum relatório encontrado
                </h3>
                <p className="text-gray-600 mb-6">
                  Não encontramos relatórios que correspondam aos seus critérios de busca. Tente ajustar os filtros.
                </p>
                <a
                  href="/relatorios"
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
  )
}



