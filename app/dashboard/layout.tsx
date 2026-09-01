import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { findUserById } from '@/lib/db'

/** Mesma exigência de 2FA obrigatório do app/admin/layout.tsx — /dashboard é também área
 *  exclusiva de administradores (cada página já redirecciona utilizadores não-admin para "/"). */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser()

  if (session && session.role === 'admin') {
    const user = await findUserById(session.userId)
    if (user && !user.totp_enabled) {
      redirect('/perfil?configurar2fa=obrigatorio')
    }
  }

  return <>{children}</>
}
