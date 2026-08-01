'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Loader2, Trash2 } from 'lucide-react'

export function AIDashboardDetailActions({ tileId, shareToken }: { tileId: number; shareToken: string }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function copyShareLink() {
    const url = `${window.location.origin}/ai-insights/share/${shareToken}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleDelete() {
    if (!window.confirm('Eliminar esta análise guardada? Esta acção não pode ser desfeita.')) return
    setDeleting(true)
    try {
      await fetch(`/api/ai-insights/tiles/${tileId}`, { method: 'DELETE' })
      router.push('/ai-insights/workspace')
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={copyShareLink}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE3D6] bg-[#F1F8F4] px-3.5 py-2 text-xs font-semibold text-[#064E2C] hover:bg-[#064E2C] hover:text-white transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Link copiado' : 'Copiar link de partilha'}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-60"
      >
        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        Eliminar
      </button>
    </div>
  )
}
