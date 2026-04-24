'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Database,
  FolderTree,
  Home,
  Settings,
  LogOut,
  FolderOpen,
  Mail,
  FileText,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface AdminSidebarProps {
  user: {
    email: string
    name?: string
  }
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const menuItems = [
    {
      icon: BarChart3,
      label: 'Dashboard',
      href: '/dashboard',
      active: pathname === '/dashboard',
    },
    {
      icon: Database,
      label: 'Cadastrar Dados',
      href: '/admin',
      active: pathname === '/admin',
    },
    {
      icon: FolderTree,
      label: 'Categorias',
      href: '/admin',
      active: false,
    },
  ]

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/admin/login')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-16 h-16 flex items-center justify-center">
            <Image 
              src="/images/logo.png"
              alt="Data Portal Logo" 
              width={64} 
              height={64} 
              className="w-14 h-14 object-contain"
            />
          </div>
          <div>
            <div className="font-bold text-gray-800">Data Portal</div>
            <div className="text-xs text-gray-500">Admin Panel</div>
          </div>
        </Link>
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
            Menu
          </div>
          {menuItems.map((item) => {
            const IconComponent = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  item.active
                    ? 'bg-green-50 text-green-600 font-semibold shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <IconComponent className={`w-5 h-5 ${item.active ? 'text-green-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
                <span>{item.label}</span>
                {item.active && (
                  <div className="ml-auto w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                )}
              </Link>
            )
          })}
        </div>

        <div className="mt-8 space-y-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
            Links
          </div>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
          >
            <Home className="w-5 h-5 text-gray-500" />
            <span>Início</span>
          </Link>
          <Link
            href="/dados-espaciais"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
          >
            <FolderOpen className="w-5 h-5 text-gray-500" />
            <span>Dados Geoespaciais</span>
          </Link>
          <Link
            href="/dados-alfanumericos"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
          >
            <Database className="w-5 h-5 text-gray-500" />
            <span>Dados Alfanuméricos</span>
          </Link>
          <Link
            href="/relatorios"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
          >
            <FileText className="w-5 h-5 text-gray-500" />
            <span>Relatórios</span>
          </Link>
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault()
              window.location.href = '/#contato'
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 cursor-pointer"
          >
            <Mail className="w-5 h-5 text-gray-500" />
            <span>Contacto</span>
          </Link>
        </div>
      </div>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
            {user.name?.[0] || user.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">
              {user.name || 'Admin'}
            </div>
            <div className="text-xs text-gray-500 truncate">{user.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )
}

