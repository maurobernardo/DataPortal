import { UserPlus } from 'lucide-react'
import { AuthCard } from '@/components/AuthCard'
import { RegisterForm } from '@/components/RegisterForm'

export default function RegistoPage() {
  return (
    <AuthCard
      icon={UserPlus}
      title="Criar conta"
      subtitle="Registe-se para aceder ao Data Portal"
    >
      <RegisterForm />
    </AuthCard>
  )
}
