'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const CONSENT_KEY = 'dataPortalTermsConsent'

export function TermsConsentModal() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    const hiddenRoutes = ['/admin', '/dashboard', '/admin/login']
    const shouldHide = hiddenRoutes.some((route) => pathname.startsWith(route))
    if (shouldHide) return

    const consent = window.localStorage.getItem(CONSENT_KEY)
    if (consent !== 'accepted') {
      setIsOpen(true)
    }
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 p-5 md:p-6 animate-slide-up">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
          Termos e Condições
        </h2>
        <p className="text-sm md:text-base text-gray-600 mb-4">
          Ao continuar a usar o portal, você concorda com os nossos termos de uso e política de cookies.
        </p>
        <div className="flex flex-wrap gap-2 mb-5">
          <Link
            href="/termos-condicoes"
            className="text-sm font-medium text-green-700 hover:text-green-800 underline"
          >
            Ler Termos e Condições
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href="/politica-cookies"
            className="text-sm font-medium text-green-700 hover:text-green-800 underline"
          >
            Política de Cookies
          </Link>
        </div>
        <label className="flex items-start gap-3 mb-5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span>
            Li e concordo com os Termos e Condições e com a Política de Cookies.
          </span>
        </label>
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={handleReject}
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition"
          >
            Rejeitar
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!agreed}
            className="px-4 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed font-medium transition"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  )
}
