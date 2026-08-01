import { Clock } from 'lucide-react'

function formatDatePt(dateStr: string) {
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function DashboardLastUpdateBadge({ date }: { date?: string | null }) {
  if (!date) return null
  const formatted = formatDatePt(date)
  if (!formatted) return null
  return (
    <span className="db-last-update-badge" title="Data de actualização dos dados registada no portal">
      <Clock className="size-3" aria-hidden />
      Actualizado em {formatted}
    </span>
  )
}
