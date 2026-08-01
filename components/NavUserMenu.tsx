'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, LayoutDashboard, Loader2, LogOut, UserCog } from 'lucide-react'

type NavUserMenuProps = {
  name: string
  email: string
  initials: string
  role?: 'user' | 'admin'
  compact?: boolean
}

export function NavUserMenu({ name, email, initials, role, compact }: NavUserMenuProps) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      // Recarga completa (não navegação client-side): garante que todo o estado
      // de sessão em memória (nav, páginas admin, etc.) é reposto a partir do zero.
      window.location.href = '/'
    }
  }

  return (
    <div className="pd-nav-user" ref={rootRef}>
      <button
        type="button"
        className="pd-nav-user-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${name} (${email})`}
      >
        <span className="pd-nav-user-avatar" aria-hidden="true">
          {initials}
        </span>
        {!compact && (
          <div className="pd-nav-user-meta">
            <span className="pd-nav-user-name">{name}</span>
            <span className="pd-nav-user-email">{email}</span>
          </div>
        )}
        <ChevronDown className={`pd-nav-user-caret${open ? ' open' : ''}`} size={14} strokeWidth={2} />
      </button>

      {open && (
        <div className="pd-nav-user-panel" role="menu">
          <div className="pd-nav-user-panel-header">
            <span className="pd-nav-user-avatar" aria-hidden="true">
              {initials}
            </span>
            <div className="pd-nav-user-meta">
              <span className="pd-nav-user-name">{name}</span>
              <span className="pd-nav-user-email">{email}</span>
            </div>
          </div>
          <Link href="/perfil" className="pd-nav-user-panel-item" role="menuitem" onClick={() => setOpen(false)}>
            <UserCog size={15} strokeWidth={2} />
            Editar perfil
          </Link>
          {role === 'admin' && (
            <Link
              href="/dashboard"
              className="pd-nav-user-panel-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard size={15} strokeWidth={2} />
              Painel admin
            </Link>
          )}
          <button
            type="button"
            className="pd-nav-user-panel-item danger"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <Loader2 size={15} strokeWidth={2} className="animate-spin" />
            ) : (
              <LogOut size={15} strokeWidth={2} />
            )}
            {loggingOut ? 'A terminar sessão...' : 'Terminar sessão'}
          </button>
        </div>
      )}
    </div>
  )
}
