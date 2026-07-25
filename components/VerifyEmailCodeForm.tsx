'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, Loader2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { parseApiResponse } from '@/lib/parse-api-response'

export function VerifyEmailCodeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email') || ''

  const [email, setEmail] = useState(emailParam)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })

      const { data, ok } = await parseApiResponse<{ error?: string; message?: string }>(response)

      if (!ok) {
        throw new Error(data.error || 'Código inválido')
      }

      setSuccess(data.message || 'Email confirmado com sucesso!')
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setSuccess('')
    setResending(true)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const { data, ok } = await parseApiResponse<{ error?: string; message?: string }>(response)

      if (!ok) {
        throw new Error(data.error || 'Não foi possível reenviar o código')
      }

      setSuccess(data.message || 'Novo código enviado para o seu email.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
      <p className="text-sm text-gray-600 text-center">
        Introduza o código de 6 dígitos enviado para o seu email após o registo.
      </p>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center gap-2 text-sm md:text-base">
          <AlertCircle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-2 border-green-200 text-green-800 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center gap-2 text-sm md:text-base">
          <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div>
        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          readOnly={Boolean(emailParam)}
          className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm md:text-base read-only:bg-gray-50"
        />
      </div>

      <div>
        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Código de confirmação
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
        disabled={loading || code.length !== 6 || Boolean(success)}
        className="w-full flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg md:rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold text-sm md:text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            <span>A confirmar...</span>
          </>
        ) : (
          <span>Confirmar email</span>
        )}
      </button>

      <button
        type="button"
        onClick={handleResend}
        disabled={resending || !email}
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
