import { Suspense } from 'react'
import { ShieldCheck } from 'lucide-react'
import { AuthCard } from '@/components/AuthCard'
import { Verify2FAForm } from '@/components/Verify2FAForm'

export default function Verificar2FAPage() {
  return (
    <AuthCard
      icon={ShieldCheck}
      title="Verificação em duas etapas"
      subtitle="Introduza o código enviado para o seu email"
    >
      <Suspense fallback={<div className="text-center text-sm text-gray-500">A carregar...</div>}>
        <Verify2FAForm />
      </Suspense>
    </AuthCard>
  )
}
