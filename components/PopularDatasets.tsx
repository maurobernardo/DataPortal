import Link from 'next/link'
import { Calendar, Package, MapPin, Database, ArrowRight, Eye, Download, TrendingUp, Search, X } from 'lucide-react'

interface Dataset {
  id: number
  title: string
  description: string
  category: {
    name: string
  }
  source: string
  year: number
  format: string
  views: number
  downloads: number
}

interface PopularDatasetsProps {
  datasets: Dataset[]
  totalCount?: number
}

export function PopularDatasets({ datasets, totalCount = 0 }: PopularDatasetsProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 md:p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Datasets Mais Populares
              </h2>
              {totalCount > 0 && (
                <p className="text-sm text-green-100 mt-1">
                  {totalCount} dataset{totalCount !== 1 ? 's' : ''} disponível{totalCount !== 1 ? 'eis' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Datasets */}
      <div className="p-4 md:p-6">
        {datasets.length > 0 ? (
          <div className="space-y-4">
            {datasets.map((dataset, index) => (
              <Link
                key={dataset.id}
                href={`/dataset/${dataset.id}`}
                className="group block bg-gradient-to-br from-white to-green-50/30 hover:from-green-50 hover:to-green-100 rounded-xl p-5 md:p-6 border-2 border-gray-200 hover:border-green-300 transition-all duration-300 hover-lift animate-slide-up relative overflow-hidden shadow-sm hover:shadow-lg"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Efeito de gradiente no hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 to-green-500/0 group-hover:from-green-500/5 group-hover:to-green-500/5 transition-all duration-300"></div>
                
                <div className="relative z-10">
                  {/* Header do Card */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                          <Database className="w-3 h-3" />
                          {dataset.category.name}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                          <Package className="w-3 h-3" />
                          {dataset.format}
                        </span>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2 group-hover:text-green-600 transition line-clamp-2">
                        {dataset.title}
                      </h3>
                    </div>
                  </div>

                  {/* Descrição */}
                  <p className="text-gray-600 text-sm md:text-base mb-4 line-clamp-2 leading-relaxed">
                    {dataset.description}
                  </p>

                  {/* Grid de Informações */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-500 uppercase">Fonte</span>
                      </div>
                      <div className="text-sm font-bold text-gray-800 truncate">{dataset.source || 'N/A'}</div>
                    </div>
                    
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-500 uppercase">Ano</span>
                      </div>
                      <div className="text-sm font-bold text-gray-800">{dataset.year}</div>
                    </div>
                    
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-500 uppercase">Views</span>
                      </div>
                      <div className="text-sm font-bold text-gray-800">{dataset.views}</div>
                    </div>
                    
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Download className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-500 uppercase">Downloads</span>
                      </div>
                      <div className="text-sm font-bold text-gray-800">{dataset.downloads}</div>
                    </div>
                  </div>

                  {/* Footer do Card */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 gap-4">
                    {dataset.downloads > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Popular</span>
                      </div>
                    )}
                    
                    {/* Botão "Ver detalhes" destacado */}
                    <div className="flex-1 flex justify-end">
                      <div className="group/btn inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-3.5 bg-gradient-to-r from-green-500 via-green-600 to-green-700 text-white rounded-xl font-bold text-sm md:text-base shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 hover:from-green-600 hover:via-green-700 hover:to-green-800 relative overflow-hidden pointer-events-none">
                        <span className="absolute inset-0 bg-white/0 group-hover/btn:bg-white/10 transition-colors"></span>
                        <span className="relative z-10">Ver detalhes</span>
                        <ArrowRight className="w-4 h-4 md:w-5 md:h-5 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
              Nenhum dataset encontrado
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Tente ajustar os filtros de busca ou explore todas as categorias disponíveis.
            </p>
            <Link
              href="/dados-espaciais"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold shadow-lg hover:shadow-xl"
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
