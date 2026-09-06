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

/**
 * Redireciona para HTTPS quando o proxy à frente da aplicação (comum em hosting partilhado tipo
 * cPanel, onde o Node corre atrás de um Apache/LiteSpeed que termina o TLS) diz explicitamente que
 * o pedido chegou por HTTP.
 *
 * Só actua quando o cabeçalho `x-forwarded-proto` está mesmo presente e vale `http` — nunca por
 * omissão nem a adivinhar a partir do URL do pedido (`request.url` reflecte sempre o protocolo
 * interno entre o proxy e o Node, que é tipicamente HTTP mesmo para visitas externas em HTTPS, e
 * redireccionar com base nisso criava um ciclo infinito). Se o proxy não reencaminhar este
 * cabeçalho, esta função não faz nada — mais seguro não redireccionar do que redireccionar errado.
 * Nunca em desenvolvimento (não há HTTPS nenhum a correr), e nunca em `/api/*` (chamadas de
 * servidor a servidor, como os crons, não podem ser silenciosamente redireccionadas).
 */
function redirecionarParaHttps(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') return null
  if (request.nextUrl.pathname.startsWith('/api/')) return null
  if (request.headers.get('x-forwarded-proto') !== 'http') return null

  const httpsUrl = request.nextUrl.clone()
  httpsUrl.protocol = 'https:'
  return NextResponse.redirect(httpsUrl, 308)
}

const METODOS_MUTAVEIS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Rotas chamadas por sistemas externos, não pelo browser com sessão por cookie: cron jobs (já
// protegidos pelo próprio CRON_SECRET) e o callback de OAuth, que o browser do utilizador chega a
// visitar via redirect vindo de google.com/linkedin.com (Origin/Referer nunca vai ser o nosso
// próprio domínio nesse caso, mas não é um pedido forjado).
function isentoDeCsrf(pathname: string): boolean {
  return pathname.startsWith('/api/cron/') || pathname.startsWith('/api/auth/oauth/')
}

/**
 * Defesa CSRF por verificação de origem: um pedido que muda estado (POST/PUT/PATCH/DELETE) só é
 * aceite se vier do próprio domínio. Os cookies de sessão já são SameSite=Lax (lib/session.ts),
 * o que já bloqueia o envio automático do cookie em pedidos cross-site na maioria dos browsers
 * modernos — esta verificação é a segunda camada, explícita, que não depende do browser do
 * visitante suportar SameSite correctamente. Não exige um token CSRF novo em cada formulário/
 * fetch do frontend (que arriscava partir chamadas existentes); usa antes o cabeçalho Origin (ou
 * Referer como recurso) que o próprio browser já envia, sem a aplicação poder falsificar.
 */
function bloqueadoPorCsrf(request: NextRequest): boolean {
  if (!METODOS_MUTAVEIS.has(request.method)) return false
  if (isentoDeCsrf(request.nextUrl.pathname)) return false

  const origemEsperada = request.nextUrl.origin
  const origin = request.headers.get('origin')
  if (origin) return origin !== origemEsperada

  const referer = request.headers.get('referer')
  if (referer) return !referer.startsWith(origemEsperada)

  // Nem Origin nem Referer: pedidos same-origin (fetch/formulário) enviam sempre um dos dois para
  // métodos mutáveis nos browsers actuais — a ausência de ambos é mais provável ser um cliente
  // não-browser forjado do que uma visita legítima, por isso bloqueia por omissão.
  return true
}

export function middleware(request: NextRequest) {
  const redirectoHttps = redirecionarParaHttps(request)
  if (redirectoHttps) return redirectoHttps

  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/api/') && bloqueadoPorCsrf(request)) {
    return NextResponse.json({ error: 'Pedido rejeitado: origem inválida.' }, { status: 403 })
  }

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
