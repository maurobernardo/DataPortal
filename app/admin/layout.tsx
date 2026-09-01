import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { findUserById } from '@/lib/db'

/**
 * PLANO-SEGURANCA.md: uma conta de administrador tem alcance total (eliminar datasets, promover
 * outros admins) — por isso o 2FA deixa de ser opcional para este perfil. Este layout envolve
 * todas as páginas de /admin (incluindo /admin/login, que continua acessível sem sessão nenhuma:
 * só actua quando já existe uma sessão de admin válida). Não repete a verificação de "é admin?"
 * já feita em cada página — só acrescenta a exigência de 2FA por cima dela.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser()

  if (session && session.role === 'admin') {
    const user = await findUserById(session.userId)
    if (user && !user.totp_enabled) {
      redirect('/perfil?configurar2fa=obrigatorio')
    }
  }

  return <>{children}</>
}
