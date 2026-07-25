'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { parseApiResponse } from '@/lib/parse-api-response'

export function Verify2FAForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  const email = searchParams.get('email') || ''
  const nextPath = searchParams.get('next') || '/dashboard'

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState('')

  if (!userId) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-gray-600">Sessão inválida. Faça login novamente.</p>
        <Link href="/login" className="inline-block font-semibold text-green-600 hover:text-green-700">
          Ir para login
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResent('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: Number(userId), code }),
      })

      const { data, ok } = await parseApiResponse<{ error?: string }>(response)

      if (!ok) {
        throw new Error(data.error || 'Código inválido')
      }

      router.push(nextPath)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setResent('')
    setResending(true)

    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: Number(userId), email }),
      })

      const { data, ok } = await parseApiResponse<{ error?: string; message?: string }>(response)

      if (!ok) {
        throw new Error(data.error || 'Não foi possível reenviar o código')
      }

      setResent(data.message || 'Novo código enviado.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
      {email && (
        <p className="text-sm text-gray-600 text-center">
          Enviámos um código de 6 dígitos para <strong>{email}</strong>
        </p>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center gap-2 text-sm md:text-base">
          <AlertCircle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resent && (
        <div className="bg-green-50 border-2 border-green-200 text-green-800 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base">
          {resent}
        </div>
      )}

      <div>
        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Código de verificação
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          placeholder="000000"
          className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm md:text-base text-center tracking-[0.35em] font-semibold"
        />
      </div>

      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="w-full flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg md:rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold text-sm md:text-base lg:text-lg shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            <span>A verificar...</span>
          </>
        ) : (
          <span>Entrar</span>
        )}
      </button>

      <button
        type="button"
        onClick={handleResend}
        disabled={resending}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-green-700 hover:text-green-800 disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
        {resending ? 'A reenviar...' : 'Reenviar código'}
      </button>

      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="font-semibold text-green-600 hover:text-green-700">
          Voltar ao login
        </Link>
      </p>
    </form>
  )
}
