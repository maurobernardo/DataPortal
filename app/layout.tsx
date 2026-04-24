import type { Metadata } from 'next'
import './globals.css'
import { ConditionalNavigation } from '@/components/ConditionalNavigation'
import { ConditionalFooter } from '@/components/ConditionalFooter'
import { TermsConsentModal } from '@/components/TermsConsentModal'
import React from 'react'

export const metadata: Metadata = {
  title: 'Data Portal - Portal de Dados Geoespaciais',
  description: 'Portal para publicação, visualização e download de dados geoespaciais',
  icons: {
    icon: '/images/logo.png',
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gradient-to-br from-slate-50 via-green-50 to-yellow-50/30 min-h-screen">
        <ConditionalNavigation />
        <TermsConsentModal />
        <main className="min-h-screen">
          {children}
        </main>
        <ConditionalFooter />
      </body>
    </html>
  )
}
