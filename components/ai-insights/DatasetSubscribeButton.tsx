'use client'

import { useEffect, useState } from 'react'
import { Bell, BellRing } from 'lucide-react'

export function DatasetSubscribeButton({ datasetId }: { datasetId: number }) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/datasets/${datasetId}/subscribe`)
      .then((r) => (r.ok ? r.json() : { subscribed: false }))
      .then((data) => {
        if (!cancelled) setSubscribed(Boolean(data.subscribed))
      })
      .catch(() => {
        if (!cancelled) setSubscribed(false)
      })
    return () => {
      cancelled = true
    }
  }, [datasetId])

  async function toggle() {
    const next = !subscribed
    setSubscribed(next)
    try {
      await fetch(`/api/datasets/${datasetId}/subscribe`, { method: next ? 'POST' : 'DELETE' })
    } catch {
      setSubscribed(!next)
    }
  }

  if (subscribed === null) return null

  return (
    <button
      type="button"
      onClick={toggle}
      title={subscribed ? 'Cancelar alerta de actualização' : 'Avisar-me quando este dataset for actualizado'}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
        subscribed
          ? 'bg-[#F1F8F4] border border-[#CFE3D6] text-[#064E2C]'
          : 'border border-gray-200 text-gray-500 hover:border-[#CFE3D6] hover:text-[#064E2C]'
      }`}
    >
      {subscribed ? <BellRing className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
      {subscribed ? 'A avisar' : 'Avisar-me'}
    </button>
  )
}
