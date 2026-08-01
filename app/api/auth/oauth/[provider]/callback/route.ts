import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookieOptions, SESSION_COOKIE_NAME, signSessionToken } from '@/lib/auth'
import { createOAuthUser, findUserByEmail, findUserByOAuth, linkOAuthToUser } from '@/lib/db'
import { exchangeCodeForProfile, getProviderConfig, isOAuthProvider } from '@/lib/oauth'
import { notifyAdminsOfNewUser } from '@/lib/notifications'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  const provider = params.provider

  const loginErrorUrl = (reason: string) => {
    const url = new URL('/login', request.url)
    url.searchParams.set('error', reason)
    return url
  }

  if (!isOAuthProvider(provider)) {
    return NextResponse.redirect(loginErrorUrl('oauth_not_configured'))
  }

  const config = getProviderConfig(provider)
  if (!config) {
    return NextResponse.redirect(loginErrorUrl('oauth_not_configured'))
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const savedState = request.cookies.get(`oauth_state_${provider}`)?.value

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(loginErrorUrl('oauth_invalid_state'))
  }

  try {
    const profile = await exchangeCodeForProfile(provider, config, code)

    let user = await findUserByOAuth(provider, profile.providerId)
    let isNewUser = false

    if (!user) {
      const existing = await findUserByEmail(profile.email)
      if (existing) {
        await linkOAuthToUser(existing.id, provider, profile.providerId)
        user = await findUserByOAuth(provider, profile.providerId)
      } else {
        user = await createOAuthUser({
          name: profile.name,
          email: profile.email,
          provider,
          oauthId: profile.providerId,
        })
        isNewUser = true
      }
    }

    if (!user) {
      return NextResponse.redirect(loginErrorUrl('oauth_failed'))
    }

    if (isNewUser) {
      notifyAdminsOfNewUser({ name: user.name, email: user.email }).catch((error) => {
        logger.error('error_notifying_admins_of_new_oauth_user', { error, email: user!.email })
      })
    }

    const role = user.role === 'admin' ? 'admin' : 'user'
    const token = signSessionToken({ userId: user.id, email: user.email, role })
    const redirectTo = role === 'admin' ? '/dashboard' : '/'

    const response = NextResponse.redirect(new URL(redirectTo, request.url))
    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions())
    response.cookies.set(`oauth_state_${provider}`, '', { path: '/', maxAge: 0 })
    return response
  } catch (error) {
    logger.error('oauth_callback_error', { provider, error: error })
    return NextResponse.redirect(loginErrorUrl('oauth_failed'))
  }
}
