// Forçar SSR para evitar erro de static paths
export const dynamic = 'force-dynamic'

import { findDatasetById } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { incrementView } from './actions'
import { ArrowLeft, FileText, Info, Tag, Eye, Download, Calendar, Package, Database, MapPin, Globe, TrendingUp, Share2, CheckCircle, Grid3X3, Layers, HardDrive, Ruler } from 'lucide-react'

async function getDataset(id: number) {
  return await findDatasetById(id)
}

export default async function DatasetPage({
  params,
}: {
  params: { id: string }
}) {
  const id = parseInt(params.id)
  const dataset = await getDataset(id)

  if (!dataset) {
    notFound()
  }

  // Registrar visualização
  await incrementView(id)

  const isAlfanumerico = dataset.dataType === 'alfanumerico'
  const backHref = isAlfanumerico ? '/dados-alfanumericos' : '/dados-espaciais'
  const backLabel = isAlfanumerico ? 'Voltar aos Dados Alfanuméricos' : 'Voltar aos Dados Geoespaciais'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-green-50 font-sans selection:bg-green-100 selection:text-green-900 pt-24 pb-12">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href={backHref}
            className="group inline-flex items-center gap-2 text-green-700 hover:text-green-900 font-medium transition-all duration-200 relative z-20"
            prefetch={false}
            scroll={false}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:from-green-600 group-hover:to-green-700 shadow-lg transition-all duration-300">
              <ArrowLeft className="w-4 h-4 text-white transition-transform group-hover:-translate-x-0.5" />
            </div>
            <span className="text-sm font-semibold">{backLabel}</span>
          </Link>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-slide-up">
          
          {/* Hero Header */}
          <div className="relative bg-gradient-to-r from-green-600 to-green-700 p-8 md:p-12 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-900/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

            <div className="relative z-10 max-w-4xl">
              <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-in">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider shadow-sm">
                  <Database className="w-3.5 h-3.5" />
                  {dataset.category.name}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-800/30 backdrop-blur-md border border-white/10 text-red-50 text-xs font-bold uppercase tracking-wider shadow-sm">
                  {dataset.format}
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight shadow-black/5 drop-shadow-sm animate-fade-in" style={{ animationDelay: '0.1s' }}>
                {dataset.title}
              </h1>
              
              <div className="flex items-center gap-6 text-green-50 text-sm font-medium animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 opacity-80" />
                  <span>{dataset.source || 'Fonte não informada'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 opacity-80" />
                  <span>{dataset.year}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-8 md:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-10">
                
                {/* Description Section */}
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Descrição</h2>
                  </div>
                  <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    {dataset.description}
                  </div>
                </section>

                {/* Action Buttons - mais abaixo */}
                <div className="flex flex-col sm:flex-row gap-4 mt-16">
                  {dataset.filePath ? (
                    <a
                      href={`/api/download/${dataset.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-green-200 hover:shadow-green-300"
                    >
                      <Download className="w-5 h-5" />
                      Baixar Dados
                    </a>
                  ) : (
                    <button disabled className="flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 bg-slate-100 text-slate-400 rounded-xl font-bold text-lg cursor-not-allowed border border-slate-200">
                      <Download className="w-5 h-5" />
                      Indisponível
                    </button>
                  )}
                  <button className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200 shadow-sm">
                    <Share2 className="w-5 h-5" />
                    Compartilhar
                  </button>
                </div>

                {/* Stats Card */}
                <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-200" />
                    Estatísticas de Uso
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                      <div className="text-2xl font-bold mb-1">{dataset.views + 1}</div>
                      <div className="text-xs text-green-100 font-medium uppercase tracking-wide">Visualizações</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                      <div className="text-2xl font-bold mb-1">{dataset.downloads}</div>
                      <div className="text-xs text-green-100 font-medium uppercase tracking-wide">Downloads</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Technical Information */}
              <div className="space-y-8">
                
                {/* Technical Info Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
                      <Grid3X3 className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Informações Técnicas</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-3">
                      <InfoRow icon={<Database className="w-4 h-4 text-green-600" />} label="Categoria" value={dataset.category.name} />
                      <InfoRow icon={<Calendar className="w-4 h-4 text-green-600" />} label="Ano de Referência" value={dataset.year.toString()} />
                      <InfoRow icon={<Globe className="w-4 h-4 text-green-600" />} label="Geometria" value={dataset.geometry || 'N/A'} />
                      <InfoRow icon={<Ruler className="w-4 h-4 text-green-600" />} label="Unidade Mínima (Escala)" value={dataset.minimumUnit || 'N/A'} />
                    </div>
                    <div className="space-y-3">
                      <InfoRow icon={<Database className="w-4 h-4 text-green-600" />} label="Fonte" value={dataset.source || 'N/A'} />
                      <InfoRow icon={<Layers className="w-4 h-4 text-green-600" />} label="Formato" value={dataset.format} />
                      <InfoRow icon={<Globe className="w-4 h-4 text-green-600" />} label="Cobertura" value={dataset.coverage || 'N/A'} />
                      <InfoRow icon={<HardDrive className="w-4 h-4 text-green-600" />} label="Tamanho" value={dataset.fileSize || 'Desconhecido'} />
                    </div>
                  </div>

                  {dataset.keywords && (
                    <div className="mt-6 pt-5 border-t border-slate-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                          <Tag className="w-4 h-4" />
                        </div>
                        <h4 className="font-semibold text-slate-700">Palavras-chave</h4>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {dataset.keywords.split(',').map((keyword: string, index: number) => (
                          <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-green-100 hover:text-green-700 transition-all duration-200 cursor-default shadow-sm">
                            {keyword.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100 hover:border-green-200">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-sm font-medium text-slate-700 break-words">{value}</p>
      </div>
    </div>
  )
}