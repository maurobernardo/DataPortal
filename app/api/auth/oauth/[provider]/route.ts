import { NextRequest, NextResponse } from 'next/server'
import { generateOAuthState, getProviderConfig, getSiteUrl, isOAuthProvider } from '@/lib/oauth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  const provider = params.provider

  if (!isOAuthProvider(provider)) {
    return NextResponse.json({ error: 'Provedor inválido' }, { status: 400 })
  }

  const config = getProviderConfig(provider)

  if (!config) {
    const loginUrl = new URL('/login', getSiteUrl())
    loginUrl.searchParams.set('error', 'oauth_not_configured')
    return NextResponse.redirect(loginUrl)
  }

  const state = generateOAuthState()
  const authorizeUrl = new URL(config.authorizeUrl)
  authorizeUrl.searchParams.set('client_id', config.clientId)
  authorizeUrl.searchParams.set('redirect_uri', config.redirectUri)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('scope', config.scope)
  authorizeUrl.searchParams.set('state', state)

  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set(`oauth_state_${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60,
    path: '/',
  })
  return response
}
