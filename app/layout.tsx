import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import './globals.css'
import { ConditionalNavigation } from '@/components/ConditionalNavigation'
import { ConditionalFooter } from '@/components/ConditionalFooter'
import { TermsConsentModal } from '@/components/TermsConsentModal'
import { NotificationsConsentModal } from '@/components/NotificationsConsentModal'
import { ContactModalProvider } from '@/components/ContactModalProvider'
import { ChatbotAjuda } from '@/components/ChatbotAjuda'
import { FeedbackBetaButton } from '@/components/FeedbackBetaButton'
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

// Fixo, propositadamente, em vez de getSiteUrl(): muitas páginas legais/institucionais (Termos,
// Privacidade, Cookies, Abordagem Ética...) são pré-geradas como HTML estático durante `next
// build`, e nesse caso este módulo só corre UMA VEZ, na máquina onde o build foi feito — nunca no
// servidor de produção. Ligado a getSiteUrl() (que lê NEXTAUTH_URL), isto congelava
// metadataBase/JSON-LD com o valor de localhost do .env.local de desenvolvimento local nessas
// páginas estáticas (mesma classe de bug do robots.txt/sitemap.xml, resolvida ali com
// `force-dynamic` — aqui não se aplica, porque tornaria TODAS as páginas dinâmicas). Este site só
// tem um domínio de produção, por isso fixar directamente elimina o problema por completo.
const siteUrl = 'https://dataportal.co.mz'
const tituloBase = 'Data Portal Moçambique'
const descricaoBase =
  'Data Portal: o portal de dados abertos de Moçambique da Data4Moz. Catálogo de dados geoespaciais e alfanuméricos oficiais, mapas interactivos, dashboards e análise com IA sobre indicadores de Moçambique.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${tituloBase} - Dados Abertos e Geoespaciais`,
    template: `%s | ${tituloBase}`,
  },
  description: descricaoBase,
  keywords: [
    'data portal',
    'data portal moçambique',
    'portal de dados',
    'portal de dados moçambique',
    'dados abertos moçambique',
    'dados geoespaciais moçambique',
    'data4moz',
    'catálogo de dados',
    'mapas moçambique',
    'indicadores moçambique',
  ],
  authors: [{ name: 'Data4Moz' }],
  icons: {
    icon: '/images/logo.png',
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: 'website',
    locale: 'pt_MZ',
    url: siteUrl,
    siteName: tituloBase,
    title: `${tituloBase} - Dados Abertos e Geoespaciais`,
    description: descricaoBase,
    images: [{ url: '/images/logo.png', width: 512, height: 512, alt: 'Data Portal Moçambique' }],
  },
  twitter: {
    card: 'summary',
    title: `${tituloBase} - Dados Abertos e Geoespaciais`,
    description: descricaoBase,
    images: ['/images/logo.png'],
  },
}

// Ajuda o Google a ligar "Data Portal Moçambique" / "portal de dados Moçambique" a esta entidade
// específica, em vez de depender só do texto da página — sem isto, uma pesquisa pelo nome genérico
// não tem sinal nenhum para preferir este site a outros "data portal" no mundo.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organizacao`,
      name: 'Data4Moz',
      url: siteUrl,
      logo: `${siteUrl}/images/logo.png`,
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: tituloBase,
      alternateName: ['Data Portal', 'Portal de Dados Moçambique'],
      description: descricaoBase,
      publisher: { '@id': `${siteUrl}/#organizacao` },
      inLanguage: 'pt-MZ',
    },
  ],
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
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ContactModalProvider>
          <GoogleTranslate />
          <ConditionalNavigation />
          <TermsConsentModal />
          <NotificationsConsentModal />
          <main className="min-h-screen overflow-x-clip">
            {children}
          </main>
          <ConditionalFooter />
          <ChatbotAjuda />
          <FeedbackBetaButton />
          <CommandPalette />
        </ContactModalProvider>
      </body>
    </html>
  )
}
