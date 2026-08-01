import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ConditionalNavigation } from '@/components/ConditionalNavigation'
import { ConditionalFooter } from '@/components/ConditionalFooter'
import { TermsConsentModal } from '@/components/TermsConsentModal'
import { ContactModalProvider } from '@/components/ContactModalProvider'
import { ContactFloatingButton } from '@/components/ContactFloatingButton'
import { GoogleTranslate } from '@/components/GoogleTranslate'
import React from 'react'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

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
    <html lang="pt-BR" className={inter.variable}>
      <body
        className={`${inter.className} bg-gradient-to-br from-slate-50 via-green-50 to-yellow-50/30 min-h-screen antialiased`}
      >
        <ContactModalProvider>
          <GoogleTranslate />
          <ConditionalNavigation />
          <TermsConsentModal />
          <main className="min-h-screen overflow-x-clip">
            {children}
          </main>
          <ConditionalFooter />
          <ContactFloatingButton />
        </ContactModalProvider>
      </body>
    </html>
  )
}
