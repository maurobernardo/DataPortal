'use client'

import { useEffect, useState } from 'react'
import { Loader2, RotateCcw, Save } from 'lucide-react'
import { MAP_CATALOG } from '@/lib/maps-catalog'

type OverrideRow = {
  slug: string
  title: string | null
  subtitle: string | null
  description: string | null
  coverage: string | null
  category: string | null
  badgesJson: string | null
  highlightsJson: string | null
  featured: number | null
  heroStatValue: string | null
  heroStatLabel: string | null
}

type FormState = {
  title: string
  subtitle: string
  description: string
  coverage: string
  category: string
  badges: string
  highlights: string
  featured: boolean
  heroStatValue: string
  heroStatLabel: string
}

function emptyForm(): FormState {
  return {
    title: '',
    subtitle: '',
    description: '',
    coverage: '',
    category: '',
    badges: '',
    highlights: '',
    featured: false,
    heroStatValue: '',
    heroStatLabel: '',
  }
}

function overrideToForm(o: OverrideRow | undefined): FormState {
  if (!o) return emptyForm()
  let badges: string[] = []
  let highlights: string[] = []
  try {
    if (o.badgesJson) badges = JSON.parse(o.badgesJson)
  } catch {
    /* ignora */
  }
  try {
    if (o.highlightsJson) highlights = JSON.parse(o.highlightsJson)
  } catch {
    /* ignora */
  }
  return {
    title: o.title || '',
    subtitle: o.subtitle || '',
    description: o.description || '',
    coverage: o.coverage || '',
    category: o.category || '',
    badges: badges.join(', '),
    highlights: highlights.join('\n'),
    featured: o.featured === 1,
    heroStatValue: o.heroStatValue || '',
    heroStatLabel: o.heroStatLabel || '',
  }
}

export function MapsAdminPanel() {
  const [selectedSlug, setSelectedSlug] = useState(MAP_CATALOG[0]?.slug || '')
  const [overrides, setOverrides] = useState<OverrideRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/map-overrides')
      .then((r) => r.json())
      .then((data) => setOverrides(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const current = overrides.find((o) => o.slug === selectedSlug)
    setForm(overrideToForm(current))
    setMessage(null)
  }, [selectedSlug, overrides])

  const selectedMap = MAP_CATALOG.find((m) => m.slug === selectedSlug)

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/map-overrides/${selectedSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          subtitle: form.subtitle,
          description: form.description,
          coverage: form.coverage,
          category: form.category,
          badges: form.badges.split(',').map((b) => b.trim()).filter(Boolean),
          highlights: form.highlights.split('\n').map((h) => h.trim()).filter(Boolean),
          featured: form.featured,
          heroStatValue: form.heroStatValue,
          heroStatLabel: form.heroStatLabel,
        }),
      })
      if (!res.ok) throw new Error('Erro ao guardar')
      const listRes = await fetch('/api/admin/map-overrides')
      setOverrides(await listRes.json())
      setMessage('Guardado com sucesso.')
    } catch {
      setMessage('Erro ao guardar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!confirm('Repor este mapa para os valores predefinidos do código?')) return
    setSaving(true)
    setMessage(null)
    try {
      await fetch(`/api/admin/map-overrides/${selectedSlug}`, { method: 'DELETE' })
      const listRes = await fetch('/api/admin/map-overrides')
      setOverrides(await listRes.json())
      setMessage('Reposto para as predefinições.')
    } catch {
      setMessage('Erro ao repor. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        A carregar…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        Este painel edita apenas os metadados (título, descrição, badges, destaque) dos mapas já
        publicados no código. Criar um novo mapa/dashboard continua a exigir desenvolvimento: cada
        um tem uma visualização própria.
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Mapa</label>
        <select
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white"
        >
          {MAP_CATALOG.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Título <span className="text-xs font-normal text-gray-500">(predefinição: {selectedMap?.title})</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={selectedMap?.title}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Subtítulo</label>
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            placeholder={selectedMap?.subtitle}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder={selectedMap?.description}
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Cobertura</label>
          <input
            type="text"
            value={form.coverage}
            onChange={(e) => setForm({ ...form, coverage: e.target.value })}
            placeholder={selectedMap?.coverage}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Categoria</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder={selectedMap?.category}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Badges <span className="text-xs font-normal text-gray-500">(separadas por vírgula)</span>
        </label>
        <input
          type="text"
          value={form.badges}
          onChange={(e) => setForm({ ...form, badges: e.target.value })}
          placeholder={selectedMap?.badges.join(', ')}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Destaques <span className="text-xs font-normal text-gray-500">(um por linha)</span>
        </label>
        <textarea
          value={form.highlights}
          onChange={(e) => setForm({ ...form, highlights: e.target.value })}
          placeholder={selectedMap?.highlights?.join('\n')}
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Estatística: valor</label>
          <input
            type="text"
            value={form.heroStatValue}
            onChange={(e) => setForm({ ...form, heroStatValue: e.target.value })}
            placeholder={selectedMap?.heroStat?.value}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Estatística: legenda</label>
          <input
            type="text"
            value={form.heroStatLabel}
            onChange={(e) => setForm({ ...form, heroStatLabel: e.target.value })}
            placeholder={selectedMap?.heroStat?.label}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
          />
        </div>
        <label className="flex items-center gap-2 px-4 py-3">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-semibold text-gray-700">Destacado no catálogo</span>
        </label>
      </div>

      {message && <p className="text-sm text-gray-600">{message}</p>}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 disabled:opacity-60"
        >
          <RotateCcw className="w-4 h-4" />
          Repor predefinições
        </button>
      </div>
    </div>
  )
}
