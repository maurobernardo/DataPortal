import Link from 'next/link'
import { Calendar, Package, MapPin, Eye, Download, ArrowRight, TrendingUp, Database, FileText } from 'lucide-react'

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
  keywords?: string | null
}

interface DatasetCatalogCardProps {
  dataset: Dataset
  highlight?: string
}

const formatColors: { [key: string]: string } = {
  'SHP': 'bg-blue-100 text-blue-700 border-blue-200',
  'GeoJSON': 'bg-green-100 text-green-700 border-green-200',
  'GPKG': 'bg-purple-100 text-purple-700 border-purple-200',
  'CSV': 'bg-orange-100 text-orange-700 border-orange-200',
  'KML': 'bg-red-100 text-red-700 border-red-200',
  'GML': 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

export function DatasetCatalogCard({ dataset, highlight }: DatasetCatalogCardProps) {
  const keywords = dataset.keywords?.split(',').slice(0, 3) || []
  const formatColor = formatColors[dataset.format] || 'bg-gray-100 text-gray-700 border-gray-200'
  const isPopular = dataset.downloads > 10 || dataset.views > 50

  return (
    <Link
      href={`/dataset/${dataset.id}`}
      className="group block bg-white rounded-2xl border border-green-400 hover:shadow-2xl hover:shadow-green-100/50 transition-all duration-300 overflow-hidden hover:-translate-y-1 relative"
    >
      {/* Top Gradient Bar */}
      <div className="h-1.5 bg-gradient-to-r from-green-400 via-green-500 to-green-400"></div>

      <div className="p-5 sm:p-6">
        {/* Header with Icon and Popular Badge */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Database className="w-5 h-5" />
              </div>
              {isPopular && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-100 uppercase tracking-wide animate-pulse">
                  <TrendingUp className="w-3 h-3" />
                  Popular
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors mb-2 line-clamp-2 leading-snug">
              <HighlightedText text={dataset.title} query={highlight} />
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
              <HighlightedText text={dataset.description} query={highlight} />
            </p>
          </div>
        </div>

        {/* Category Badge */}
        <div className="mb-5">
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-100 transition-colors">
            {dataset.category.name}
          </span>
        </div>

        {/* Tags */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {keywords.map((keyword, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-100 uppercase tracking-wide hover:bg-gray-100 transition"
              >
                <FileText className="w-3 h-3 mr-1 text-gray-400" />
                {keyword.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 transition-colors group-hover:bg-green-100">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fonte</div>
              <div className="text-sm font-semibold text-gray-700 truncate">{dataset.source}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 transition-colors group-hover:bg-green-100">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ano</div>
              <div className="text-sm font-semibold text-gray-700">{dataset.year}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 transition-colors group-hover:bg-green-100">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Formato</div>
              <div className={`text-xs font-bold px-2 py-0.5 rounded-md ${formatColor.split(' ')[0]} ${formatColor.split(' ')[1]} inline-block`}>
                {dataset.format}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 transition-colors group-hover:bg-green-100">
              <Eye className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Acessos</div>
              <div className="text-sm font-semibold text-gray-700">{dataset.views}</div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between group/btn">
          <span className="text-sm font-bold text-green-700 group-hover:underline decoration-2 underline-offset-4 transition-all">Visualizar dados</span>
          <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white shadow-md transition-all duration-300 group-hover:scale-110 group-hover:bg-green-700 group-hover:shadow-lg">
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  )
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function HighlightedText({ text, query }: { text: string; query?: string }) {
  const q = (query || '').trim()
  if (!q) return <>{text}</>

  const parts = text.split(new RegExp(`(${escapeRegex(q)})`, 'ig'))
  return (
    <>
      {parts.map((part, idx) => {
        const isMatch = part.toLowerCase() === q.toLowerCase()
        return isMatch ? (
          <mark key={idx} className="bg-yellow-200/70 text-inherit rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        )
      })}
    </>
  )
}
