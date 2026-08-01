import crypto from 'crypto'

export type OAuthProvider = 'google' | 'linkedin'

type ProviderConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
  authorizeUrl: string
  tokenUrl: string
  userInfoUrl: string
  scope: string
}

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  )
}

/** Devolve null quando as credenciais do provedor não estão configuradas em .env. */
export function getProviderConfig(provider: OAuthProvider): ProviderConfig | null {
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
    if (!clientId || !clientSecret) return null
    return {
      clientId,
      clientSecret,
      redirectUri: `${getSiteUrl()}/api/auth/oauth/google/callback`,
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      scope: 'openid email profile',
    }
  }

  if (provider === 'linkedin') {
    const clientId = process.env.LINKEDIN_CLIENT_ID?.trim()
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim()
    if (!clientId || !clientSecret) return null
    return {
      clientId,
      clientSecret,
      redirectUri: `${getSiteUrl()}/api/auth/oauth/linkedin/callback`,
      authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
      scope: 'openid email profile',
    }
  }

  return null
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === 'google' || value === 'linkedin'
}

export function generateOAuthState(): string {
  return crypto.randomBytes(24).toString('hex')
}

export type OAuthProfile = {
  providerId: string
  email: string
  name: string
}

/** Troca o code de autorização por um perfil (email, nome, id) via OpenID Connect. */
export async function exchangeCodeForProfile(
  provider: OAuthProvider,
  config: ProviderConfig,
  code: string
): Promise<OAuthProfile> {
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  const tokenResponse = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  })

  if (!tokenResponse.ok) {
    throw new Error(`Falha ao obter token do provedor ${provider}`)
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string }
  if (!tokenData.access_token) {
    throw new Error(`Token de acesso em falta na resposta do provedor ${provider}`)
  }

  const userInfoResponse = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  if (!userInfoResponse.ok) {
    throw new Error(`Falha ao obter perfil do provedor ${provider}`)
  }

  const profile = (await userInfoResponse.json()) as Record<string, unknown>

  const providerId = String(profile.sub ?? profile.id ?? '')
  const email = String(profile.email ?? '').toLowerCase()
  const name =
    String(profile.name ?? '').trim() ||
    [profile.given_name, profile.family_name].filter(Boolean).join(' ').trim() ||
    email

  if (!providerId || !email) {
    throw new Error(`Perfil incompleto recebido do provedor ${provider}`)
  }

  return { providerId, email, name: name || email }
}
