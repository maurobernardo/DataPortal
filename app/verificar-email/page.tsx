'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MailCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { AuthCard } from '@/components/AuthCard'
import { VerifyEmailCodeForm } from '@/components/VerifyEmailCodeForm'
import { parseApiResponse } from '@/lib/parse-api-response'

function VerifyEmailTokenContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return

    const verifyToken = token
    let cancelled = false

    async function verify() {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`)
        const { data, ok } = await parseApiResponse<{ error?: string; message?: string }>(response)

        if (cancelled) return

        if (!ok) {
          setStatus('error')
          setMessage(data.error || 'Não foi possível confirmar o email.')
          return
        }

        setStatus('success')
        setMessage(data.message || 'Email confirmado com sucesso.')
      } catch {
        if (!cancelled) {
          setStatus('error')
          setMessage('Erro ao confirmar o email. Tente novamente.')
        }
      }
    }

    verify()

    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="space-y-6 text-center">
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <p className="text-sm md:text-base">A confirmar o seu email...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="bg-green-50 border-2 border-green-200 text-green-800 px-4 py-4 rounded-xl flex flex-col items-center gap-3">
          <CheckCircle2 className="w-10 h-10" />
          <p className="text-sm md:text-base">{message}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-4 rounded-xl flex flex-col items-center gap-3">
          <AlertCircle className="w-10 h-10" />
          <p className="text-sm md:text-base">{message}</p>
        </div>
      )}

      {status !== 'loading' && (
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition"
        >
          Ir para login
        </Link>
      )}
    </div>
  )
}

function VerifyEmailPageContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  if (token) {
    return <VerifyEmailTokenContent />
  }

  return <VerifyEmailCodeForm />
}

export default function VerificarEmailPage() {
  return (
    <AuthCard
      icon={MailCheck}
      title="Confirmar email"
      subtitle="Introduza o código enviado após o registo"
    >
      <Suspense fallback={<div className="text-center text-sm text-gray-500">A carregar...</div>}>
        <VerifyEmailPageContent />
      </Suspense>
    </AuthCard>
  )
}
