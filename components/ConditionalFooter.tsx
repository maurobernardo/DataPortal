'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Headset, Linkedin, Mail, MessageCircle, Phone } from 'lucide-react'

const EXPLORAR = [
  { href: '/dados-espaciais', label: 'Dados Geoespaciais' },
  { href: '/dados-alfanumericos', label: 'Dados Alfanuméricos' },
  { href: '/maps', label: 'Mapas Inteligentes' },
  { href: '/relatorios', label: 'Relatórios' },
  { href: '/ai-insights', label: 'AI Insights' },
]

const PORTAL = [
  { href: '/servicos', label: 'Serviços' },
  { href: '/#sobre', label: 'Sobre o portal' },
  { href: '/#faq', label: 'Perguntas frequentes' },
  { href: '/analise/nova', label: 'Análise por IA' },
  { href: '/novidades', label: 'Novidades' },
  { href: '/estatisticas', label: 'Estatísticas' },
  { href: '/parceiros', label: 'Parceiros' },
]

export function ConditionalFooter() {
  const pathname = usePathname()
  const [showLegalModal, setShowLegalModal] = useState(false)

  // Não mostrar footer no painel admin nem no dashboard interno (/dashboard)
  const isAdminDashboard =
    pathname?.startsWith('/admin') ||
    pathname === '/dashboard' ||
    (pathname?.startsWith('/dashboard/') && !pathname?.startsWith('/dashboards-'))
  const isMapViewer = pathname?.startsWith('/maps/') && pathname !== '/maps'
  const isEmbed = pathname?.startsWith('/embed/')
  if (isAdminDashboard || isMapViewer || isEmbed) {
    return null
  }

  return (
    <>
      <footer className="relative overflow-hidden border-t border-[#053D23] bg-[#04361F] text-white">
        {/* Faixa de assinatura: os três tons de acento usados no resto do portal (verde/âmbar/violeta),
            a mesma paleta do servicos.css e das miniaturas por categoria — não decoração aleatória. */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#064E2C] via-[#D4A017] to-[#6B4FBB]" />

        {/* Padrão de contorno topográfico muito subtil, ecoando as miniaturas CategoryThumb usadas
            em todo o catálogo — a mesma linguagem visual, não um enfeite novo inventado só aqui. */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]"
          viewBox="0 0 1200 400"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <g stroke="white" strokeWidth="1.2" fill="none">
            <path d="M-40,320 Q220,220 460,300 T940,270 T1300,300" />
            <path d="M-40,220 Q260,120 520,200 T980,160 T1300,190" />
            <path d="M-40,120 Q220,40 480,100 T960,70 T1300,100" />
          </g>
        </svg>

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.3fr_1fr_1fr_1.1fr] lg:gap-8">
            {/* Identidade + missão + contactos primários */}
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
                <Image src="/images/logo.png" alt="Portal de Dados" width={34} height={34} className="rounded-md" />
                <span className="text-[15px] font-bold tracking-tight text-white">Portal de Dados</span>
              </Link>
              <p className="text-[13px] leading-relaxed text-[#CFE3D6] max-w-xs mb-5">
                Plataforma aberta da Data4Moz para dados, indicadores e inteligência territorial ao
                serviço de Moçambique.
              </p>
              <div className="flex flex-col gap-2 text-[13.5px]">
                <a
                  href="mailto:portaldedados@data4moz.com"
                  className="inline-flex items-center gap-2 text-white/90 hover:text-white underline-offset-4 hover:underline transition-colors w-fit"
                >
                  <Mail className="size-4 shrink-0 text-[#8FD9AE]" aria-hidden />
                  portaldedados@data4moz.com
                </a>
                <a
                  href="tel:+258828863737"
                  className="inline-flex items-center gap-2 text-white/90 hover:text-white underline-offset-4 hover:underline transition-colors w-fit"
                >
                  <Phone className="size-4 shrink-0 text-[#8FD9AE]" aria-hidden />
                  +258 82 886 3737
                </a>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#8FD9AE] mb-4">Explorar</p>
              <nav className="flex flex-col gap-2.5 text-[13.5px]">
                {EXPLORAR.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="text-white/85 hover:text-white underline-offset-4 hover:underline transition-colors w-fit"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#8FD9AE] mb-4">Portal</p>
              <nav className="flex flex-col gap-2.5 text-[13.5px]">
                {PORTAL.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="text-white/85 hover:text-white underline-offset-4 hover:underline transition-colors w-fit"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#8FD9AE] mb-4">Legal e suporte</p>
              <nav className="flex flex-col gap-2.5 text-[13.5px] mb-5">
                <Link href="/termos-condicoes" className="text-white/85 hover:text-white underline-offset-4 hover:underline transition-colors w-fit">
                  Termos e condições
                </Link>
                <Link href="/politica-privacidade" className="text-white/85 hover:text-white underline-offset-4 hover:underline transition-colors w-fit">
                  Política de privacidade
                </Link>
                <Link href="/politica-cookies" className="text-white/85 hover:text-white underline-offset-4 hover:underline transition-colors w-fit">
                  Política de cookies
                </Link>
                <Link href="/abordagem-etica" className="text-white/85 hover:text-white underline-offset-4 hover:underline transition-colors w-fit">
                  Abordagem ética de dados
                </Link>
                <button
                  type="button"
                  onClick={() => setShowLegalModal(true)}
                  className="inline-flex items-center gap-2 text-left text-white/85 hover:text-white underline-offset-4 hover:underline transition-colors w-fit"
                >
                  <Headset className="size-4 shrink-0 text-[#8FD9AE]" aria-hidden />
                  Resumo legal
                </button>
              </nav>

              <div className="flex items-center gap-2">
                <a
                  href="https://www.linkedin.com/company/data4moz/posts/?feedView=all"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Data4Moz no LinkedIn"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/85 backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/20 hover:text-white"
                >
                  <Linkedin className="size-4" aria-hidden />
                </a>
                <a
                  href="mailto:portaldedados@data4moz.com"
                  aria-label="Enviar email"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/85 backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/20 hover:text-white"
                >
                  <MessageCircle className="size-4" aria-hidden />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col-reverse items-center gap-3 border-t border-white/12 pt-6 sm:flex-row sm:justify-between">
            <p className="text-[12.5px] text-white/60">
              &copy; 2026 Data Portal · Data4Moz. Todos os direitos reservados.
            </p>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/50">
              <span className="size-1.5 rounded-full bg-[#8FD9AE]" aria-hidden />
              Dados abertos de Moçambique
            </p>
          </div>
        </div>
      </footer>

      {showLegalModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Informação legal</h3>
            <p className="text-sm text-gray-600 mb-5">
              Consulte os detalhes de uso da plataforma e política de cookies antes de continuar.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/termos-condicoes"
                onClick={() => setShowLegalModal(false)}
                className="rounded-xl bg-[#064E2C] px-4 py-3 text-center font-semibold text-white ring-1 ring-white/20 hover:bg-[#04361F] transition"
              >
                Ver termos e condições
              </Link>
              <Link
                href="/politica-privacidade"
                onClick={() => setShowLegalModal(false)}
                className="rounded-xl border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Ver política de privacidade
              </Link>
              <Link
                href="/politica-cookies"
                onClick={() => setShowLegalModal(false)}
                className="rounded-xl border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Ver política de cookies
              </Link>
              <Link
                href="/abordagem-etica"
                onClick={() => setShowLegalModal(false)}
                className="rounded-xl border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Ver abordagem ética de dados
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
