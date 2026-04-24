import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
const DEFAULT_SECRET = 'your-super-secret-jwt-key-change-this-in-production'
export const AUTH_COOKIE_NAME = 'auth-token'

export interface TokenPayload {
  userId: number
  email: string
}

export function generateToken(payload: TokenPayload): string {
  if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_SECRET) {
    throw new Error('JWT_SECRET inseguro para produção')
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_SECRET) {
      return null
    }
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  const payload = verifyToken(token)
  if (!payload) {
    return null
  }

  return payload
}

export function getAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  } as const
}













