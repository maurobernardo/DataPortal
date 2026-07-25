'use client'

import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { format, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export type TemporalGranularity = 'daily' | 'weekly'

interface Statistic {
  id: number
  type: string
  createdAt: string | Date
}

interface TemporalChartProps {
  statistics: Statistic[]
  granularity?: TemporalGranularity
}

function bucketKey(date: Date, granularity: TemporalGranularity): string {
  if (granularity === 'weekly') {
    return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  }
  return format(date, 'yyyy-MM-dd')
}

function bucketLabel(key: string, granularity: TemporalGranularity): string {
  const d = new Date(`${key}T00:00:00`)
  if (granularity === 'weekly') {
    return format(d, "'Sem.' w · dd/MM", { locale: ptBR })
  }
  return format(d, 'dd/MM', { locale: ptBR })
}

export function TemporalChart({ statistics, granularity = 'daily' }: TemporalChartProps) {
  const { labels, viewsData, downloadsData } = useMemo(() => {
    const buckets = statistics.reduce(
      (acc, stat) => {
        const date = new Date(stat.createdAt as string)
        if (Number.isNaN(date.getTime())) return acc
        const key = bucketKey(date, granularity)
        if (!acc[key]) acc[key] = { views: 0, downloads: 0 }
        if (stat.type === 'view') acc[key].views++
        else if (stat.type === 'download') acc[key].downloads++
        return acc
      },
      {} as Record<string, { views: number; downloads: number }>
    )

    const keys = Object.keys(buckets).sort()
    return {
      labels: keys.map((k) => bucketLabel(k, granularity)),
      viewsData: keys.map((k) => buckets[k].views),
      downloadsData: keys.map((k) => buckets[k].downloads),
    }
  }, [statistics, granularity])

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Visualizações',
        data: viewsData,
        borderColor: 'rgb(6, 78, 44)',
        backgroundColor: 'rgba(6, 78, 44, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Downloads',
        data: downloadsData,
        borderColor: 'rgb(22, 163, 74)',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        tension: 0.4,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  }

  if (labels.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-sm text-gray-500">
        Sem dados no período seleccionado.
      </div>
    )
  }

  return (
    <div className="h-80">
      <Line data={chartData} options={options} />
    </div>
  )
}
