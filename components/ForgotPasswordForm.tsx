'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { parseApiResponse } from '@/lib/parse-api-response'

export function ForgotPasswordForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const { data, ok } = await parseApiResponse<{ error?: string; message?: string }>(response)

      if (!ok) {
        throw new Error(data.error || 'Não foi possível processar o pedido')
      }

      setSuccess(data.message || 'Se existir uma conta com este email, enviámos um código de recuperação.')
      setTimeout(() => {
        router.push(`/redefinir-senha?email=${encodeURIComponent(email)}`)
      }, 1800)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
      <p className="text-sm text-gray-600 text-center">
        Introduza o seu email e enviaremos um código para redefinir a sua senha.
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
        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          readOnly={Boolean(success)}
          placeholder="Digite o seu email"
          className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm md:text-base read-only:bg-gray-50"
        />
      </div>

      <button
        type="submit"
        disabled={loading || Boolean(success)}
        className="w-full flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg md:rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold text-sm md:text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            <span>A enviar...</span>
          </>
        ) : (
          <span>Enviar código</span>
        )}
      </button>

      {success && (
        <p className="text-center text-sm text-gray-600">
          Já tem um código?{' '}
          <Link
            href={`/redefinir-senha?email=${encodeURIComponent(email)}`}
            className="font-semibold text-green-600 hover:text-green-700"
          >
            Introduzir agora
          </Link>
        </p>
      )}

      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="font-semibold text-green-600 hover:text-green-700">
          Voltar ao login
        </Link>
      </p>
    </form>
  )
}
