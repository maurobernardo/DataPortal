'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
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
          className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm md:text-base"
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
          className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm md:text-base"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg md:rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold text-sm md:text-base lg:text-lg shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            <span>Entrando...</span>
          </>
        ) : (
          <span>Entrar</span>
        )}
      </button>
    </form>
  )
}
