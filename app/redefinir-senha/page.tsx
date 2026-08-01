import { Suspense } from 'react'
import { ShieldCheck } from 'lucide-react'
import { AuthCard } from '@/components/AuthCard'
import { ResetPasswordForm } from '@/components/ResetPasswordForm'

export default function RedefinirSenhaPage() {
  return (
    <AuthCard
      icon={ShieldCheck}
      title="Redefinir senha"
      subtitle="Introduza o código enviado por email e a sua nova senha"
    >
      <Suspense fallback={<div className="text-center text-sm text-gray-500">A carregar...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  )
}
