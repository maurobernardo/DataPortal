import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FolderTree, FileText, Save, X, Edit, Trash2, Loader2, Plus, CheckCircle2, XCircle } from 'lucide-react'

interface Category {
  id: number
  name: string
  description: string | null
  dataType?: string
}

function categoryTypeLabel(dataType: string | undefined) {
  switch (dataType) {
    case 'alfanumerico':
      return 'Alfanumérico'
    case 'dashboard':
      return 'Dashboards'
    default:
      return 'Geoespacial'
  }
}

export function CategoryForm() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dataType: 'geoespacial',
  })
  const [editingId, setEditingId] = useState<number | null>(null)

  function showFeedback(message: string, type: 'success' | 'error') {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    // Ocultar toast após 3 segundos
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  }

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const url = editingId
        ? `/api/categories/${editingId}`
        : '/api/categories'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        showFeedback(typeof data?.error === 'string' ? data.error : 'Erro ao salvar categoria', 'error')
        return
      }

      router.refresh()
      loadCategories()
      showFeedback('Categoria salva com sucesso!', 'success')
      setFormData({ name: '', description: '', dataType: 'geoespacial' })
      setEditingId(null)
    } catch (error) {
      console.error('Error saving category:', error)
      showFeedback('Erro ao salvar categoria', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(category: Category) {
    setFormData({
      name: category.name,
      description: category.description || '',
      dataType: (category as any).dataType || 'geoespacial',
    })
    setEditingId(category.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Erro ao excluir categoria')

      router.refresh()
      loadCategories()
      showFeedback('Categoria excluída com sucesso!', 'success')
    } catch (error) {
      console.error('Error deleting category:', error)
      showFeedback('Erro ao excluir categoria', 'error')
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
      {/* Formulário */}
      <div className="animate-slide-up">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                {editingId ? (
                  <Edit className="w-6 h-6" />
                ) : (
                  <Plus className="w-6 h-6" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {editingId ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>
                <p className="text-green-100 text-sm">
                  {editingId ? 'Atualize as informações da categoria' : 'Crie uma nova categoria para organizar os datasets'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-green-600" />
                Tipo de Dados *
              </label>
              <select
                value={formData.dataType}
                onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              >
                <option value="geoespacial">Dados Geoespaciais</option>
                <option value="alfanumerico">Dados Alfanuméricos</option>
                <option value="dashboard">Dashboards públicos</option>
              </select>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-green-600" />
                Nome *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ex: Infraestrutura"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              />
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Descreva a categoria..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 bg-white hover:border-gray-300 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{editingId ? 'Atualizar Categoria' : 'Criar Categoria'}</span>
                  </>
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({ name: '', description: '', dataType: 'geoespacial' })
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-300 font-semibold"
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Lista de Categorias */}
      <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <FolderTree className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Categorias Existentes</h2>
                <p className="text-green-100 text-sm">{categories.length} categoria(s) cadastrada(s)</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[700px] overflow-y-auto">
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma categoria cadastrada ainda.</p>
                <p className="text-gray-400 text-sm mt-2">Crie a primeira categoria usando o formulário ao lado.</p>
              </div>
            ) : (
              categories.map((category, index) => (
                <div
                  key={category.id}
                  className="bg-gradient-to-br from-gray-50 to-green-50 p-4 rounded-xl border border-gray-200 hover:border-green-300 transition-all duration-300 hover-lift animate-slide-up group"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <FolderTree className="w-5 h-5 text-green-600 shrink-0" />
                        <h3 className="font-bold text-gray-800 group-hover:text-green-600 transition">
                          {category.name}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-white/80 border border-green-200 text-green-800">
                          {categoryTypeLabel(category.dataType)}
                        </span>
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(category)}
                        className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-all duration-300 hover:scale-105 shadow-md"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-all duration-300 hover:scale-105 shadow-md"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Toast de Feedback */}
      {showToast && (
        <div 
          className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-lg text-white font-semibold max-w-sm z-50 animate-fade-in-up ${toastType === 'success' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-red-500'}`}
        >
          <div className="flex items-center gap-3">
            {toastType === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}