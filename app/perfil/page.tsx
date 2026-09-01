import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'
import { getCurrentUser, getUserInitials } from '@/lib/auth'
import { findUserById } from '@/lib/db'
import { ProfileForm } from '@/components/ProfileForm'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: { configurar2fa?: string }
}) {
  const session = await getCurrentUser()
  if (!session) {
    redirect('/login?next=/perfil')
  }

  const user = await findUserById(session.userId)
  if (!user) {
    redirect('/login?next=/perfil')
  }

  const initials = getUserInitials(user.name, user.email)
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-green-50/40 to-white px-4 pt-10 pb-16 md:pt-14">
      <div className="max-w-xl mx-auto">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white pl-1.5 pr-3 py-1.5 shadow-sm hover:shadow-md hover:-translate-x-0.5 transition-all mb-6"
        >
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-bold text-gray-700">Voltar ao início</span>
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white text-xl font-bold shadow-lg shrink-0">
            {initials}
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              O meu perfil
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Faça a gestão dos seus dados de conta.</p>
          </div>
        </div>

        <ProfileForm
          initialName={user.name || ''}
          email={user.email}
          role={user.role}
          hasPassword={Boolean(user.password)}
          memberSince={memberSince}
          totpEnabled={Boolean(user.totp_enabled)}
          pedidoEliminacaoEm={user.pedido_eliminacao_em ? new Date(user.pedido_eliminacao_em).toISOString() : null}
          totpObrigatorio={user.role === 'admin' && !user.totp_enabled && searchParams?.configurar2fa === 'obrigatorio'}
        />
      </div>
    </div>
  )
}
