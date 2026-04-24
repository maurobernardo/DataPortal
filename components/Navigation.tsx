'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Home, FolderOpen, Settings, Menu, X, Mail, Database, FileText } from 'lucide-react'
import Image from 'next/image'

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-white/95 shadow-sm md:bg-transparent md:shadow-none'
      }`}
    >
      <div className="container mx-auto px-4 py-1 md:py-2">
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center text-xl md:text-2xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent hover:from-green-400 hover:to-green-500 transition"
          >
            <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
              <Image 
                src="/images/logo.png"
                alt="Data Portal Logo" 
                width={56}
                height={56}
                className="w-10 h-10 md:w-12 md:h-12 object-contain"
              />
            </div>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex gap-4 lg:gap-6 items-center">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-700 hover:text-green-600 font-medium transition relative group text-sm lg:text-base"
            >
              <Home className="w-4 h-4" />
              <span>Início</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/dados-espaciais"
              className="flex items-center gap-2 text-gray-700 hover:text-green-600 font-medium transition relative group text-sm lg:text-base"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Dados Geoespaciais</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/dados-alfanumericos"
              className="flex items-center gap-2 text-gray-700 hover:text-green-600 font-medium transition relative group text-sm lg:text-base"
            >
              <Database className="w-4 h-4" />
              <span>Dados Alfanumericos</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/relatorios"
              className="flex items-center gap-2 text-gray-700 hover:text-green-600 font-medium transition relative group text-sm lg:text-base"
            >
              <FileText className="w-4 h-4" />
              <span>Relatórios</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/dados-espaciais"
              onClick={(e) => {
                e.preventDefault()
                window.location.href = '/#contato'
              }}
              className="flex items-center gap-2 text-gray-700 hover:text-green-600 font-medium transition relative group text-sm lg:text-base cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Conctato</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-400 hover:to-green-500 transition shadow-lg hover:shadow-xl text-sm lg:text-base"
            >
              <Settings className="w-4 h-4" />
              <span>Admin</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:text-green-600 transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 animate-slide-up">
            <div className="flex flex-col gap-3 pt-4">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-gray-700 hover:text-green-600 font-medium transition py-2 px-2 rounded-lg hover:bg-gray-50"
              >
                <Home className="w-5 h-5" />
                <span>Início</span>
              </Link>
              <Link
                href="/dados-espaciais"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-gray-700 hover:text-green-600 font-medium transition py-2 px-2 rounded-lg hover:bg-gray-50"
              >
                <FolderOpen className="w-5 h-5" />
                <span>Dados Geoespaciais</span>
              </Link>
              <Link
                href="/dados-alfanumericos"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-gray-700 hover:text-green-600 font-medium transition py-2 px-2 rounded-lg hover:bg-gray-50"
              >
                <Database className="w-5 h-5" />
                <span>Dados Alfanumericos</span>
              </Link>
              <Link
                href="/relatorios"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-gray-700 hover:text-green-600 font-medium transition py-2 px-2 rounded-lg hover:bg-gray-50"
              >
                <FileText className="w-5 h-5" />
                <span>Relatórios</span>
              </Link>
              <Link
                href="/dados-espaciais"
                onClick={(e) => {
                  e.preventDefault()
                  window.location.href = '/#contato'
                  setMobileMenuOpen(false)
                }}
                className="flex items-center gap-2 text-gray-700 hover:text-green-500 font-medium transition py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <Mail className="w-5 h-5" />
                <span>Conctato</span>
              </Link>
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-400 hover:to-green-500 transition shadow-lg mt-2"
              >
                <Settings className="w-5 h-5" />
                <span>Admin</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
