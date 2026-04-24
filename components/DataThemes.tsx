'use client'

import Link from 'next/link'
import { 
  Tractor, 
  Shield, 
  Leaf, 
  FileText, 
  Cloud, 
  Globe, 
  Mountain, 
  Waves, 
  Building,
  FolderTree,
  ArrowRight
} from 'lucide-react'

interface Category {
  id: number
  name: string
  _count: {
    datasets: number
  }
}

interface DataThemesProps {
  categories: Category[]
}

// Mapeamento de ícones para categorias
const categoryIcons: { [key: string]: any } = {
  'Agropecuária': Tractor,
  'Áreas Protegidas': Shield,
  'Biodiversidade': Leaf,
  'Cartas': FileText,
  'Clima': Cloud,
  'Geologia': Globe,
  'Geomorfologia': Mountain,
  'Hidrografia': Waves,
  'Históricos': Building,
}

export function DataThemes({ categories }: DataThemesProps) {
  // Categorias mais comuns baseadas na imagem
  const commonThemes = [
    'Agropecuária',
    'Áreas Protegidas',
    'Biodiversidade',
    'Cartas',
    'Clima',
    'Geologia',
    'Geomorfologia',
    'Hidrografia',
    'Históricos',
  ]

  // Combinar categorias do banco com temas comuns
  const allThemes = [
    ...commonThemes.map(name => ({
      name,
      id: categories.find(c => c.name.toLowerCase() === name.toLowerCase())?.id || 0,
      count: categories.find(c => c.name.toLowerCase() === name.toLowerCase())?._count.datasets || 0,
      icon: categoryIcons[name] || FolderTree,
    })),
    ...categories
      .filter(cat => !commonThemes.some(theme => theme.toLowerCase() === cat.name.toLowerCase()))
      .map(cat => ({
        name: cat.name,
        id: cat.id,
        count: cat._count.datasets,
        icon: FolderTree,
      })),
  ]

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
      {/* Header com Gradiente */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <FolderTree className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            Dados por Tema
          </h2>
        </div>
          <p className="text-sm text-green-100 ml-[52px]">
          Explore por categoria
        </p>
      </div>
      
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
          {allThemes.map((theme, index) => {
            const IconComponent = theme.icon
            return (
              <Link
                key={theme.name}
                href={theme.id ? `/dados-espaciais?category=${theme.id}` : '/dados-espaciais'}
                className="group flex items-center justify-between gap-3 p-4 md:p-5 bg-gradient-to-br from-white to-green-50/50 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:from-green-50 hover:to-green-100 transition-all duration-300 hover-lift animate-fade-in relative overflow-hidden shadow-sm hover:shadow-md"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 to-green-500/0 group-hover:from-green-500/5 group-hover:to-green-500/5 transition-all duration-300"></div>
                
                <div className="relative z-10 flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform flex-shrink-0 shadow-lg border-2 border-green-400/50">
                    <IconComponent className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-lg md:text-xl lg:text-2xl text-gray-900 group-hover:text-green-600 transition mb-1.5 line-clamp-1 leading-tight">
                      {theme.name}
                    </div>
                    {theme.count > 0 && (
                      <div className="text-xs md:text-sm text-gray-600 font-semibold">
                        <span className="text-green-600 font-bold">{theme.count}</span> dataset{theme.count !== 1 ? 's' : ''} disponível{theme.count !== 1 ? 'eis' : ''}
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative z-10 flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
