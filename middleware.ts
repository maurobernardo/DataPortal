import { NextRequest, NextResponse } from 'next/server'

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

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigins = getAllowedOrigins()
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

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
  matcher: '/:path*',
}
