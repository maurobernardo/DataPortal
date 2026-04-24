'use client'

import Link from 'next/link'
import { Building2, Construction, Leaf, Droplets, TrendingUp, Folder } from 'lucide-react'

interface Category {
  id: number
  name: string
  description: string | null
}

interface CategoriesSectionProps {
  categories: Category[]
}

const categoryIcons: Record<string, typeof Building2> = {
  'Administrativo': Building2,
  'Infraestrutura': Construction,
  'Meio Ambiente': Leaf,
  'Hidrografia': Droplets,
  'Estatística': TrendingUp,
}

export function CategoriesSection({ categories }: CategoriesSectionProps) {
  return (
    <section className="py-20 px-4 bg-white/50">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-gray-800">
          Categorias
        </h2>
        <p className="text-center text-gray-600 mb-12 text-lg">
          Explore dados organizados por categoria
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => {
            const IconComponent = categoryIcons[category.name] || Folder
            return (
              <Link
                key={category.id}
                href={`/catalogo?category=${category.id}`}
                className="bg-white rounded-xl p-6 shadow-lg hover-lift transition-all duration-300 border border-gray-100 hover:border-blue-300 animate-slide-up group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl mb-4 group-hover:from-blue-200 group-hover:to-indigo-200 transition">
                  <IconComponent className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-gray-600 text-sm">
                    {category.description}
                  </p>
                )}
                <div className="mt-4 text-blue-600 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                  <span>Explorar</span>
                  <span>→</span>
                </div>
              </Link>
            )
          })}
        </div>
        <div className="text-center mt-12">
          <Link
            href="/dados-espaciais"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            <span>Ver Todas as Categorias</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
