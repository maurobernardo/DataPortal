'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Bookmark,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Columns2,
  Copy,
  Eye,
  Layers,
  Lightbulb,
  Loader2,
  MapPinned,
  MousePointerClick,
  Search,
  Sparkles,
  Table2,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import { getSuggestedQuestions } from '@/lib/ai-suggested-questions'
import { getCategoryIcon } from '@/lib/ai-category-icons'
import { type AiAnalysisResultWithSources } from '@/components/ai-insights/AIResultView'
import { AIResultOverlay } from '@/components/ai-insights/AIResultOverlay'
import { AIOnboardingExample } from '@/components/ai-insights/AIOnboardingExample'
import { AIHowItWorksGuide } from '@/components/ai-insights/AIHowItWorksGuide'
import { ONBOARDING_EXAMPLE_DATASET_ID, ONBOARDING_EXAMPLE_QUESTION } from '@/lib/ai-onboarding-example'
import { parseApiResponse } from '@/lib/parse-api-response'

export type WorkspaceCategory = {
  id: number
  name: string
  dataType: string
}

export type WorkspaceDataset = {
  id: number
  title: string
  source: string | null
  year: number | string | null
  dataType: string
  format: string | null
  category: WorkspaceCategory | null
}

type WorkspaceUser = { id: number; name: string | null; email: string }

type SavedTile = {
  id: number
  title: string
  question: string
  datasetIds: number[]
  result: AiAnalysisResultWithSources
  shareToken: string
  createdAt: string
}

type ConversationTurn = { question: string; narrative: string }

const MAX_DATASETS = 3
const MAX_QUESTION_LENGTH = 500

export function AIWorkspaceClient({
  user,
  categories,
  datasets,
}: {
  user: WorkspaceUser
  categories: WorkspaceCategory[]
  datasets: WorkspaceDataset[]
}) {
  const [activeTab, setActiveTab] = useState<'explorar' | 'dashboards'>('explorar')

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all')
  const [manualExpanded, setManualExpanded] = useState<Record<number | string, boolean>>({})

  const [selected, setSelected] = useState<WorkspaceDataset[]>([])
  const [question, setQuestion] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [history, setHistory] = useState<ConversationTurn[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AiAnalysisResultWithSources | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [tiles, setTiles] = useState<SavedTile[] | null>(null)
  const [tilesLoading, setTilesLoading] = useState(false)
  const [copiedTileId, setCopiedTileId] = useState<number | null>(null)
  const [compareIds, setCompareIds] = useState<number[]>([])

  const hasFilter = search.trim().length > 0 || categoryFilter !== 'all'

  const filteredDatasets = useMemo(() => {
    const q = search.trim().toLowerCase()
    return datasets.filter((d) => {
      if (categoryFilter !== 'all' && d.category?.id !== categoryFilter) return false
      if (q) {
        const haystack = `${d.title} ${d.source || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [datasets, search, categoryFilter])

  const groups = useMemo(() => {
    const map = new Map<number | string, { category: WorkspaceCategory | null; items: WorkspaceDataset[] }>()
    for (const d of filteredDatasets) {
      const key = d.category?.id ?? 'sem-categoria'
      if (!map.has(key)) map.set(key, { category: d.category ?? null, items: [] })
      map.get(key)!.items.push(d)
    }
    return Array.from(map.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => (a.category?.name || 'Sem categoria').localeCompare(b.category?.name || 'Sem categoria'))
  }, [filteredDatasets])

  const topCategories = useMemo(() => {
    const counts = new Map<number, number>()
    for (const d of datasets) {
      if (d.category?.id) counts.set(d.category.id, (counts.get(d.category.id) || 0) + 1)
    }
    return categories
      .filter((c) => (counts.get(c.id) || 0) > 0)
      .sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0))
      .slice(0, 8)
  }, [categories, datasets])

  function isExpanded(key: number | string, index: number) {
    if (key in manualExpanded) return manualExpanded[key]
    if (hasFilter) return true
    return index < 2
  }

  function toggleCategory(key: number | string, index: number) {
    setManualExpanded((prev) => ({ ...prev, [key]: !isExpanded(key, index) }))
  }

  function resetAnalysisState() {
    setResult(null)
    setError(null)
    setQuestion('')
    setLastQuestion('')
    setHistory([])
    setSaved(false)
    setOverlayOpen(false)
  }

  function toggleDataset(dataset: WorkspaceDataset) {
    setSelected((prev) => {
      if (prev.some((d) => d.id === dataset.id)) {
        return prev.filter((d) => d.id !== dataset.id)
      }
      if (prev.length >= MAX_DATASETS) return prev
      return [...prev, dataset]
    })
    resetAnalysisState()
  }

  function removeDataset(id: number) {
    setSelected((prev) => prev.filter((d) => d.id !== id))
    resetAnalysisState()
  }

  function applyCategoryTemplate(categoryId: number) {
    const inCategory = datasets.filter((d) => d.category?.id === categoryId)
    if (inCategory.length === 0) return
    const geo = inCategory.find((d) => d.dataType === 'geoespacial')
    const alfa = inCategory.find((d) => d.dataType === 'alfanumerico')
    const picks: WorkspaceDataset[] = []
    if (geo) picks.push(geo)
    if (alfa) picks.push(alfa)
    for (const d of inCategory) {
      if (picks.length >= MAX_DATASETS) break
      if (!picks.some((p) => p.id === d.id)) picks.push(d)
    }
    setSelected(picks.slice(0, MAX_DATASETS))
    resetAnalysisState()
    setCategoryFilter(categoryId)
  }

  function tryOnboardingExample() {
    const dataset = datasets.find((d) => d.id === ONBOARDING_EXAMPLE_DATASET_ID)
    if (!dataset) return
    setSelected([dataset])
    resetAnalysisState()
    setQuestion(ONBOARDING_EXAMPLE_QUESTION)
  }

  async function submitQuery(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (selected.length === 0) {
      setError('Seleccione pelo menos um dataset para analisar.')
      return
    }
    if (!question.trim()) {
      setError('Escreva uma pergunta.')
      return
    }

    setLoading(true)
    setSaved(false)
    setResult(null)
    const askedQuestion = question.trim()
    setLastQuestion(askedQuestion)
    setOverlayOpen(true)

    try {
      const response = await fetch('/api/ai-insights/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: askedQuestion,
          dataset_ids: selected.map((d) => d.id),
          history,
        }),
      })

      const { data, ok } = await parseApiResponse<AiAnalysisResultWithSources & { error?: string }>(response)

      if (!ok) {
        throw new Error((data as any).error || 'Não foi possível concluir a análise.')
      }

      setResult(data)
      setHistory((prev) => [...prev, { question: askedQuestion, narrative: data.narrative }])
      setQuestion('')
    } catch (err: any) {
      setError(err.message || 'Erro ao processar o pedido.')
    } finally {
      setLoading(false)
    }
  }

  async function saveTile() {
    if (!result) return
    setSaving(true)
    try {
      const title = selected.map((d) => d.title).join(' + ').slice(0, 140) || 'Análise de dados'
      const response = await fetch('/api/ai-insights/tiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          question: history[history.length - 1]?.question || question,
          dataset_ids: selected.map((d) => d.id),
          result,
        }),
      })
      const { ok } = await parseApiResponse(response)
      if (ok) {
        setSaved(true)
        setTiles(null)
      }
    } catch {
      /* falha ao guardar é não-crítica; utilizador pode tentar novamente */
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'dashboards' || tiles !== null) return
    setTilesLoading(true)
    fetch('/api/ai-insights/tiles')
      .then((r) => r.json())
      .then((data) => setTiles(Array.isArray(data.tiles) ? data.tiles : []))
      .catch(() => setTiles([]))
      .finally(() => setTilesLoading(false))
  }, [activeTab, tiles])

  async function removeTile(id: number) {
    setTiles((prev) => (prev ? prev.filter((t) => t.id !== id) : prev))
    try {
      await fetch(`/api/ai-insights/tiles/${id}`, { method: 'DELETE' })
    } catch {
      /* ignora — a lista já foi actualizada optimisticamente */
    }
  }

  function toggleCompare(id: number) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return prev
      return [...prev, id]
    })
  }

  function copyShareLink(tile: SavedTile) {
    const url = `${window.location.origin}/ai-insights/share/${tile.shareToken}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedTileId(tile.id)
      setTimeout(() => setCopiedTileId(null), 2000)
    })
  }

  const userInitials =
    (user.name || user.email)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'U'

  const hasGeoAlfaCombo =
    selected.some((d) => d.dataType === 'geoespacial') && selected.some((d) => d.dataType === 'alfanumerico')
  const suggestedQuestions = useMemo(() => getSuggestedQuestions(selected, datasets), [selected, datasets])

  return (
    <div className="font-body-stack min-h-screen bg-gradient-to-b from-[#f8faf8] via-white to-white">
      <header className="border-b border-[#E2E8E5] bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href="/ai-insights"
                className="group inline-flex items-center gap-2 rounded-xl border border-[#E2E8E5] bg-white pl-1.5 pr-3 py-1.5 shadow-sm hover:shadow-md hover:-translate-x-0.5 transition-all"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#F1F8F4] text-[#064E2C] group-hover:bg-[#064E2C] group-hover:text-white transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-gray-700">AI Insights</span>
              </Link>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3 flex items-center gap-3 tracking-tight">
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#064E2C] to-[#6B4FBB] text-white shadow-sm">
                  <Brain className="w-5 h-5" />
                </span>
                Análise de dados com IA
              </h1>
              <p className="text-base md:text-[17px] text-gray-600 mt-2 max-w-xl leading-relaxed">
                Pergunte em linguagem natural, visualize automaticamente e peça previsões, sempre com
                fontes auditáveis dos dados oficiais do portal.
              </p>
            </div>
            <div className="inline-flex items-center gap-2.5 rounded-2xl border border-[#E2E8E5] bg-[#FAFBFA] pl-2 pr-4 py-2 shadow-sm">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-[#064E2C] to-[#1FA365] text-white text-xs font-bold shadow-sm">
                {userInitials}
              </span>
              <div className="leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Sessão activa</p>
                <p className="text-sm font-bold text-gray-800">{user.name || user.email}</p>
              </div>
            </div>
          </div>

          <AIHowItWorksGuide />

          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={() => setActiveTab('explorar')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'explorar'
                  ? 'bg-gradient-to-r from-[#064E2C] to-[#1FA365] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Explorar dados
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dashboards')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'dashboards'
                  ? 'bg-gradient-to-r from-[#064E2C] to-[#1FA365] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              Meus dashboards{tiles && tiles.length > 0 ? ` (${tiles.length})` : ''}
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'dashboards' ? (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {tilesLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !tiles || tiles.length === 0 ? (
            <div className="text-center py-16">
              <Bookmark className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Ainda não guardou nenhuma análise. Faça uma pergunta em "Explorar dados" e clique em
                "Guardar no meu dashboard".
              </p>
            </div>
          ) : (
            <>
            {tiles.length >= 2 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#CFE3D6] bg-[#F1F8F4] px-4 py-2.5">
                <p className="text-xs text-[#064E2C] font-semibold">
                  {compareIds.length === 0 &&
                    'Seleccione duas análises (ícone de comparação) para ver lado a lado.'}
                  {compareIds.length === 1 && 'Seleccione mais uma análise para comparar.'}
                  {compareIds.length === 2 && 'Duas análises seleccionadas.'}
                </p>
                <div className="flex items-center gap-2">
                  {compareIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCompareIds([])}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                    >
                      Limpar
                    </button>
                  )}
                  {compareIds.length === 2 && (
                    <Link
                      href={`/ai-insights/dashboards/compare?ids=${compareIds.join(',')}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#064E2C] to-[#1FA365] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-105 transition-all"
                    >
                      <Columns2 className="w-3.5 h-3.5" />
                      Comparar
                    </Link>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tiles.map((tile) => {
                const badges = [
                  tile.result.chart ? { label: 'Gráfico', icon: BarChart3 } : null,
                  tile.result.map ? { label: 'Mapa', icon: MapPinned } : null,
                  tile.result.forecast ? { label: 'Previsão', icon: TrendingUp } : null,
                ].filter(Boolean) as { label: string; icon: typeof BarChart3 }[]
                return (
                  <div
                    key={tile.id}
                    className="rounded-2xl border border-[#E2E8E5] bg-white shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col"
                  >
                    <div className="h-1.5 -mx-4 -mt-4 mb-3 rounded-t-2xl bg-gradient-to-r from-[#064E2C] to-[#6B4FBB]" />
                    <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 mb-1.5">{tile.title}</p>
                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {badges.map(({ label, icon: Icon }) => (
                          <span
                            key={label}
                            className="inline-flex items-center gap-1 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-2 py-0.5 text-[10px] font-bold text-[#064E2C]"
                          >
                            <Icon className="w-2.5 h-2.5" />
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 italic mb-2 line-clamp-1">"{tile.question}"</p>
                    <p className="text-xs text-gray-600 line-clamp-3 flex-1">{tile.result.narrative}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-[11px] text-gray-500">
                        {new Date(tile.createdAt).toLocaleDateString('pt-PT')}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleCompare(tile.id)}
                          disabled={!compareIds.includes(tile.id) && compareIds.length >= 2}
                          className={`rounded-lg p-1.5 disabled:opacity-30 ${
                            compareIds.includes(tile.id)
                              ? 'bg-[#064E2C] text-white'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                          title="Seleccionar para comparar"
                        >
                          <Columns2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => copyShareLink(tile)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                          title="Copiar link de partilha"
                        >
                          {copiedTileId === tile.id ? (
                            <Check className="w-4 h-4 text-[#064E2C]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTile(tile.id)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <Link
                      href={`/ai-insights/dashboards/${tile.id}`}
                      className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#064E2C] to-[#1FA365] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-105 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver detalhes
                    </Link>
                  </div>
                )
              })}
            </div>
            </>
          )}
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <AIOnboardingExample onTryIt={tryOnboardingExample} />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6 items-start">
          {/* ── Catálogo ─────────────────────────────────────────── */}
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 flex items-center gap-2 rounded-xl border-2 border-[#CFE3D6] bg-white px-3 py-2 shadow-sm focus-within:border-[#064E2C] focus-within:ring-2 focus-within:ring-[#064E2C]/15">
                <Search className="w-4 h-4 shrink-0 text-[#064E2C]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar por nome ou fonte…"
                  className="flex-1 min-w-0 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </div>
              <select
                value={categoryFilter === 'all' ? 'all' : String(categoryFilter)}
                onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="rounded-xl border-2 border-[#CFE3D6] bg-white px-3 py-2 text-sm outline-none focus:border-[#064E2C]"
              >
                <option value="all">Todas as categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {topCategories.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">
                  Atalhos rápidos por categoria
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {topCategories.map((c) => {
                    const CategoryIcon = getCategoryIcon(c.name)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => applyCategoryTemplate(c.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8E5] bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-[#064E2C] hover:text-[#064E2C] transition-colors"
                      >
                        <CategoryIcon className="w-3.5 h-3.5" />
                        Análise rápida de {c.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">
                {filteredDatasets.length} dataset{filteredDatasets.length === 1 ? '' : 's'} em {groups.length}{' '}
                categoria
                {groups.length === 1 ? '' : 's'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setManualExpanded(Object.fromEntries(groups.map((g) => [g.key, true])))}
                  className="text-xs font-semibold text-[#064E2C] hover:underline"
                >
                  Expandir tudo
                </button>
                <span className="text-gray-300">·</span>
                <button
                  type="button"
                  onClick={() => setManualExpanded(Object.fromEntries(groups.map((g) => [g.key, false])))}
                  className="text-xs font-semibold text-[#064E2C] hover:underline"
                >
                  Recolher tudo
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {groups.map((group, index) => {
                const expanded = isExpanded(group.key, index)
                const CategoryIcon = getCategoryIcon(group.category?.name)
                return (
                  <div
                    key={group.key}
                    className="rounded-2xl border border-[#E2E8E5] bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory(group.key, index)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3.5 bg-gradient-to-r from-[#F8FAF9] to-white hover:from-[#F1F8F4] transition-colors"
                    >
                      <span className="flex items-center gap-2.5 text-sm font-bold text-gray-900">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#F1F8F4] border border-[#CFE3D6] text-[#064E2C]">
                          <CategoryIcon className="w-4 h-4" />
                        </span>
                        {group.category?.name || 'Sem categoria'}
                        <span className="rounded-full bg-white border border-[#CFE3D6] px-2 py-0.5 text-[11px] font-semibold text-[#064E2C]">
                          {group.items.length}
                        </span>
                      </span>
                      {expanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    {expanded && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 pt-1">
                        {group.items.map((dataset) => {
                          const isSelected = selected.some((s) => s.id === dataset.id)
                          return (
                            <div
                              key={dataset.id}
                              className={`rounded-xl border p-3.5 transition-all ${
                                isSelected
                                  ? 'border-[#064E2C] bg-[#F1F8F4] ring-1 ring-[#064E2C]/20'
                                  : 'border-[#E2E8E5] bg-white hover:border-[#CFE3D6] hover:shadow-md hover:-translate-y-0.5'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                                  {dataset.title}
                                </p>
                                <span
                                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                    dataset.dataType === 'geoespacial'
                                      ? 'bg-[#EAF2FB] text-[#1F6FB2]'
                                      : 'bg-[#F5F0FB] text-[#6B4FBB]'
                                  }`}
                                  title={dataset.dataType === 'geoespacial' ? 'Dados geoespaciais' : 'Dados alfanuméricos'}
                                >
                                  {dataset.dataType === 'geoespacial' ? (
                                    <MapPinned className="w-2.5 h-2.5" />
                                  ) : (
                                    <Table2 className="w-2.5 h-2.5" />
                                  )}
                                  {dataset.dataType === 'geoespacial' ? 'Geo' : 'Tabular'}
                                </span>
                              </div>
                              {dataset.category?.name && (
                                <span className="inline-block mt-1.5 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-2 py-0.5 text-[10px] font-bold text-[#064E2C]">
                                  {dataset.category.name}
                                </span>
                              )}
                              <p className="text-xs text-gray-500 mt-1.5">
                                {dataset.source || 'Fonte não especificada'} · {dataset.year ?? '—'}
                              </p>
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-50 rounded px-1.5 py-0.5">
                                  {dataset.format || dataset.dataType}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleDataset(dataset)}
                                  disabled={!isSelected && selected.length >= MAX_DATASETS}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                    isSelected
                                      ? 'bg-[#064E2C] text-white'
                                      : 'bg-[#F1F8F4] text-[#064E2C] hover:bg-[#064E2C] hover:text-white'
                                  }`}
                                >
                                  {isSelected ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      Seleccionado
                                    </>
                                  ) : selected.length >= MAX_DATASETS ? (
                                    'Máximo atingido'
                                  ) : (
                                    'Seleccionar'
                                  )}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {groups.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-10">
                  Nenhum dataset corresponde à pesquisa/filtro actual.
                </p>
              )}
            </div>
          </div>

          {/* ── Painel de análise ────────────────────────────────── */}
          <div className="lg:sticky lg:top-4 rounded-3xl border border-[#E2E8E5] bg-white shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#064E2C] to-[#6B4FBB] px-5 py-3.5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5" />
                Painel de análise
              </h2>
            </div>
            <div className="p-5">

            {selected.length === 0 ? (
              <div className="text-center py-6">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#F1F8F4] border border-[#CFE3D6] text-[#064E2C] mb-3">
                  <MousePointerClick className="w-5 h-5" />
                </span>
                <p className="text-sm font-semibold text-gray-700">Comece por escolher um ou mais datasets</p>
                <p className="text-sm text-gray-500 mt-1.5 max-w-xs mx-auto">
                  Clique em <strong className="text-gray-700">Seleccionar</strong> em qualquer card à
                  esquerda. Pode combinar até {MAX_DATASETS} datasets na mesma pergunta, incluindo um
                  dataset <MapPinned className="inline w-3 h-3 -mt-0.5 text-[#1F6FB2]" /> geoespacial com um{' '}
                  <Table2 className="inline w-3 h-3 -mt-0.5 text-[#6B4FBB]" /> tabular para gerar mapas e
                  gráficos cruzados.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selected.map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] pl-2.5 pr-1.5 py-1 text-xs font-medium text-[#064E2C]"
                    >
                      {d.dataType === 'geoespacial' ? (
                        <MapPinned className="w-3 h-3 shrink-0 text-[#1F6FB2]" />
                      ) : (
                        <Table2 className="w-3 h-3 shrink-0 text-[#6B4FBB]" />
                      )}
                      {d.title.length > 28 ? `${d.title.slice(0, 28)}…` : d.title}
                      <button
                        type="button"
                        onClick={() => removeDataset(d.id)}
                        className="rounded-full p-0.5 hover:bg-[#064E2C]/10"
                        aria-label={`Remover ${d.title}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {hasGeoAlfaCombo && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#CFE3D6] bg-[#F1F8F4] px-3 py-2.5 text-xs text-[#064E2C]">
                    <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Detectámos uma combinação de dados geoespaciais + tabulares: experimente pedir uma
                      relação entre eles (ex.: "cruza estes dois datasets por província e mostra num mapa").
                    </span>
                  </div>
                )}

                {selected.length < MAX_DATASETS && (
                  <p className="mb-4 text-[11px] text-gray-500">
                    Pode seleccionar mais {MAX_DATASETS - selected.length} dataset
                    {MAX_DATASETS - selected.length === 1 ? '' : 's'} clicando nos cards à esquerda.
                  </p>
                )}

                {history.length > 0 && (
                  <details className="mb-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <summary className="text-xs font-semibold text-gray-600 cursor-pointer">
                      Conversa anterior ({history.length})
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {history.map((h, i) => (
                        <li key={i} className="text-xs text-gray-500 italic">
                          "{h.question}"
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <form onSubmit={submitQuery} className="space-y-3">
                  {!result && (
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedQuestions.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setQuestion(q)}
                          className="rounded-full border border-[#E2E8E5] bg-[#FAFBFA] px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:border-[#064E2C] hover:text-[#064E2C] transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_LENGTH))}
                      rows={3}
                      placeholder={
                        result
                          ? 'Pergunta de seguimento (ex.: "e em 2023?")…'
                          : 'Escreva a sua pergunta sobre os datasets seleccionados…'
                      }
                      className="w-full rounded-xl border-2 border-[#CFE3D6] px-3 py-2 text-sm outline-none focus:border-[#064E2C] focus:ring-2 focus:ring-[#064E2C]/15 resize-none"
                    />
                    <p className="text-[11px] text-gray-500 mt-1 text-right">
                      {question.length}/{MAX_QUESTION_LENGTH}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#064E2C] to-[#1FA365] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        A analisar…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {result ? 'Perguntar' : 'Analisar com IA'}
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {error && !overlayOpen && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {result && !overlayOpen && (
              <button
                type="button"
                onClick={() => setOverlayOpen(true)}
                className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-[#CFE3D6] bg-[#F1F8F4] px-4 py-2.5 text-sm font-semibold text-[#064E2C] hover:bg-[#064E2C] hover:text-white transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Ver último resultado
              </button>
            )}
            </div>
          </div>
          </div>
        </div>
      )}

      <AIResultOverlay
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        loading={loading}
        error={error}
        result={result}
        questionAsked={lastQuestion}
        datasetTitles={selected.map((d) => d.title)}
        onSave={saveTile}
        saving={saving}
        saved={saved}
      />
    </div>
  )
}
