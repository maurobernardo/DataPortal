'use client'

import Link from 'next/link'
import { Trophy, Medal, Award, Hash, ArrowRight } from 'lucide-react'

interface Dataset {
  id: number
  title: string
  views: number
  downloads: number
  category: {
    name: string
  }
}

interface TopDatasetsProps {
  title: string
  datasets: Dataset[]
  metric: 'views' | 'downloads'
}

export function TopDatasets({ title, datasets, metric }: TopDatasetsProps) {
  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5" />
    if (index === 1) return <Medal className="w-5 h-5" />
    if (index === 2) return <Award className="w-5 h-5" />
    return <Hash className="w-4 h-4" />
  }

  const getRankColor = (index: number) => {
    if (index === 0) return 'from-yellow-400 to-yellow-500'
    if (index === 1) return 'from-gray-300 to-gray-400'
    if (index === 2) return 'from-orange-400 to-orange-500'
    return 'from-green-200 to-green-300'
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 animate-slide-up">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Trophy className="w-6 h-6 text-yellow-500" />
        {title}
      </h2>
      <div className="space-y-3">
        {datasets.map((dataset, index) => (
          <Link
            key={dataset.id}
            href={`/dataset/${dataset.id}`}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl hover:from-green-50 hover:to-green-100 transition-all duration-300 hover-lift group border border-gray-100"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${getRankColor(index)} flex items-center justify-center text-white shadow-lg`}>
                {getRankIcon(index)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate group-hover:text-green-600 transition">
                  {dataset.title}
                </p>
                <p className="text-sm text-gray-500">
                  {dataset.category.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <div className="text-right">
                <p className={`font-bold text-lg ${
                  metric === 'views' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric === 'views' ? dataset.views : dataset.downloads}
                </p>
                <p className="text-xs text-gray-500">
                  {metric === 'views' ? 'visualizações' : 'downloads'}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
