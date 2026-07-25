'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, Database, FileText, BarChart3, Map, MapPinned, Home, Sparkles, LogIn, UserPlus } from 'lucide-react'
import Image from 'next/image'
import { NavUserMenu } from '@/components/NavUserMenu'

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
  const [aiInsightsSoonOpen, setAiInsightsSoonOpen] = useState(false)
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

  useEffect(() => {
    if (!aiInsightsSoonOpen) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAiInsightsSoonOpen(false)
    }
    document.addEventListener('keydown', onEsc)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prevOverflow
    }
  }, [aiInsightsSoonOpen])

  const openAiInsightsSoon = () => {
    setMobileMenuOpen(false)
    setAiInsightsSoonOpen(true)
  }

  const navGroups = [
    {
      links: [
        { href: '/', label: 'Início', compactLabel: 'Início', icon: Home },
        { href: '/dados-espaciais', label: 'Geoespaciais', compactLabel: 'Geo', icon: Map },
        { href: '/dados-alfanumericos', label: 'Alfanuméricos', compactLabel: 'Alfanum.', icon: Database },
      ],
    },
    {
      links: [
        { href: '/dashboards-alfanumericos', label: 'Dashboards', compactLabel: 'Dash.', icon: BarChart3 },
        { href: '/maps', label: 'Mapas Inteligentes', compactLabel: 'Mapas', icon: MapPinned },
        { href: '/relatorios', label: 'Relatórios', compactLabel: 'Relat.', icon: FileText },
      ],
    },
  ]

  const navLinks = navGroups.flatMap((g) => g.links)

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
              {navGroups.map((group, gi) => (
                <div key={gi} className="pd-nav-link-group">
                  {group.links.map(({ href, label, compactLabel, icon: Icon }) => {
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
                  })}
                </div>
              ))}
            </div>
            <div className="pd-nav-actions" aria-label="Acções">
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
              <button
                type="button"
                className="pd-nav-link-ai"
                title="AI Insights — em breve"
                onClick={openAiInsightsSoon}
              >
                AI
                <span className="pd-pill-new">NEW</span>
              </button>
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
          <button type="button" className="pd-mobile-link-ai" onClick={openAiInsightsSoon}>
            AI Insights
            <span className="pd-pill-new">NEW</span>
          </button>

          <div className="pd-mobile-divider" />

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

      {aiInsightsSoonOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-insights-soon-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Fechar"
            onClick={() => setAiInsightsSoonOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#6B4FBB] to-[#064E2C] text-white">
              <Sparkles className="size-6" aria-hidden />
            </div>
            <h2 id="ai-insights-soon-title" className="text-xl font-bold text-gray-900 mb-2">
              Em breve
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              O módulo <strong>AI Insights</strong> está em desenvolvimento e será disponibilizado em breve no
              Portal de Dados. Fique atento às novidades.
            </p>
            <button
              type="button"
              className="w-full rounded-xl bg-[#064E2C] px-4 py-3 text-sm font-semibold text-white hover:bg-[#04361F] transition"
              onClick={() => setAiInsightsSoonOpen(false)}
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
