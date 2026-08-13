import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/session'

function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS || ''
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  return response
}

function isProtectedPath(pathname: string): boolean {
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return true
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (pathname === '/admin/login') return false
    return true
  }
  return false
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const origin = request.headers.get('origin')
  const allowedOrigins = getAllowedOrigins()
  const isApiRoute = pathname.startsWith('/api/')

  if (isProtectedPath(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

    // Middleware corre no Edge — só verifica presença do cookie.
    // A validação JWT e o perfil admin fazem-se nas páginas/API (Node.js).
    if (!token) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.search = ''
      loginUrl.searchParams.set('next', pathname)
      return applySecurityHeaders(NextResponse.redirect(loginUrl))
    }
  }

  if (isApiRoute && request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 })
    if (origin && allowedOrigins.includes(origin)) {
      preflight.headers.set('Access-Control-Allow-Origin', origin)
      preflight.headers.set('Vary', 'Origin')
    }
    preflight.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    preflight.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return applySecurityHeaders(preflight)
  }

  const response = NextResponse.next()

  if (isApiRoute && origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Vary', 'Origin')
  }

  return applySecurityHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)'],
}
