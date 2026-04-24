'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

export function ConditionalFooter() {
  const pathname = usePathname()
  const [showLegalModal, setShowLegalModal] = useState(false)
  
  // Não mostrar footer no dashboard e admin
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
    return null
  }
  
  return (
    <>
    <footer className="bg-green-600 text-white mt-8 relative overflow-hidden">
      <div className="container mx-auto px-4 py-6 relative z-10">
        {/* Copyright */}
        <div className="border-t border-white/20 pt-8">
          <div className="flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setShowLegalModal(true)}
              className="mb-3 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition"
            >
              Termos, Condicoes e Cookies
            </button>
            <p className="text-white/90 text-sm md:text-base text-center">
              &copy; 2026 Data Portal. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
    {showLegalModal && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Informacao Legal</h3>
          <p className="text-sm text-gray-600 mb-5">
            Consulte os detalhes de uso da plataforma e politica de cookies antes de continuar.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/termos-condicoes"
              onClick={() => setShowLegalModal(false)}
              className="rounded-xl bg-green-600 px-4 py-3 text-center font-semibold text-white hover:bg-green-700 transition"
            >
              Ver Termos e Condicoes
            </Link>
            <Link
              href="/politica-cookies"
              onClick={() => setShowLegalModal(false)}
              className="rounded-xl border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Ver Politica de Cookies
            </Link>
            <button
              type="button"
              onClick={() => setShowLegalModal(false)}
              className="rounded-xl px-4 py-3 text-center font-semibold text-gray-500 hover:text-gray-700 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
