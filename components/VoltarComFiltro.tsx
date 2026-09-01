'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * "Voltar" que preserva os filtros do catálogo: um <Link href="/dados-espaciais"> normal navega
 * sempre para a URL base, sem categoria/pesquisa/formato — quem tinha filtrado por "Agricultura"
 * e abriu um dataset via botão do rato tinha de filtrar tudo outra vez ao voltar. Usar o histórico
 * real do navegador (router.back()) devolve exactamente à página anterior, filtros incluídos; só
 * cai para o link fixo quando não há histórico (ex.: chegou aqui por link directo/partilhado).
 */
export function VoltarComFiltro({
  fallbackHref,
  className,
  children,
}: {
  fallbackHref: string
  className?: string
  children: ReactNode
}) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back()
        } else {
          router.push(fallbackHref)
        }
      }}
      className={className}
    >
      <ArrowLeft className="size-4" aria-hidden />
      {children}
    </button>
  )
}
