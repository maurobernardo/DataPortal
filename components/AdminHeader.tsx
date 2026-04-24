'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Home, FolderOpen, Database, FileText, Settings, BarChart3, Menu, X, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AdminHeaderProps {
  user?: {
    email: string
    name?: string
  }
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const currentDate = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setMobileMenuOpen(false)
      router.push('/admin/login')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-800 text-base md:text-lg">Cadastrar Dados</div>
                <p className="text-xs text-gray-500 capitalize">{currentDate}</p>
              </div>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">Início</span>
            </Link>
            <Link
              href="/dados-espaciais"
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="text-sm font-medium">Dados Geoespaciais </span>
            </Link>
            <Link
              href="/dados-alfanumericos"
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">Dados Alfanuméricos</span>
            </Link>
            <Link
              href="/relatorios"
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Relatórios</span>
            </Link>
            {user && (
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold ml-2">
                {user.name?.[0] || user.email[0].toUpperCase()}
              </div>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition shadow-lg hover:shadow-xl"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="font-medium">Dashboard</span>
            </Link>
          </div>
          <div className="md:hidden border-t border-gray-100 pt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                >
                  <Home className="w-4 h-4" />
                  <span className="text-sm font-medium">Início</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition shadow-lg"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-medium">Dashboard</span>
                </Link>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {user && (
                  <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {user.name?.[0] || user.email[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition border border-gray-200"
                  aria-label="Abrir menu lateral"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu lateral"
          />
          <aside className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl border-l border-gray-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">Menu Admin</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                <Settings className="w-5 h-5" />
                <span>Cadastrar Dados</span>
              </Link>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                <BarChart3 className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                <Home className="w-5 h-5" />
                <span>Início</span>
              </Link>
              <Link href="/dados-espaciais" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                <FolderOpen className="w-5 h-5" />
                <span>Dados Geoespaciais</span>
              </Link>
              <Link href="/dados-alfanumericos" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                <Database className="w-5 h-5" />
                <span>Dados Alfanuméricos</span>
              </Link>
              <Link href="/relatorios" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                <FileText className="w-5 h-5" />
                <span>Relatórios</span>
              </Link>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200">
              {user && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {user.name?.[0] || user.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{user.name || 'Admin'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

