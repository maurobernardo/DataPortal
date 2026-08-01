'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, FolderTree, MapPin, Calendar, Package, Database, FileCode, Tag, Save, X, Edit, Trash2, Loader2, Plus, Upload, CheckCircle2, Globe, XCircle } from 'lucide-react'

interface Category {
  id: number
  name: string
  dataType?: string
}

interface Dataset {
  id: number
  title: string
  description: string
  categoryId: number
  source: string
  year: number
  format: string
  fileSize: string
  filePath?: string
  geometry?: string
  coverage?: string
  minimumUnit?: string
  keywords: string
  dataType?: string
}

export function DatasetForm() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; path: string } | null>(null)
  const [legacyExcelWarning, setLegacyExcelWarning] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    source: '',
    year: new Date().getFullYear(),
    format: 'Shapefile',
    fileSize: '',
    filePath: '',
    geometry: '',
    coverage: '',
    minimumUnit: '',
    keywords: '',
    dataType: 'geoespacial',
  })
  const [editingId, setEditingId] = useState<number | null>(null)

  function showFeedback(message: string, type: 'success' | 'error') {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Recarregar categorias quando o dataType mudar
    if (formData.dataType) {
      loadCategories()
    }
  }, [formData.dataType])

  async function loadCategories() {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      // Filtrar categorias baseado no dataType selecionado
      const filteredCats = data.filter((cat: Category) => cat.dataType === formData.dataType)
      setCategories(filteredCats)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  async function loadData(page: number = 1, searchTerm: string = search) {
    try {
      const take = 10;
      const offset = (page - 1) * take;
      const searchQs = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''
      const [catsRes, datasetsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch(`/api/datasets?offset=${offset}&take=${take}${searchQs}`),
      ])
      const [cats, datasets] = await Promise.all([
        catsRes.json(),
        datasetsRes.json(),
      ])

      // Filtrar categorias baseado no dataType selecionado
      if (formData.dataType) {
        const filteredCats = cats.filter((cat: Category) => cat.dataType === formData.dataType)
        setCategories(filteredCats)
      } else {
        setCategories(cats)
      }
      setDatasets(datasets)

      // Obter total de páginas
      const countRes = await fetch(`/api/datasets/count${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
      let total = 0;

      if (countRes.ok) {
        const countData = await countRes.json();
        total = countData.total;
      } else {
        // Fallback: obter todos os datasets e contar
        const allDatasetsRes = await fetch('/api/datasets');
        const allDatasets = await allDatasetsRes.json();
        total = allDatasets.length;
      }

      setTotalPages(Math.max(1, Math.ceil(total / take)));
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    loadData(1, search)
  }

  async function uploadFile(file: File) {
    if (!file) return

    setUploading(true)
    setUploadedFile(null)

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    setLegacyExcelWarning(
      formData.dataType === 'alfanumerico' && (ext === '.xls' || ext === '.ods')
    )

    try {
      // Geoespacial: Shapefile deve ser ZIP (um .shp sozinho é incompleto)
      if (formData.dataType === 'geoespacial') {
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
        const isZip = ext === '.zip'
        const isTiff = ext === '.tif' || ext === '.tiff'
        const isGeoJson = ext === '.geojson' || ext === '.json'

        if (!isZip && !isTiff && !isGeoJson) {
          throw new Error('Para dados geoespaciais, envie .zip (Shapefile), .tif/.tiff (GeoTiff) ou .geojson/.json')
        }
      }

      const formDataObj = new FormData()
      formDataObj.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataObj,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer upload')
      }

      // Atualizar formData com informações do arquivo
      setFormData(prev => ({
        ...prev,
        filePath: data.filePath,
        fileSize: data.fileSize,
        format: getFormatFromFileName(file.name) || prev.format,
      }))

      setUploadedFile({
        name: data.fileName,
        size: data.fileSize,
        path: data.filePath,
      })
    } catch (error: any) {
      console.error('Error uploading file:', error)
      alert(error.message || 'Erro ao fazer upload do arquivo')
    } finally {
      setUploading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      await uploadFile(file)
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      await uploadFile(file)
    }
  }

  function getFormatFromFileName(fileName: string): string {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    const formatMap: { [key: string]: string } = {
      '.shp': 'Shapefile',
      '.tif': 'GeoTiff',
      '.tiff': 'GeoTiff',
      '.csv': formData.dataType === 'geoespacial' ? 'Shapefile/Csv' : 'CSV',
      '.zip': 'Shapefile',
      '.xlsx': 'Excel',
      '.xls': 'Excel',
      '.json': 'JSON',
      '.xml': 'XML',
    }
    return formatMap[ext] || (formData.dataType === 'geoespacial' ? 'Shapefile' : 'CSV')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Validar se há arquivo (obrigatório para novos datasets)
    if (!editingId && !formData.filePath) {
      alert('Por favor, faça o upload de um arquivo antes de salvar.')
      return
    }

    // Shapefile deve ser cadastrado via .zip
    if (
      formData.dataType === 'geoespacial' &&
      String(formData.format).toLowerCase() === 'shapefile' &&
      !String(formData.filePath).toLowerCase().endsWith('.zip')
    ) {
      alert('Para Shapefile, faça upload de um arquivo .zip')
      return
    }

    setSubmitting(true)

    try {
      const url = editingId
        ? `/api/datasets/${editingId}`
        : '/api/datasets'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao salvar dataset')
      }
      
      router.refresh()
      await loadData(currentPage)
      showFeedback('Dataset salvo com sucesso!', 'success')
      setFormData({
        title: '',
        description: '',
        categoryId: '',
        source: '',
        year: new Date().getFullYear(),
        format: formData.dataType === 'geoespacial' ? 'Shapefile' : 'CSV',
        fileSize: '',
        filePath: '',
        geometry: '',
        coverage: '',
        minimumUnit: '',
        keywords: '',
        dataType: 'geoespacial',
  })
      setUploadedFile(null)
      setEditingId(null)
    } catch (error: any) {
      console.error('Error saving dataset:', error)
      showFeedback(error.message || 'Erro ao salvar dataset', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(dataset: Dataset) {
    setFormData({
      title: dataset.title,
      description: dataset.description,
      categoryId: dataset.categoryId.toString(),
      source: dataset.source || '',
      year: dataset.year || new Date().getFullYear(),
      format: dataset.format,
      fileSize: dataset.fileSize || '',
      filePath: dataset.filePath || '',
      geometry: dataset.geometry || '',
      coverage: dataset.coverage || '',
      minimumUnit: dataset.minimumUnit || '',
      keywords: dataset.keywords || '',
      dataType: dataset.dataType || 'geoespacial',
    })
    setEditingId(dataset.id)
    setUploadedFile(dataset.filePath ? {
      name: dataset.filePath.split('/').pop() || 'Arquivo existente',
      size: dataset.fileSize || '',
      path: dataset.filePath || '',
    } : null)
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este dataset?')) return

    try {
      const response = await fetch(`/api/datasets/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Erro ao excluir dataset')

      router.refresh()
      await loadData(currentPage)
      showFeedback('Dataset excluído com sucesso!', 'success')
    } catch (error) {
      console.error('Error deleting dataset:', error)
      showFeedback('Erro ao excluir dataset', 'error')
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
                  {editingId ? 'Editar Dataset' : 'Novo Dataset'}
                </h2>
                <p className="text-green-100 text-sm">
                  {editingId ? 'Atualize as informações do dataset' : 'Preencha os dados abaixo para criar um novo dataset'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-600" />
                Tipo de Dados *
              </label>
              <select
                value={formData.dataType}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    dataType: e.target.value,
                    format: e.target.value === 'geoespacial' ? 'Shapefile' : 'CSV',
                    categoryId: '' // Limpar categoria ao mudar tipo
                  })
                }}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              >
                <option value="geoespacial">Dados Geoespaciais</option>
                <option value="alfanumerico">Dados Alfanuméricos</option>
              </select>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                Título *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Digite o título do dataset..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              />
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                Descrição *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={4}
                placeholder="Descreva o dataset..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300 resize-none"
              />
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.25s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-green-600" />
                Categoria *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-600" />
                  Fonte
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="Ex: IBGE"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  Ano
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.35s' }}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-green-600" />
                  Formato *
                </label>
                <select
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
                >
                  {formData.dataType === 'geoespacial' ? (
                    <>
                      <option value="Shapefile">Shapefile</option>
                      <option value="GeoTiff">GeoTiff</option>
                      <option value="Shapefile/Csv">Shapefile/Csv</option>
                    </>
                  ) : (
                    <>
                      <option value="CSV">CSV</option>
                      <option value="Excel">Excel</option>
                      <option value="JSON">JSON</option>
                      <option value="XML">XML</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-600" />
                  Tamanho
                </label>
                <input
                  type="text"
                  value={formData.fileSize}
                  onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                  placeholder="ex: 2.5 MB"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
                />
              </div>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-green-600" />
                Upload de Arquivo {!editingId && <span className="text-red-500">*</span>}
              </label>
              
              {uploadedFile ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{uploadedFile.name}</div>
                      <div className="text-sm text-gray-600">{uploadedFile.size}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFile(null)
                        setFormData({ ...formData, filePath: '', fileSize: '' })
                      }}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-semibold"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept={formData.dataType === 'geoespacial' ? ".zip,.geojson,.json,.tif,.tiff" : undefined}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-upload"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center w-full h-32 md:h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                      uploading
                        ? 'border-green-300 bg-green-50'
                        : dragActive
                        ? 'border-green-500 bg-green-100 scale-105'
                        : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-2" />
                        <span className="text-sm text-gray-600">Fazendo upload...</span>
                      </>
                    ) : (
                      <>
                        <Upload className={`w-8 h-8 md:w-10 md:h-10 mb-2 transition-colors ${dragActive ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-sm md:text-base font-semibold text-gray-700 mb-1 text-center px-4">
                          Clique para fazer upload
                        </span>
                        <span className="text-xs md:text-sm text-gray-500 text-center px-4">
                          ou arraste o arquivo aqui
                        </span>
                        <span className="text-xs text-gray-500 mt-1 text-center px-4">
                          {formData.dataType === 'geoespacial'
                            ? 'Formatos: Shapefile (.zip), GeoTiff (.tif/.tiff), GeoJSON (.geojson/.json) (máx. 100MB)'
                            : 'Aceita qualquer tipo de ficheiro (máx. 100MB)'}
                        </span>
                      </>
                    )}
                  </label>
                </div>
              )}

              {legacyExcelWarning && (
                <div className="mt-3 bg-amber-50 border-2 border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
                  <XCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Ficheiros .xls/.ods antigos não têm pré-visualização no portal (só é suportado .xlsx). O upload
                    e download continuam a funcionar normalmente. Se quiser pré-visualização, guarde o ficheiro
                    como .xlsx antes de o carregar.
                  </span>
                </div>
              )}

              {/* Campo de caminho manual (opcional) */}
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <FileCode className="w-3 h-3 text-gray-500" />
                  Ou informe o caminho manualmente (opcional)
                </label>
                <input
                  type="text"
                  value={formData.filePath}
                  onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                  placeholder="/uploads/dataset.shp"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300 text-sm"
                />
              </div>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.45s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-green-600" />
                Palavras-chave (separadas por vírgula)
              </label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="ex: geografia, mapas, infraestrutura"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              />
            </div>

            {/* Novos campos */}
            <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                Geometria
              </label>
              <input
                type="text"
                value={formData.geometry}
                onChange={(e) => setFormData({ ...formData, geometry: e.target.value })}
                placeholder="Tipo de geometria (pontos, linhas, polígonos, etc.)"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              />
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.55s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-600" />
                Cobertura
              </label>
              <input
                type="text"
                value={formData.coverage}
                onChange={(e) => setFormData({ ...formData, coverage: e.target.value })}
                placeholder="Cobertura geográfica do dataset"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              />
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-green-600" />
                Unidade Mínima (Escala)
              </label>
              <input
                type="text"
                value={formData.minimumUnit}
                onChange={(e) => setFormData({ ...formData, minimumUnit: e.target.value })}
                placeholder="Escala ou resolução espacial"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              />
            </div>

            <div className="flex gap-3 pt-4 animate-fade-in" style={{ animationDelay: '0.65s' }}>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{editingId ? 'Atualizar Dataset' : 'Criar Dataset'}</span>
                  </>
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setUploadedFile(null)
                    setFormData({
                      title: '',
                      description: '',
                      categoryId: '',
                      source: '',
                      year: new Date().getFullYear(),
                      format: 'Shapefile',
                      fileSize: '',
                      filePath: '',
                      geometry: '',
                      coverage: '',
                      minimumUnit: '',
                      keywords: '',
                      dataType: 'geoespacial',
                    })
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

      {/* Lista de Datasets */}
      <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Datasets Existentes</h2>
                <p className="text-green-100 text-sm">{datasets.length} dataset(s) cadastrado(s)</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="p-4 pb-0 flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por título, descrição ou palavras-chave…"
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700"
            >
              Pesquisar
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  loadData(1, '')
                }}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-200"
              >
                Limpar
              </button>
            )}
          </form>

          <div className="p-4 space-y-3 max-h-[700px] overflow-y-auto">
            {datasets.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum dataset cadastrado ainda.</p>
                <p className="text-gray-500 text-sm mt-2">Crie o primeiro dataset usando o formulário ao lado.</p>
              </div>
            ) : (
              <>
                {datasets.map((dataset, index) => (
                  <div
                    key={dataset.id}
                    className="bg-gradient-to-br from-gray-50 to-green-50 p-4 rounded-xl border border-gray-200 hover:border-green-300 transition-all duration-300 hover-lift animate-slide-up group"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            {categories.find(c => c.id === dataset.categoryId)?.name || 'Sem categoria'}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-800 mb-1 group-hover:text-green-600 transition line-clamp-1">
                          {dataset.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {dataset.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {dataset.format}
                          </span>
                          {(dataset as any).year && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {(dataset as any).year}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(dataset)}
                          className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-all duration-300 hover:scale-105 shadow-md"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDelete(dataset.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-all duration-300 hover:scale-105 shadow-md"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                        
                {/* Paginação */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => currentPage > 1 && loadData(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className={`px-4 py-2 rounded-lg ${currentPage <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                  >
                    Anterior
                  </button>
                          
                  <span className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>
                          
                  <button
                    onClick={() => currentPage < totalPages && loadData(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className={`px-4 py-2 rounded-lg ${currentPage >= totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                  >
                    Próxima
                  </button>
                </div>
              </>
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