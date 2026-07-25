'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, LayoutDashboard } from 'lucide-react'

type NavUserMenuProps = {
  name: string
  email: string
  initials: string
  role?: 'user' | 'admin'
  compact?: boolean
}

export function NavUserMenu({ name, email, initials, role, compact }: NavUserMenuProps) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <div className="pd-nav-user">
      <div className="pd-nav-user-avatar" title={`${name} (${email})`} aria-label={`Sessão: ${name}`}>
        {initials}
      </div>
      {!compact && (
        <div className="pd-nav-user-meta">
          <span className="pd-nav-user-name">{name}</span>
          <span className="pd-nav-user-email">{email}</span>
        </div>
      )}
      {role === 'admin' && (
        <Link href="/dashboard" className="pd-nav-user-admin" title="Painel admin">
          <LayoutDashboard size={15} strokeWidth={2} />
        </Link>
      )}
      <button
        type="button"
        className="pd-nav-user-logout"
        onClick={handleLogout}
        title="Terminar sessão"
        aria-label="Terminar sessão"
      >
        <LogOut size={15} strokeWidth={2} />
      </button>
    </div>
  )
}
