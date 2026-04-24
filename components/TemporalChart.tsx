'use client'

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
import { format } from 'date-fns'
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

interface Statistic {
  id: number
  type: string
  createdAt: string | Date  // Aceita string (serializado) ou Date
}

interface TemporalChartProps {
  statistics: Statistic[]
}

export function TemporalChart({ statistics }: TemporalChartProps) {
  // Agrupar estatísticas por dia
  const dailyStats = statistics.reduce((acc, stat) => {
    const date = format(new Date(stat.createdAt as string), 'yyyy-MM-dd')
    if (!acc[date]) {
      acc[date] = { views: 0, downloads: 0 }
    }
    if (stat.type === 'view') {
      acc[date].views++
    } else if (stat.type === 'download') {
      acc[date].downloads++
    }
    return acc
  }, {} as Record<string, { views: number; downloads: number }>)

  const dates = Object.keys(dailyStats).sort()
  const viewsData = dates.map((date) => dailyStats[date].views)
  const downloadsData = dates.map((date) => dailyStats[date].downloads)

  const chartData = {
    labels: dates.map((date) =>
      format(new Date(date + 'T00:00:00'), 'dd/MM', { locale: ptBR })
    ),
    datasets: [
      {
        label: 'Visualizações',
        data: viewsData,
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
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
      },
    },
  }

  return (
    <div className="h-80">
      <Line data={chartData} options={options} />
    </div>
  )
}

