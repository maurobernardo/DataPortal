'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, Database, FileText, BarChart3, Map, MapPinned, Home, LogIn, UserPlus } from 'lucide-react'
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
    const mq = window.matchMedia('(max-width: 1240px)')
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
    { href: '/dashboards-alfanumericos', label: 'Dashboards', compactLabel: 'Dash.', icon: BarChart3 },
    { href: '/maps', label: 'Mapas Inteligentes', compactLabel: 'Mapas', icon: MapPinned },
    { href: '/relatorios', label: 'Relatórios', compactLabel: 'Relat.', icon: FileText },
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
              {navLinks.slice(0, 3).map(renderNavLink)}
              <Link href="/ai-insights" className="pd-nav-link-ai notranslate" title="AI Insights">
                AI
                <span className="pd-pill-new">NEW</span>
              </Link>
              {navLinks.slice(3).map(renderNavLink)}
            </div>
            <div className="pd-nav-actions" aria-label="Acções">
              <LanguageSwitcher compact={compactNav} />
              {sessionUser ? (
                <NavUserMenu
                  name={sessionUser.name}
                  email={sessionUser.email}
                  initials={sessionUser.initials}
                  role={sessionUser.role}
                  compact={compactNav}
                />
              ) : (
                <div className="pd-nav-auth">
                  <Link href="/login" className="pd-nav-auth-link" title="Entrar">
                    <LogIn size={15} strokeWidth={2} aria-hidden />
                    <span>Entrar</span>
                  </Link>
                  <Link href="/registo" className="pd-nav-auth-register" title="Criar conta">
                    <UserPlus size={15} strokeWidth={2} aria-hidden />
                    <span>Registar</span>
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
          {navLinks.slice(0, 3).map(({ href, label, icon: Icon }) => {
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
          {navLinks.slice(3).map(({ href, label, icon: Icon }) => {
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
