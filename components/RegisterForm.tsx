'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Loader2, AlertCircle, User, Users, CheckCircle2, ChevronDown } from 'lucide-react'
import { parseApiResponse } from '@/lib/parse-api-response'
import { SocialLoginButtons } from '@/components/SocialLoginButtons'
import { OPCOES_AREA_UTILIZADOR } from '@/lib/user-profile-options'

export function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [profileCategory, setProfileCategory] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, profileCategory }),
      })

      const { data, ok } = await parseApiResponse<{
        error?: string
        message?: string
        email?: string
        needsVerification?: boolean
      }>(response)

      if (!ok) {
        if (data.needsVerification && data.email) {
          router.push(`/verificar-email?email=${encodeURIComponent(data.email)}`)
          return
        }
        throw new Error(data.error || 'Erro ao registar')
      }

      setCompleted(true)
      setSuccess(
        data.message ||
          'Registo concluído! Verifique o seu email e introduza o código de 6 dígitos.'
      )

      setTimeout(() => {
        router.push(`/verificar-email?email=${encodeURIComponent(data.email || email)}`)
      }, 1800)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (completed) {
    return (
      <div className="space-y-6 text-center">
        <div className="bg-green-50 border-2 border-green-200 text-green-800 px-4 py-5 rounded-xl flex flex-col items-center gap-3">
          <CheckCircle2 className="w-12 h-12" />
          <h2 className="text-lg font-bold">Registo realizado!</h2>
          <p className="text-sm md:text-base">{success}</p>
          <p className="text-xs text-green-700">A redireccionar para confirmação...</p>
        </div>
        <Link
          href={`/verificar-email?email=${encodeURIComponent(email)}`}
          className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition"
        >
          Introduzir código agora
        </Link>
      </div>
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

      <div>
        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Nome
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="O seu nome"
          className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm md:text-base"
        />
      </div>

      <div>
        <label
          htmlFor="registo-area"
          className="block text-xs md:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"
        >
          <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Qual a sua área?
        </label>
        <div className="relative">
          <select
            id="registo-area"
            value={profileCategory}
            onChange={(e) => setProfileCategory(e.target.value)}
            required
            className="w-full appearance-none px-3 md:px-4 py-2.5 md:py-3 pr-10 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm md:text-base bg-white"
          >
            <option value="" disabled>
              Seleccione uma opção
            </option>
            {OPCOES_AREA_UTILIZADOR.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 md:right-4 top-1/2 -translate-y-1/2 size-4 text-gray-500"
            aria-hidden
          />
        </div>
      </div>

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
          minLength={12}
          placeholder="Mínimo 12 caracteres"
          className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm md:text-base"
        />
        <p className="mt-1.5 text-xs text-gray-500">Maiúscula, minúscula, número e símbolo.</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg md:rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold text-sm md:text-base lg:text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            <span>A registar...</span>
          </>
        ) : (
          <span>Criar conta</span>
        )}
      </button>

      <SocialLoginButtons />

      <p className="text-center text-sm text-gray-600">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold text-green-600 hover:text-green-700">
          Entrar
        </Link>
      </p>
    </form>
  )
}
