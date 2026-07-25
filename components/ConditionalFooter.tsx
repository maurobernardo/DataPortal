'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { Headset, Mail, Phone } from 'lucide-react'

export function ConditionalFooter() {
  const pathname = usePathname()
  const [showLegalModal, setShowLegalModal] = useState(false)
  
  // Não mostrar footer no painel admin nem no dashboard interno (/dashboard)
  const isAdminDashboard =
    pathname?.startsWith('/admin') ||
    pathname === '/dashboard' ||
    (pathname?.startsWith('/dashboard/') && !pathname?.startsWith('/dashboards-'))
  const isMapViewer = pathname?.startsWith('/maps/') && pathname !== '/maps'
  if (isAdminDashboard || isMapViewer) {
    return null
  }
  
  return (
    <>
    <footer className="bg-[#064E2C] text-white mt-0 relative overflow-hidden border-t border-[#053D23]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-10 lg:gap-14 mb-6">
          <div className="md:max-w-xs">
            <p className="text-xs uppercase tracking-wide text-[#CFE3D6] mb-3 font-semibold">Suporte</p>
            <div className="flex flex-col gap-2 text-sm">
              <a href="mailto:portaldedados@data4moz.com" className="inline-flex items-center gap-2 underline-offset-2 hover:underline hover:text-[#E7F3EB] transition text-white/95">
                <Mail className="w-4 h-4 shrink-0 opacity-90" />
                portaldedados@data4moz.com
              </a>
              <a href="tel:+17604504448" className="inline-flex items-center gap-2 underline-offset-2 hover:underline hover:text-[#E7F3EB] transition text-white/95">
                <Phone className="w-4 h-4 shrink-0 opacity-90" />
                +1 760 450 4448
              </a>
              <a href="tel:+258828863737" className="inline-flex items-center gap-2 underline-offset-2 hover:underline hover:text-[#E7F3EB] transition text-white/95">
                <Phone className="w-4 h-4 shrink-0 opacity-90" />
                +258 82 886 3737
              </a>
            </div>
          </div>

          <div className="md:text-center">
            <p className="text-xs uppercase tracking-wide text-[#CFE3D6] mb-3 font-semibold">Links rápidos</p>
            <nav className="flex flex-col gap-2 text-sm md:items-center">
              <Link href="/dados-espaciais" className="underline-offset-2 hover:underline hover:text-[#E7F3EB] transition w-fit md:mx-auto text-white/95">Geoespaciais</Link>
              <Link href="/dados-alfanumericos" className="underline-offset-2 hover:underline hover:text-[#E7F3EB] transition w-fit md:mx-auto text-white/95">Alfanuméricos</Link>
              <Link href="/dashboards-alfanumericos" className="underline-offset-2 hover:underline hover:text-[#E7F3EB] transition w-fit md:mx-auto text-white/95">Dashboard</Link>
              <Link href="/maps" className="underline-offset-2 hover:underline hover:text-[#E7F3EB] transition w-fit md:mx-auto text-white/95">Mapas inteligentes</Link>
            </nav>
          </div>

          <div className="md:text-right">
            <p className="text-xs uppercase tracking-wide text-[#CFE3D6] mb-3 font-semibold">Legal</p>
            <nav className="flex flex-col gap-2 text-sm md:items-end">
              <Link href="/termos-condicoes" className="underline-offset-2 hover:underline hover:text-[#E7F3EB] transition w-fit md:ml-auto text-white/95">Termos e Condições</Link>
              <Link href="/politica-cookies" className="underline-offset-2 hover:underline hover:text-[#E7F3EB] transition w-fit md:ml-auto text-white/95">Política de Cookies</Link>
              <button
                type="button"
                onClick={() => setShowLegalModal(true)}
                className="inline-flex items-center gap-2 text-left underline-offset-2 hover:underline hover:text-[#E7F3EB] transition w-fit md:ml-auto text-white/95"
              >
                <Headset className="w-4 h-4 shrink-0 opacity-90" />
                Resumo legal
              </button>
            </nav>
          </div>
        </div>

        <div className="border-t border-white/15 pt-5">
          <p className="text-white/90 text-sm md:text-base text-center">
            &copy; 2026 Data Portal. Todos os direitos reservados.
          </p>
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
              className="rounded-xl bg-[#064E2C] px-4 py-3 text-center font-semibold text-white ring-1 ring-white/20 hover:bg-[#04361F] transition"
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
