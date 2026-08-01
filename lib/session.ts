import jwt from 'jsonwebtoken'

export const SESSION_COOKIE_NAME = 'session'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
const DEFAULT_SECRET = 'your-super-secret-jwt-key-change-this-in-production'

export interface SessionPayload {
  userId: number
  email: string
  role: 'user' | 'admin'
}

export function normalizeRole(role: unknown): 'user' | 'admin' {
  return String(role ?? '').trim().toLowerCase() === 'admin' ? 'admin' : 'user'
}

export function signSessionToken(payload: SessionPayload): string {
  if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_SECRET) {
    throw new Error('JWT_SECRET inseguro para produção')
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_SECRET) {
      return null
    }
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
  return jwt.sign({ userId, purpose: 'totp-pending' }, JWT_SECRET, { expiresIn: '5m' })
}

export function verifyPending2faToken(token: string): { userId: number } | null {
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
