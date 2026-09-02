'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, Database, FileText, Map, MapPinned, Home, LogIn, UserPlus, LayoutGrid, ShieldCheck, PlusCircle, ArrowRight, Video } from 'lucide-react'
import Image from 'next/image'
import { NavUserMenu } from '@/components/NavUserMenu'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

type SessionUser = {
  id: number
  name: string
  email: string
  role: 'user' | 'admin'
  initials: string
}

function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Navigation() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [compactNav, setCompactNav] = useState(false)
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // O cabeçalho completo (logo + 7 links incluindo "Ruas 360°" + AI + idioma + Entrar) precisa
    // de mais espaço do que quando só havia 6 links. Este limiar acompanha `.pd-nav-inner` (ver
    // globals.css): tentar um valor colado à medida exacta do conteúdo (sem folga) partiu ao
    // primeiro browser/zoom com métricas de fonte ligeiramente diferentes das medidas — por isso
    // 1460px, não o mínimo teórico, para sobrar sempre alguma margem real.
    const mq = window.matchMedia('(max-width: 1460px)')
    const update = () => setCompactNav(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    let alive = true
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return
        setSessionUser(data.user || null)
      })
      .catch(() => {
        if (!alive) return
        setSessionUser(null)
      })
    return () => {
      alive = false
    }
  }, [pathname])

  const renderNavLink = ({
    href,
    label,
    compactLabel,
    icon: Icon,
  }: {
    href: string
    label: string
    compactLabel: string
    icon: typeof Home
  }) => {
    const active = isNavLinkActive(pathname, href)
    const displayLabel = compactNav ? compactLabel : label
    return (
      <Link
        key={href}
        href={href}
        className={`pd-nav-link${active ? ' active' : ''}${href === '/maps' ? ' pd-nav-link--maps' : ''}`}
        aria-current={active ? 'page' : undefined}
        title={label}
      >
        {!compactNav ? <Icon size={15} strokeWidth={2} aria-hidden /> : null}
        <span className="pd-nav-link-label">{displayLabel}</span>
      </Link>
    )
  }

  const navLinks = [
    { href: '/', label: 'Início', compactLabel: 'Início', icon: Home },
    { href: '/dados-espaciais', label: 'Geoespaciais', compactLabel: 'Geo', icon: Map },
    { href: '/dados-alfanumericos', label: 'Alfanuméricos', compactLabel: 'Alfanum.', icon: Database },
    { href: '/maps', label: 'Mapas Inteligentes', compactLabel: 'Mapas', icon: MapPinned },
    { href: '/ruas-360', label: 'Ruas 360°', compactLabel: 'Ruas 360°', icon: Video },
    { href: '/relatorios', label: 'Relatórios', compactLabel: 'Relat.', icon: FileText },
    { href: '/servicos', label: 'Serviços', compactLabel: 'Serviços', icon: LayoutGrid },
  ]

  return (
    <>
      <nav className={`pd-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="pd-nav-inner">
          <Link href="/" className="pd-logo">
            <Image
              src="/images/logo.png"
              alt="Logo do Portal de Dados"
              width={36}
              height={36}
              className="pd-logo-mark"
            />
            <div className="pd-logo-text">
              Portal de Dados
              <small>Plataforma Nacional</small>
            </div>
          </Link>

          <div className="pd-nav-right">
            <div className="pd-nav-links">
              {navLinks.map(renderNavLink)}
              <div className="pd-nav-ai-wrap">
                <Link href="/ai-insights" className="pd-nav-link-ai notranslate">
                  AI Insights
                  <span className="pd-pill-new">NEW</span>
                </Link>
                <div className="pd-nav-ai-dropdown" role="menu">
                  <div className="pd-nav-ai-dropdown-eyebrow">Ferramentas de IA Insights</div>
                  <Link href="/analise/nova" className="pd-nav-ai-dropdown-link" role="menuitem">
                    <span className="pd-nav-ai-dropdown-icon">
                      <PlusCircle className="size-4" aria-hidden />
                    </span>
                    <span className="pd-nav-ai-dropdown-text">
                      <span className="pd-nav-ai-dropdown-title">Nova Análise</span>
                      <span className="pd-nav-ai-dropdown-desc">Faça uma pergunta sobre os dados</span>
                    </span>
                    <ArrowRight className="size-4 pd-nav-ai-dropdown-arrow" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
            <div className="pd-nav-actions" aria-label="Acções">
              {/* O botão de pesquisa saiu do cabeçalho para lhe dar mais espaço (com 7 links de
                  navegação já não sobrava folga nenhuma); o atalho ⌘K/Ctrl+K continua a abrir a
                  pesquisa na mesma, ouvido directamente em CommandPalette.tsx, sem depender deste
                  botão. */}
              {/* Sempre compacto no cabeçalho (só ícone / só iniciais): o nome, email e idioma por
                  extenso continuam visíveis no painel que abre ao clicar — o cabeçalho não precisa
                  de repetir essa informação, só de dar acesso a ela. */}
              <LanguageSwitcher compact />
              {sessionUser ? (
                <NavUserMenu
                  name={sessionUser.name}
                  email={sessionUser.email}
                  initials={sessionUser.initials}
                  role={sessionUser.role}
                  compact
                />
              ) : (
                <div className="pd-nav-auth">
                  <Link href="/login" className="pd-nav-auth-link" title="Entrar">
                    <LogIn size={15} strokeWidth={2} aria-hidden />
                    <span>Entrar</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="pd-mobile-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir ou fechar menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <div className={`pd-mobile-menu${mobileMenuOpen ? ' open' : ''}`}>
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = isNavLinkActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={`pd-mobile-link${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </Link>
            )
          })}
          <Link
            href="/ai-insights"
            className="pd-mobile-link-ai"
            onClick={() => setMobileMenuOpen(false)}
          >
            AI Insights
            <span className="pd-pill-new">NEW</span>
          </Link>
          <Link
            href="/abordagem-etica"
            className="pd-mobile-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <ShieldCheck size={18} strokeWidth={2} />
            Abordagem ética de dados
          </Link>

          <div className="pd-mobile-divider" />

          <div className="px-1 mb-2">
            <LanguageSwitcher />
          </div>

          <div className="pd-mobile-cta">
            {sessionUser ? (
              <div className="px-1">
                <NavUserMenu
                  name={sessionUser.name}
                  email={sessionUser.email}
                  initials={sessionUser.initials}
                  role={sessionUser.role}
                />
                {sessionUser.role === 'admin' && (
                  <Link
                    href="/dashboard"
                    className="pd-mobile-btn-outline w-full mt-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Painel admin
                  </Link>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="pd-mobile-btn-outline w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LogIn size={18} strokeWidth={2} />
                  Entrar
                </Link>
                <Link
                  href="/registo"
                  className="pd-mobile-btn-primary w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserPlus size={18} strokeWidth={2} />
                  Registar
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
