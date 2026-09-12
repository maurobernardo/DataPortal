'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Brain,
  Database,
  DollarSign,
  Globe2,
  Home,
  Settings,
  LogOut,
  FolderOpen,
  Mail,
  MapPinned,
  MessageSquare,
  FileText,
  FileSearch,
  Users,
  ScrollText,
  Lightbulb,
  Trash2,
  ShieldAlert,
  DatabaseBackup,
  FileUp,
  MessageSquareHeart,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface AdminSidebarProps {
  user: {
    email: string
    name?: string
  }
  /** Aba activa em /admin (ex.: 'requests', 'maps') — vem do searchParams da página servidor. */
  activeTab?: string
  /** 'mobile': usado dentro do menu deslizante do DashboardHeader em ecrãs pequenos — perde o
   *  posicionamento fixo e a borda/sombra próprias, que só fazem sentido como coluna fixa de
   *  desktop; a MESMA lista de links é reaproveitada nos dois casos, para nunca haver uma versão
   *  mobile a ficar desactualizada em relação à de desktop (o que já tinha acontecido antes: uma
   *  lista à parte no DashboardHeader, sem "Backups"/"Qualidade dos Dados"/etc. depois de
   *  adicionados aqui). */
  variant?: 'desktop' | 'mobile'
  /** Chamado ao clicar em qualquer link — usado pelo menu mobile para se fechar sozinho. */
  onNavigate?: () => void
}

export function AdminSidebar({ user, activeTab, variant = 'desktop', onNavigate }: AdminSidebarProps) {
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
      active: pathname === '/admin' && !activeTab,
    },
    {
      icon: MessageSquare,
      label: 'Solicitações',
      href: '/admin?tab=requests',
      active: pathname === '/admin' && activeTab === 'requests',
    },
    {
      icon: MapPinned,
      label: 'Mapas Inteligentes',
      href: '/admin?tab=maps',
      active: pathname === '/admin' && activeTab === 'maps',
    },
    {
      icon: Brain,
      label: 'Utilização de IA',
      href: '/dashboard/ia-utilizacao',
      active: pathname === '/dashboard/ia-utilizacao',
    },
    {
      icon: DollarSign,
      label: 'Custos de IA',
      href: '/admin/custos-ia',
      active: pathname === '/admin/custos-ia',
    },
    {
      icon: ShieldAlert,
      label: 'Qualidade dos Dados',
      href: '/admin/qualidade-dados',
      active: pathname === '/admin/qualidade-dados',
    },
    {
      icon: DatabaseBackup,
      label: 'Backups',
      href: '/admin/backups',
      active: pathname === '/admin/backups',
    },
    {
      icon: Lightbulb,
      label: 'Sugestões de Datasets',
      href: '/admin/sugestoes-datasets',
      active: pathname === '/admin/sugestoes-datasets',
    },
    {
      icon: Globe2,
      label: 'Origem dos Utilizadores',
      href: '/admin/origem-utilizadores',
      active: pathname === '/admin/origem-utilizadores',
    },
    {
      icon: Users,
      label: 'Utilizadores',
      href: '/admin/utilizadores',
      active: pathname === '/admin/utilizadores',
    },
    {
      icon: FileSearch,
      label: 'Uso dos Relatórios',
      href: '/admin/relatorios-uso',
      active: pathname === '/admin/relatorios-uso',
    },
    {
      icon: FileUp,
      label: 'Relatórios Enviados',
      href: '/admin/relatorios-utilizadores',
      active: pathname === '/admin/relatorios-utilizadores',
    },
    {
      icon: MessageSquareHeart,
      label: 'Feedback',
      href: '/admin/feedback',
      active: pathname === '/admin/feedback',
    },
    {
      icon: Trash2,
      label: 'Lixeira',
      href: '/admin/lixeira',
      active: pathname === '/admin/lixeira',
    },
    {
      icon: ScrollText,
      label: 'Auditoria',
      href: '/admin/auditoria',
      active: pathname === '/admin/auditoria',
    },
  ]
  const mainLinks = [
    { icon: Home, label: 'Início', href: '/' },
    { icon: FolderOpen, label: 'Geoespaciais', href: '/dados-espaciais' },
    { icon: Database, label: 'Alfanuméricos', href: '/dados-alfanumericos' },
    { icon: BarChart3, label: 'Dashboard', href: '/dashboards-alfanumericos' },
    { icon: MapPinned, label: 'Mapas Inteligentes', href: '/maps' },
    { icon: FileText, label: 'Relatórios', href: '/relatorios' },
  ]

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div
      className={
        variant === 'mobile'
          ? 'w-full h-full flex flex-col'
          : 'w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col shadow-lg'
      }
    >
      {/* Logo — omitido em variant="mobile": o menu deslizante já tem o seu próprio cabeçalho
          com título e botão de fechar, e repetir a marca aqui só duplicava a mesma informação. */}
      {variant === 'desktop' && (
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2">
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
      )}

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
                onClick={onNavigate}
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
          {mainLinks.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              >
                <Icon className="w-5 h-5 text-gray-500" />
                <span>{item.label}</span>
              </Link>
            )
          })}
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault()
              onNavigate?.()
              window.location.href = '/#contato'
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 cursor-pointer"
          >
            <Mail className="w-5 h-5 text-gray-500" />
            <span>Contato</span>
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

