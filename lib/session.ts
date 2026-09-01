import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'

export const SESSION_COOKIE_NAME = 'session'

/**
 * Segredo por omissão só é aceite em desenvolvimento explícito (NODE_ENV === 'development').
 * Antes disto, a condição era "bloquear só se NODE_ENV === 'production'" — em hospedagem
 * partilhada/cPanel é comum o processo correr sem NODE_ENV correctamente definido, o que fazia
 * cair silenciosamente neste segredo público (está no código-fonte, qualquer pessoa o conhece) e
 * permitia forjar um token de sessão de administrador. Agora é o inverso: seguro por omissão,
 * inseguro só quando explicitamente pedido para desenvolvimento local.
 */
const DEFAULT_SECRET_DEV_ONLY = 'dev-only-insecure-secret-never-use-in-production'
const isDevExplicito = process.env.NODE_ENV === 'development'
const JWT_SECRET = process.env.JWT_SECRET || (isDevExplicito ? DEFAULT_SECRET_DEV_ONLY : '')

function segredoValido(): boolean {
  return Boolean(JWT_SECRET)
}

if (!segredoValido()) {
  // Não interrompe o arranque do processo (podia impedir, por exemplo, um build ou um health
  // check que não emite/verifica tokens) — mas fica bem visível nos logs do servidor, e
  // sign/verify abaixo recusam-se a operar sem segredo real.
  logger.error('sessao.jwt_secret_em_falta', {
    aviso: 'JWT_SECRET não está definido e NODE_ENV não é "development": sessões não podem ser emitidas nem validadas até a variável de ambiente ser configurada.',
  })
}

export interface SessionPayload {
  userId: number
  email: string
  role: 'user' | 'admin'
}

export function normalizeRole(role: unknown): 'user' | 'admin' {
  return String(role ?? '').trim().toLowerCase() === 'admin' ? 'admin' : 'user'
}

export function signSessionToken(payload: SessionPayload): string {
  if (!segredoValido()) {
    throw new Error('JWT_SECRET não configurado: não é possível emitir uma sessão em segurança.')
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!segredoValido()) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionPayload
    return {
      userId: payload.userId,
      email: payload.email,
      role: normalizeRole(payload.role),
    }
  } catch {
    return null
  }
}

/** Token de curta duração emitido depois da senha ser validada, quando o utilizador tem TOTP activo. */
export function signPending2faToken(userId: number): string {
  if (!segredoValido()) {
    throw new Error('JWT_SECRET não configurado: não é possível emitir um token de 2FA em segurança.')
  }
  return jwt.sign({ userId, purpose: 'totp-pending' }, JWT_SECRET, { expiresIn: '5m' })
}

export function verifyPending2faToken(token: string): { userId: number } | null {
  if (!segredoValido()) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: number; purpose?: string }
    if (payload.purpose !== 'totp-pending' || typeof payload.userId !== 'number') return null
    return { userId: payload.userId }
  } catch {
    return null
  }
}

export function getSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  }
}
