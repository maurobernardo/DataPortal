'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { parseApiResponse } from '@/lib/parse-api-response'

export function LoginForm() {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setNeedsVerification(false)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const { data, ok } = await parseApiResponse<{
        error?: string
        needsVerification?: boolean
        redirectTo?: string
        user?: { role?: 'user' | 'admin' }
      }>(response)

      if (!ok) {
        if (data.needsVerification) {
          setNeedsVerification(true)
        }
        throw new Error(data.error || 'Erro ao fazer login')
      }

      const isAdmin = data.user?.role === 'admin'
      const adminTarget =
        nextPath.startsWith('/admin') || nextPath.startsWith('/dashboard') ? nextPath : '/dashboard'
      const redirectTo = isAdmin
        ? adminTarget
        : data.redirectTo && data.redirectTo !== '/dashboard'
          ? data.redirectTo
          : nextPath && nextPath !== '/'
            ? nextPath
            : '/'

      window.location.href = redirectTo
      return
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResendVerification() {
    setError('')
    setInfo('')
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

      setInfo(data.message || 'Novo código enviado. Verifique o seu email.')
      setNeedsVerification(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center gap-2 text-sm md:text-base">
          <AlertCircle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {info && (
        <div className="bg-green-50 border-2 border-green-200 text-green-800 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base">
          {info}
        </div>
      )}

      <div>
        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Digite o seu email"
          className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm md:text-base"
        />
      </div>

      <div>
        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Senha
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm md:text-base"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg md:rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold text-sm md:text-base lg:text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            <span>A entrar...</span>
          </>
        ) : (
          <span>Entrar</span>
        )}
      </button>

      {needsVerification && email && (
        <div className="space-y-2 text-center">
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resending}
            className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'A reenviar código...' : 'Reenviar código de confirmação'}
          </button>
          <p className="text-sm text-gray-600">
            ou{' '}
            <Link
              href={`/verificar-email?email=${encodeURIComponent(email)}`}
              className="font-semibold text-green-600 hover:text-green-700"
            >
              introduzir código
            </Link>
          </p>
        </div>
      )}

      <p className="text-center text-sm text-gray-600">
        Ainda não tem conta?{' '}
        <Link href="/registo" className="font-semibold text-green-600 hover:text-green-700">
          Registar
        </Link>
      </p>
    </form>
  )
}
