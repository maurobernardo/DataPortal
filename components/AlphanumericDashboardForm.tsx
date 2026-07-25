'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Edit, ExternalLink, Loader2, Plus, Save, Trash2, X } from 'lucide-react'
import { mergeDashboardCategorySelectOptions } from '@/lib/dashboard-utils'

interface AlphanumericDashboard {
  id: number
  name: string
  dashboardUrl: string
  description?: string | null
  previewImagePath?: string | null
  category?: string | null
}

export function AlphanumericDashboardForm() {
  const router = useRouter()
  const [items, setItems] = useState<AlphanumericDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPreview, setUploadingPreview] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    dashboardUrl: '',
    description: '',
    previewImagePath: '',
    category: 'Outros',
  })
  const previewUploadSeqRef = useRef(0)
  const [categoryOptions, setCategoryOptions] = useState<string[]>(() =>
    mergeDashboardCategorySelectOptions([])
  )
  async function handlePreviewUpload(file: File) {
    if (!file) return
    const uploadSeq = ++previewUploadSeqRef.current
    setUploadingPreview(true)
    try {
      const data = new FormData()
      data.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: data })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erro ao fazer upload da imagem')

      // Evita sobrescrever formulário com upload antigo concluído depois de reset/novo cadastro.
      if (uploadSeq === previewUploadSeqRef.current) {
        setFormData((prev) => ({ ...prev, previewImagePath: result.filePath }))
      }
    } catch (error) {
      console.error(error)
      alert('Erro ao fazer upload da imagem de pré-visualização')
    } finally {
      setUploadingPreview(false)
    }
  }


  useEffect(() => {
    loadItems()
  }, [])

  useEffect(() => {
    fetch('/api/dashboard-categories')
      .then(async (res) => {
        if (!res.ok) return []
        const data = await res.json().catch(() => [])
        const names =
          Array.isArray(data) && data.length && typeof data[0] === 'object' && data[0] !== null && 'name' in data[0]
            ? (data as { name?: string }[]).map((r) => r.name || '').filter(Boolean)
            : []
        setCategoryOptions(mergeDashboardCategorySelectOptions(names))
      })
      .catch(() => {})
  }, [])

  async function loadItems() {
    try {
      const response = await fetch('/api/alphanumeric-dashboards')
      const data = await response.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading alphanumeric dashboards:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (uploadingPreview) {
      alert('Aguarde o upload da imagem terminar antes de salvar.')
      return
    }
    setSubmitting(true)
    try {
      const url = editingId ? `/api/alphanumeric-dashboards/${editingId}` : '/api/alphanumeric-dashboards'
      const method = editingId ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) throw new Error('Erro ao salvar dashboard')

      previewUploadSeqRef.current++
      setFormData({ name: '', dashboardUrl: '', description: '', previewImagePath: '', category: 'Outros' })
      setEditingId(null)
      await loadItems()
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar dashboard alfanumérico')
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(item: AlphanumericDashboard) {
    setEditingId(item.id)
    setFormData({
      name: item.name,
      dashboardUrl: item.dashboardUrl,
      description: item.description || '',
      previewImagePath: item.previewImagePath || '',
      category: item.category || 'Outros',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este dashboard?')) return
    try {
      const response = await fetch(`/api/alphanumeric-dashboards/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Erro ao excluir')
      await loadItems()
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Erro ao excluir dashboard alfanumérico')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              {editingId ? <Edit className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{editingId ? 'Editar Dashboard' : 'Novo Dashboard'}</h2>
              <p className="text-green-100 text-sm">Cadastre dashboards de dados alfanuméricos</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nome *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
              placeholder="Ex: Painel de Indicadores Econômicos"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Categoria *</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Inclui categorias cadastradas em admin (tipo «Dashboards públicos»). O nome da categoria no dashboard deve coincidir com um destes valores.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Link do Dashboard *</label>
            <input
              type="url"
              required
              value={formData.dashboardUrl}
              onChange={(e) => setFormData({ ...formData, dashboardUrl: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Imagem de Pré-visualização</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) await handlePreviewUpload(file)
              }}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl bg-white"
            />
            {uploadingPreview && <p className="text-xs text-gray-500 mt-2">Enviando imagem...</p>}
            {formData.previewImagePath && (
              <div className="mt-2 rounded-lg border border-gray-200 p-2 bg-gray-50">
                <img
                  src={formData.previewImagePath}
                  alt="Pré-visualização"
                  className="w-full h-32 object-cover rounded-md"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || uploadingPreview}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? 'Atualizar' : 'Cadastrar'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setFormData({ name: '', dashboardUrl: '', description: '', previewImagePath: '', category: 'Outros' })
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
          <h2 className="text-2xl font-bold">Dashboards Cadastrados</h2>
        </div>
        <div className="p-4 space-y-3 max-h-[680px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-10">Nenhum dashboard cadastrado.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="font-bold text-gray-800">{item.name}</div>
                {item.category && (
                  <span className="inline-block mt-1 text-xs font-semibold text-green-800 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    {item.category}
                  </span>
                )}
                <a href={item.dashboardUrl} target="_blank" rel="noreferrer" className="text-sm text-green-700 inline-flex items-center gap-1 mt-1">
                  <ExternalLink className="w-3 h-3" />
                  Abrir link
                </a>
                {item.description && <p className="text-sm text-gray-600 mt-2">{item.description}</p>}
                {item.previewImagePath && (
                  <img
                    src={item.previewImagePath}
                    alt={`Preview ${item.name}`}
                    className="mt-3 w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleEdit(item)} className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm inline-flex items-center gap-1">
                    <Trash2 className="w-3 h-3" />
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

