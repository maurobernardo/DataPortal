'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Save, X, Edit, Trash2, Loader2, Plus, CheckCircle2, XCircle, Upload, ExternalLink, ScanSearch, ScaleIcon, Globe2, User, Users } from 'lucide-react'
import { PainelVerificacao } from './reports/PainelVerificacao'

interface Report {
  id: number
  title: string
  year: string
  coverage: string
  author: string | null
  partners: string | null
  filePath: string | null
  fileSize: string | null
  detailsText: string | null
  sector: string | null
}

export function ReportForm() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [formData, setFormData] = useState({
    title: '',
    year: String(new Date().getFullYear()),
    coverage: '',
    author: '',
    partners: '',
    detailsText: '',
    sector: '',
  })
  const [yearMode, setYearMode] = useState<'single' | 'range'>('single')
  const [periodStart, setPeriodStart] = useState<string>(String(new Date().getFullYear()))
  const [periodEnd, setPeriodEnd] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  // O ficheiro do relatório: nenhum dos existentes tinha um, porque .pdf nunca esteve na lista de
  // extensões aceites por /api/upload (corrigido). Fica à parte de `formData` porque só se altera
  // ao carregar um ficheiro novo, nunca ao escrever nos outros campos.
  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<string | null>(null)
  const [aCarregarFicheiro, setACarregarFicheiro] = useState(false)
  const [erroFicheiro, setErroFicheiro] = useState<string | null>(null)
  const [aProcessar, setAProcessar] = useState<number | null>(null)
  const [verificacaoAbertaId, setVerificacaoAbertaId] = useState<number | null>(null)

  function showFeedback(message: string, type: 'success' | 'error') {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
    
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    try {
      const response = await fetch('/api/reports')
      const data = await response.json()
      setReports(data)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const url = editingId
        ? `/api/reports/${editingId}`
        : '/api/reports'
      const method = editingId ? 'PUT' : 'POST'

      const payload = {
        ...formData,
        year:
          yearMode === 'single'
            ? formData.year.trim()
            : `${periodStart.trim()}-${periodEnd.trim()}`,
        filePath,
        fileSize,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const corpo = await response.json().catch(() => null)
        throw new Error(corpo?.error || 'Erro ao salvar relatório')
      }

      router.refresh()
      loadReports()
      showFeedback('Relatório salvo com sucesso!', 'success')
      setFormData({
        title: '',
        year: String(new Date().getFullYear()),
        coverage: '',
        author: '',
        partners: '',
        detailsText: '',
        sector: '',
      })
      setYearMode('single')
      setPeriodStart(String(new Date().getFullYear()))
      setPeriodEnd('')
      setEditingId(null)
      setFilePath(null)
      setFileSize(null)
    } catch (error: any) {
      console.error('Error saving report:', error)
      showFeedback(error?.message || 'Erro ao salvar relatório', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(report: Report) {
    const yearValue = String(report.year || '')
    if (yearValue.includes('-')) {
      const [start, end] = yearValue.split('-').map(part => part.trim())
      setYearMode('range')
      setPeriodStart(start || '')
      setPeriodEnd(end || '')
    } else {
      setYearMode('single')
      setFormData(prev => ({ ...prev, year: yearValue || String(new Date().getFullYear()) }))
      setPeriodStart(yearValue || String(new Date().getFullYear()))
      setPeriodEnd('')
    }

    setFormData({
      title: report.title,
      year: yearValue || String(new Date().getFullYear()),
      coverage: report.coverage,
      author: report.author || '',
      partners: report.partners || '',
      detailsText: report.detailsText || '',
      sector: report.sector || '',
    })
    setEditingId(report.id)
    setFilePath(report.filePath || null)
    setFileSize(report.fileSize || null)
    setErroFicheiro(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleUploadFicheiro(ficheiro: File) {
    setACarregarFicheiro(true)
    setErroFicheiro(null)
    try {
      const dados = new FormData()
      dados.append('file', ficheiro)
      const response = await fetch('/api/upload', { method: 'POST', body: dados })
      const d = await response.json()
      if (!response.ok) throw new Error(d?.error || 'Falha ao carregar o ficheiro')
      setFilePath(d.filePath)
      setFileSize(d.fileSize)
    } catch (error: any) {
      setErroFicheiro(error?.message || 'Falha ao carregar o ficheiro')
    } finally {
      setACarregarFicheiro(false)
    }
  }

  /**
   * Lê o PDF e gera a leitura estruturada (resumo, achados, recomendações, cada um com a página).
   * Só aparece para um relatório já guardado com ficheiro: processar é uma chamada real ao
   * modelo, por isso corre a pedido explícito, nunca automaticamente ao guardar o registo.
   */
  async function handleProcessar(id: number) {
    setAProcessar(id)
    try {
      const response = await fetch(`/api/admin/reports/${id}/processar`, { method: 'POST' })
      const d = await response.json()
      if (!response.ok) throw new Error(d?.erro || 'Falha ao processar')
      showFeedback(
        d.estado === 'digitalizado'
          ? 'Este PDF parece ser uma digitalização sem texto legível.'
          : `Processado: ${d.totalPaginas ?? '?'} páginas lidas.`,
        d.estado === 'pronto' ? 'success' : 'error'
      )
    } catch (error: any) {
      showFeedback(error?.message || 'Falha ao processar o relatório', 'error')
    } finally {
      setAProcessar(null)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este relatório?')) return

    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Erro ao excluir relatório')

      router.refresh()
      loadReports()
      showFeedback('Relatório excluído com sucesso!', 'success')
    } catch (error) {
      console.error('Error deleting report:', error)
      showFeedback('Erro ao excluir relatório', 'error')
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
                  {editingId ? 'Editar Relatório' : 'Novo Relatório'}
                </h2>
                <p className="text-green-100 text-sm">
                  {editingId ? 'Atualize as informações do relatório' : 'Preencha os dados abaixo para criar um novo relatório'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                Estudo (título) *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Digite o título do estudo..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  Ano / Período *
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setYearMode('single')
                      setFormData(prev => ({
                        ...prev,
                        year: periodStart || String(new Date().getFullYear()),
                      }))
                    }}
                    className={`flex-1 px-3 py-1 rounded-lg text-xs font-semibold border ${
                      yearMode === 'single'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    Ano único
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setYearMode('range')
                      if (!periodStart) {
                        const current = String(new Date().getFullYear())
                        setPeriodStart(current)
                      }
                    }}
                    className={`flex-1 px-3 py-1 rounded-lg text-xs font-semibold border ${
                      yearMode === 'range'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    Período
                  </button>
                </div>
                {yearMode === 'single' ? (
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Início (ex: 2024)"
                      value={periodStart}
                      onChange={(e) => {
                        const value = e.target.value
                        setPeriodStart(value)
                        setFormData(prev => ({
                          ...prev,
                          year: value && periodEnd ? `${value}-${periodEnd}` : prev.year,
                        }))
                      }}
                      required
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Fim (ex: 2026)"
                      value={periodEnd}
                      onChange={(e) => {
                        const value = e.target.value
                        setPeriodEnd(value)
                        setFormData(prev => ({
                          ...prev,
                          year: periodStart && value ? `${periodStart}-${value}` : prev.year,
                        }))
                      }}
                      required
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300 text-xs"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  Autor
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Ex: Nome do autor"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
                />
              </div>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                Cobertura *
              </label>
              <input
                type="text"
                value={formData.coverage}
                onChange={(e) => setFormData({ ...formData, coverage: e.target.value })}
                required
                placeholder="Ex: Nacional, Regional, Municipal"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              />
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.45s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                Sector
              </label>
              <input
                type="text"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                placeholder="Ex: Saúde, Agricultura, Educação"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              />
              <p className="text-xs text-gray-400 mt-1">Usado para filtrar relatórios por sector em /relatorios.</p>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                Parceiro(s)
              </label>
              <input
                type="text"
                value={formData.partners}
                onChange={(e) => setFormData({ ...formData, partners: e.target.value })}
                placeholder="Ex: Organização A, Organização B"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              />
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.55s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                Detalhes do Relatório
              </label>
              <textarea
                value={formData.detailsText}
                onChange={(e) => setFormData({ ...formData, detailsText: e.target.value })}
                placeholder="Descreva o conteúdo, metodologia, principais achados e contexto do relatório..."
                rows={5}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 bg-white hover:border-gray-300"
              />
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.58s' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-green-600" />
                Ficheiro do relatório (PDF)
              </label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-green-300 transition-colors">
                <label className="flex items-center gap-2 text-sm font-semibold text-green-700 cursor-pointer w-fit">
                  {aCarregarFicheiro ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {aCarregarFicheiro ? 'A carregar...' : filePath ? 'Substituir ficheiro' : 'Carregar PDF'}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={aCarregarFicheiro}
                    onChange={(e) => e.target.files?.[0] && handleUploadFicheiro(e.target.files[0])}
                  />
                </label>
                {filePath && (
                  <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    {filePath.split('/').pop()} {fileSize ? `(${fileSize})` : ''}
                  </p>
                )}
                {erroFicheiro && <p className="mt-2 text-xs text-red-600">{erroFicheiro}</p>}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Com um ficheiro carregado, o botão "Processar" na lista ao lado lê o PDF e gera um resumo estruturado com achados e recomendações.
              </p>
            </div>

            <div className="flex gap-3 pt-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
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
                    <span>{editingId ? 'Atualizar Relatório' : 'Criar Relatório'}</span>
                  </>
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({
                      title: '',
                      year: String(new Date().getFullYear()),
                      coverage: '',
                      author: '',
                      partners: '',
                      detailsText: '',
                      sector: '',
                    })
                    setYearMode('single')
                    setPeriodStart(String(new Date().getFullYear()))
                    setPeriodEnd('')
                    setFilePath(null)
                    setFileSize(null)
                    setErroFicheiro(null)
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

      {/* Lista de Relatórios */}
      <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Relatórios Existentes</h2>
                <p className="text-green-100 text-sm">{reports.length} relatório(s) cadastrado(s)</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[700px] overflow-y-auto">
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum relatório cadastrado ainda.</p>
                <p className="text-gray-500 text-sm mt-2">Crie o primeiro relatório usando o formulário ao lado.</p>
              </div>
            ) : (
              reports.map((report, index) => (
                <div
                  key={report.id}
                  className="bg-gradient-to-br from-gray-50 to-green-50 p-4 rounded-xl border border-gray-200 hover:border-green-300 transition-all duration-300 hover-lift animate-slide-up group"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                      {report.year}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1 group-hover:text-green-600 transition line-clamp-1">
                    {report.title}
                  </h3>
                  {report.detailsText && (
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                      {report.detailsText}
                    </p>
                  )}
                  {/* Uma linha só, cada dado com o seu próprio ícone (não o mesmo repetido três
                      vezes): cobertura, autor e parceiros ficam lado a lado, e só quebram para uma
                      segunda linha se o espaço realmente não chegar, em vez de empilhar sempre. */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Globe2 className="w-3 h-3 shrink-0" />
                      {report.coverage}
                    </span>
                    {report.author && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 shrink-0" />
                        {report.author}
                      </span>
                    )}
                    {report.partners && (
                      <span className="flex items-center gap-1 min-w-0">
                        <Users className="w-3 h-3 shrink-0" />
                        <span className="truncate">{report.partners}</span>
                      </span>
                    )}
                  </div>
                  {/* Faixa própria, com toda a largura do cartão: espremidas ao lado do título (como
                      estava antes) as 5 acções quebravam para uma segunda linha desalinhada em
                      qualquer coluna que não fosse muito larga. */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200/70">
                    {report.filePath && (
                      <>
                        <a
                          href={report.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-2 bg-white text-green-700 border border-green-200 text-sm rounded-lg hover:bg-green-50 transition-all duration-300 shadow-sm"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Abrir</span>
                        </a>
                        <button
                          onClick={() => handleProcessar(report.id)}
                          disabled={aProcessar === report.id}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-all duration-300 hover:scale-105 shadow-md disabled:opacity-60 disabled:hover:scale-100"
                        >
                          {aProcessar === report.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ScanSearch className="w-3 h-3" />
                          )}
                          <span>{aProcessar === report.id ? 'A processar...' : 'Processar'}</span>
                        </button>
                        <button
                          onClick={() => setVerificacaoAbertaId((prev) => (prev === report.id ? null : report.id))}
                          className="flex items-center gap-1 px-3 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-all duration-300 hover:scale-105 shadow-md"
                        >
                          <ScaleIcon className="w-3 h-3" />
                          <span>Verificar</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleEdit(report)}
                      className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-all duration-300 hover:scale-105 shadow-md"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-all duration-300 hover:scale-105 shadow-md ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Excluir</span>
                    </button>
                  </div>
                  {verificacaoAbertaId === report.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <PainelVerificacao reportId={report.id} />
                    </div>
                  )}
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



