'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ShieldCheck, FileText, Lock, Cookie, ChevronRight, ChevronDown, Check, X, Clock } from 'lucide-react'

const CONSENT_KEY = 'dataPortalTermsConsent'
const CONSENT_REMIND_AT_KEY = 'dataPortalTermsRemindAt'

const DOCUMENTOS = [
  { href: '/termos-condicoes', label: 'Termos e condições', icon: FileText },
  { href: '/politica-privacidade', label: 'Política de privacidade', icon: Lock },
  { href: '/politica-cookies', label: 'Política de cookies', icon: Cookie },
] as const

export function TermsConsentModal() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const hiddenRoutes = ['/admin', '/dashboard', '/login', '/registo', '/verificar-email', '/verificar-2fa', '/admin/login', '/termos-condicoes', '/politica-cookies', '/politica-privacidade', '/embed']
    if (hiddenRoutes.some((r) => pathname.startsWith(r))) { setIsOpen(false); return }

    const consent = window.localStorage.getItem(CONSENT_KEY)
    const remindAt = window.localStorage.getItem(CONSENT_REMIND_AT_KEY)
    if (remindAt && Number(remindAt) > Date.now()) { setIsOpen(false); return }
    if (consent !== 'accepted') setIsOpen(true)
  }, [pathname])

  function handleAccept() {
    if (!agreed) return
    window.localStorage.setItem(CONSENT_KEY, 'accepted')
    setIsOpen(false)
  }

  function handleReject() {
    window.localStorage.setItem(CONSENT_KEY, 'rejected')
    setIsOpen(false)
    window.location.href = '/termos-condicoes'
  }

  function handleRemindLater() {
    window.localStorage.setItem(CONSENT_REMIND_AT_KEY, String(Date.now() + 24 * 60 * 60 * 1000))
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 md:p-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto w-full max-w-2xl rounded-2xl bg-white border border-[#E2E8E5] shadow-2xl shadow-black/10 overflow-hidden animate-slide-up">

        {/* Faixa de destaque com a cor institucional, não um gradiente decorativo genérico */}
        <div className="h-[3px] bg-[#064E2C]" />

        <div className="p-5 md:p-6">

          {/* Header row */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#F1F8F4] border border-[#CFE3D6] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#064E2C]" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-gray-900 leading-tight">
                A sua privacidade nesta plataforma
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                A Data4Moz explica como trata os seus dados nos três documentos abaixo.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#E2E8E5] mb-5" />

          {/* Doc links */}
          <div className="flex flex-wrap gap-2 mb-5">
            {DOCUMENTOS.map((doc) => (
              <Link
                key={doc.href}
                href={doc.href}
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8E5] bg-[#FAFBFA] text-[12px] font-semibold text-gray-700 hover:border-[#CFE3D6] hover:bg-[#F1F8F4] hover:text-[#064E2C] transition-colors"
              >
                <doc.icon className="w-3.5 h-3.5 text-[#064E2C]" />
                {doc.label}
              </Link>
            ))}
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#064E2C] focus:ring-[#064E2C] focus:ring-offset-0 cursor-pointer shrink-0"
            />
            <span className="text-[13px] text-gray-600 leading-relaxed">
              Li e concordo com os{' '}
              <span className="text-gray-900 font-semibold">Termos e Condições</span>
              {', a '}
              <span className="text-gray-900 font-semibold">Política de Privacidade</span>
              {' '}e a{' '}
              <span className="text-gray-900 font-semibold">Política de Cookies</span>{' '}
              do Data Portal.
            </span>
          </label>

          {/* Details toggle */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowDetails((p) => !p)}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#064E2C] hover:text-[#04361F] transition-colors"
            >
              {showDetails
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronRight className="w-3.5 h-3.5" />
              }
              {showDetails ? 'Ocultar detalhes' : 'O que isto inclui'}
            </button>

            {showDetails && (
              <div className="mt-3 px-4 py-3 rounded-xl bg-[#FAFBFA] border border-[#E2E8E5] space-y-2">
                <p className="text-[12px] text-gray-600 leading-relaxed">
                  Ao aceitar, confirma que leu as regras de uso do portal, como os seus dados
                  pessoais são recolhidos e tratados (incluindo o envio de perguntas ao AI Insights
                  para processamento por inteligência artificial) e que cookies usamos para manter a
                  sua sessão iniciada.
                </p>
                <p className="text-[12px] text-gray-600 leading-relaxed">
                  Pode rever, exportar ou eliminar os seus dados a qualquer momento a partir do seu
                  Perfil, e consultar estes três documentos completos pelos links acima.
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-[#E2E8E5] mb-4" />

          {/* Actions — aceitar é a única acção com cor: as outras duas são recusas/adiamentos,
              tratadas como acções neutras, não como erros. */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRemindLater}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8E5] bg-white text-[12px] font-semibold text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                Lembrar depois
              </button>

              <button
                type="button"
                onClick={handleReject}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8E5] bg-white text-[12px] font-semibold text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Rejeitar
              </button>
            </div>

            <button
              type="button"
              onClick={handleAccept}
              disabled={!agreed}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#064E2C] text-white text-[13px] font-bold rounded-xl hover:bg-[#04361F] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 disabled:translate-y-0"
            >
              <Check className="w-4 h-4" />
              Aceitar e continuar
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
