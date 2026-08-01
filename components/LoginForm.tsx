'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Loader2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { parseApiResponse } from '@/lib/parse-api-response'
import { SocialLoginButtons } from '@/components/SocialLoginButtons'

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured: 'Este método de login ainda não está disponível.',
  oauth_invalid_state: 'Sessão de login expirada. Tente novamente.',
  oauth_failed: 'Não foi possível concluir o login. Tente novamente.',
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/'
  const oauthError = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(oauthError ? OAUTH_ERROR_MESSAGES[oauthError] || '' : '')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [pendingToken, setPendingToken] = useState('')
  const [totpCode, setTotpCode] = useState('')

  function resolveRedirect(data: { redirectTo?: string; user?: { role?: 'user' | 'admin' } }) {
    const isAdmin = data.user?.role === 'admin'
    const adminTarget =
      nextPath.startsWith('/admin') || nextPath.startsWith('/dashboard') ? nextPath : '/dashboard'
    return isAdmin
      ? adminTarget
      : data.redirectTo && data.redirectTo !== '/dashboard'
        ? data.redirectTo
        : nextPath && nextPath !== '/'
          ? nextPath
          : '/'
  }

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
        needsTotp?: boolean
        pendingToken?: string
        redirectTo?: string
        user?: { role?: 'user' | 'admin' }
      }>(response)

      if (!ok) {
        if (data.needsVerification) {
          setNeedsVerification(true)
        }
        throw new Error(data.error || 'Erro ao fazer login')
      }

      if (data.needsTotp && data.pendingToken) {
        setPendingToken(data.pendingToken)
        return
      }

      window.location.href = resolveRedirect(data)
      return
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken, code: totpCode.trim() }),
      })

      const { data, ok } = await parseApiResponse<{
        error?: string
        redirectTo?: string
        user?: { role?: 'user' | 'admin' }
      }>(response)

      if (!ok) throw new Error(data.error || 'Código inválido.')

      window.location.href = resolveRedirect(data)
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

  if (pendingToken) {
    return (
      <form onSubmit={handleTotpSubmit} className="space-y-4 md:space-y-6">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center gap-2 text-sm md:text-base">
            <AlertCircle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="text-center">
          <ShieldCheck className="w-10 h-10 text-green-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            Introduza o código de 6 dígitos da sua aplicação autenticadora, ou um código de backup.
          </p>
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value)}
          required
          autoFocus
          placeholder="000000"
          className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-lg text-center tracking-[0.3em] font-bold"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg md:rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold text-sm md:text-base lg:text-lg shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
              <span>A verificar...</span>
            </>
          ) : (
            <span>Confirmar</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setPendingToken('')
            setTotpCode('')
            setError('')
          }}
          className="w-full text-center text-sm font-semibold text-gray-500 hover:text-gray-700"
        >
          Voltar ao login
        </button>
      </form>
    )
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
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs md:text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Senha
          </label>
          <Link href="/recuperar-senha" className="text-xs md:text-sm font-semibold text-green-600 hover:text-green-700">
            Esqueceu a senha?
          </Link>
        </div>
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

      <SocialLoginButtons />

      <p className="text-center text-sm text-gray-600">
        Ainda não tem conta?{' '}
        <Link href="/registo" className="font-semibold text-green-600 hover:text-green-700">
          Registar
        </Link>
      </p>
    </form>
  )
}
