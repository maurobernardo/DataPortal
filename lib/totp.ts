import { generateSecret, generateURI, verify } from 'otplib'
import QRCode from 'qrcode'
import crypto from 'crypto'

const ISSUER = 'Data Portal'

export function generateTotpSecret(): string {
  return generateSecret()
}

export async function generateTotpQrCode(email: string, secret: string): Promise<string> {
  const uri = generateURI({ issuer: ISSUER, label: email, secret })
  return QRCode.toDataURL(uri)
}

export async function verifyTotpToken(token: string, secret: string): Promise<boolean> {
  try {
    const result = await verify({ secret, token })
    return result.valid
  } catch {
    return false
  }
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => crypto.randomBytes(5).toString('hex').toUpperCase())
}

export function parseBackupCodes(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
