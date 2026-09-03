import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/session'

function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS || ''
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function applySecurityHeaders(response: NextResponse, pathname?: string, isApiRoute?: boolean): NextResponse {
  // Nenhuma resposta de /api/* pode ser guardada em cache por um proxy à frente da aplicação
  // (comum em hosting partilhado tipo cPanel/CloudLinux, com LiteSpeed a fazer cache por URL sem
  // saber que o conteúdo depende de quem está a pedir). Visto ao vivo: a resposta de
  // /api/reports/[id]/digesto ficava em cache depois de UMA pessoa desbloquear o resumo, e todos
  // os outros utilizadores logados passavam a receber essa mesma resposta em cache, vendo o
  // resumo de um relatório pago sem nunca o terem pedido. `dynamic = 'force-dynamic'` nas rotas
  // só desliga a cache interna do Next, não impede um proxy externo de guardar a resposta —
  // só um cabeçalho `Cache-Control` explícito faz isso.
  if (isApiRoute) {
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
  }
  // /embed/* é a única família de páginas pensada para ser incorporada por sites de terceiros
  // (ver next.config.js) — X-Frame-Options: DENY é um header antigo que alguns navegadores ainda
  // respeitam por cima da CSP moderna, e "DENY" bloquearia sempre, tornando o "frame-ancestors *"
  // do CSP inútil. Só aqui é omitido; todas as outras rotas continuam bloqueadas por omissão.
  if (!pathname?.startsWith('/embed/')) {
    response.headers.set('X-Frame-Options', 'DENY')
  }
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Microfone só é permitido em /analise/nova ("Perguntar por voz") — em todas as outras páginas
  // continua bloqueado. Sem "self" aqui, o Permissions-Policy nega o microfone ao próprio
  // documento antes de sequer chegar à permissão do browser (é isto que dá "not-allowed" mesmo
  // com a permissão do site e do sistema operativo correctas).
  const microfonePermitido = pathname === '/analise/nova'
  response.headers.set(
    'Permissions-Policy',
    `camera=(), microphone=(${microfonePermitido ? 'self' : ''}), geolocation=()`
  )
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
    return applySecurityHeaders(preflight, pathname, isApiRoute)
  }

  const response = NextResponse.next()

  if (isApiRoute && origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Vary', 'Origin')
  }

  return applySecurityHeaders(response, pathname, isApiRoute)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)'],
}
