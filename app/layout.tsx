import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import './globals.css'
import { ConditionalNavigation } from '@/components/ConditionalNavigation'
import { ConditionalFooter } from '@/components/ConditionalFooter'
import { TermsConsentModal } from '@/components/TermsConsentModal'
import { ContactModalProvider } from '@/components/ContactModalProvider'
import { ChatbotAjuda } from '@/components/ChatbotAjuda'
import { GoogleTranslate } from '@/components/GoogleTranslate'
import { CommandPalette } from '@/components/CommandPalette'
import React from 'react'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Serifa editorial usada só nos títulos das análises (AI Insights). Vem por next/font, e não por
// <link> ao Google Fonts, porque a CSP do portal não permite folhas de estilo externas e porque
// assim a fonte é servida do próprio domínio, sem salto de rede antes do primeiro desenho.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
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
    <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable}`}>
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
          <ChatbotAjuda />
          <CommandPalette />
        </ContactModalProvider>
      </body>
    </html>
  )
}
