import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
  normalizeRole,
  type SessionPayload,
} from '@/lib/session'

export {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
  normalizeRole,
  signPending2faToken,
  verifyPending2faToken,
  type SessionPayload,
} from '@/lib/session'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** Token aleatório para confirmação de email (não é JWT). */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

export async function getCurrentUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  return verifySessionToken(token)
}

/**
 * 2FA deixou de ser opcional para administradores (PLANO-SEGURANCA.md): uma conta admin tem
 * alcance total (eliminar datasets, promover outros admins), por isso qualquer rota de API
 * administrativa exige TOTP activo, não só o papel "admin". `app/admin/layout.tsx` e
 * `app/dashboard/layout.tsx` já impedem o acesso às páginas sem 2FA; isto é a mesma exigência do
 * lado das rotas de API, para nenhuma ficar acessível só porque foi chamada directamente.
 */
export async function getCurrentAdmin(): Promise<SessionPayload | null> {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.role !== 'admin') {
    return null
  }
  const { findUserById } = await import('@/lib/db')
  const user = await findUserById(profile.id)
  if (!user?.totp_enabled) {
    return null
  }
  return { userId: profile.id, email: profile.email, role: 'admin' }
}

/** Só para os próprios endpoints de configuração do 2FA (setup/enable/disable): têm de funcionar
 *  antes do 2FA estar activo, senão um admin nunca conseguiria configurá-lo pela primeira vez.
 *  Nunca usar isto para nenhuma outra rota administrativa. */
export async function getCurrentAdminSemExigir2FA(): Promise<SessionPayload | null> {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.role !== 'admin') {
    return null
  }
  return { userId: profile.id, email: profile.email, role: 'admin' }
}

export async function getCurrentUserProfile() {
  const session = await getCurrentUser()
  if (!session) return null

  const { findUserById } = await import('@/lib/db')
  const user = await findUserById(session.userId)
  if (!user) return null
  // Sessão já emitida antes de a conta ser desactivada: nega o acesso em vez de esperar pelo
  // próximo login. `active` chega como TINYINT (0/1) ou undefined em bases sem a coluna ainda.
  if ((user as any).active === 0 || (user as any).active === false) return null

  const role = normalizeRole(user.role)

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    emailVerified: Boolean(user.emailVerified),
  }
}

export function getUserInitials(name?: string | null, email?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (email?.[0] || 'U').toUpperCase()
}
