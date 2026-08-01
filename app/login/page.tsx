import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Lock } from 'lucide-react'
import { AuthCard } from '@/components/AuthCard'
import { LoginForm } from '@/components/LoginForm'
import { getCurrentUserProfile } from '@/lib/auth'

type LoginPageProps = {
  searchParams?: { next?: string }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUserProfile()

  if (user?.role === 'admin') {
    const next = searchParams?.next
    if (next?.startsWith('/admin') || next?.startsWith('/dashboard')) {
      redirect(next)
    }
    redirect('/dashboard')
  }

  return (
    <AuthCard
      icon={Lock}
      title="Entrar"
      subtitle="Aceda à sua conta Data Portal"
    >
      <Suspense fallback={<div className="text-center text-sm text-gray-500">A carregar...</div>}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  )
}
