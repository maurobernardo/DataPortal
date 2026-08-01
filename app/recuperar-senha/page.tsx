import { Suspense } from 'react'
import { KeyRound } from 'lucide-react'
import { AuthCard } from '@/components/AuthCard'
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm'

export default function RecuperarSenhaPage() {
  return (
    <AuthCard
      icon={KeyRound}
      title="Recuperar senha"
      subtitle="Vamos ajudá-lo a voltar a aceder à sua conta"
    >
      <Suspense fallback={<div className="text-center text-sm text-gray-500">A carregar...</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthCard>
  )
}
