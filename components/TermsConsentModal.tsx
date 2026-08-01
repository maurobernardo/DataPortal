'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ShieldCheck, FileText, Cookie, ChevronRight, ChevronDown, Check, X, Clock } from 'lucide-react'

const CONSENT_KEY = 'dataPortalTermsConsent'
const CONSENT_REMIND_AT_KEY = 'dataPortalTermsRemindAt'

export function TermsConsentModal() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const hiddenRoutes = ['/admin', '/dashboard', '/login', '/registo', '/verificar-email', '/verificar-2fa', '/admin/login', '/termos-condicoes', '/politica-cookies']
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
      <div className="pointer-events-auto mx-auto w-full max-w-2xl rounded-2xl bg-white border border-gray-200 shadow-2xl shadow-black/10 overflow-hidden animate-slide-up">

        {/* Top accent line */}
        <div className="h-[3px] bg-gradient-to-r from-green-500 to-green-400" />

        <div className="p-5 md:p-6">

          {/* Header row */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-[18px] h-[18px] text-green-600" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-gray-900 leading-tight">
                Termos e condições
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Ao continuar, confirma que leu e aceita os nossos termos.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 mb-5" />

          {/* Doc links */}
          <div className="flex flex-wrap gap-2 mb-5">
            <Link
              href="/termos-condicoes"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-medium text-gray-700 hover:border-green-200 hover:bg-green-50 hover:text-green-700 transition"
            >
              <FileText className="w-3.5 h-3.5 text-green-500" />
              Termos e condições
            </Link>
            <Link
              href="/politica-cookies"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-medium text-gray-700 hover:border-green-200 hover:bg-green-50 hover:text-green-700 transition"
            >
              <Cookie className="w-3.5 h-3.5 text-green-500" />
              Política de cookies
            </Link>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 focus:ring-offset-0 cursor-pointer shrink-0"
            />
            <span className="text-[13px] text-gray-500 leading-relaxed">
              Li e concordo com os{' '}
              <span className="text-gray-800 font-medium">Termos e Condições</span>
              {' '}e com a{' '}
              <span className="text-gray-800 font-medium">Política de Cookies</span>.
            </span>
          </label>

          {/* Details toggle */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowDetails((p) => !p)}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-green-600 hover:text-green-700 transition"
            >
              {showDetails
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronRight className="w-3.5 h-3.5" />
              }
              {showDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
            </button>

            {showDetails && (
              <div className="mt-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                <p className="text-[12px] text-gray-500 leading-relaxed">
                  Ao aceitar, confirma que leu os termos de uso e está de acordo com as regras
                  de acesso, uso responsável dos dados e política de cookies do portal.
                </p>
                <p className="text-[12px] text-gray-500 leading-relaxed">
                  Pode rever estes documentos a qualquer momento pelos links acima.
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 mb-4" />

          {/* Actions — três botões com peso visual distinto */}
          <div className="flex items-center justify-between gap-3 flex-wrap">

            {/* Acções secundárias agrupadas à esquerda */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRemindLater}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-[12px] font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 transition"
              >
                <Clock className="w-3.5 h-3.5" />
                Lembrar depois
              </button>

              <button
                type="button"
                onClick={handleReject}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-100 bg-red-50 text-[12px] font-medium text-red-600 hover:border-red-200 hover:bg-red-100 transition"
              >
                <X className="w-3.5 h-3.5" />
                Rejeitar
              </button>
            </div>

            {/* Aceitar — acção primária à direita */}
            <button
              type="button"
              onClick={handleAccept}
              disabled={!agreed}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-[13px] font-semibold rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 disabled:translate-y-0"
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