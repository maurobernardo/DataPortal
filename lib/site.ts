/**
 * URL pública do site (SEO, sitemap, robots, links em emails).
 *
 * NEXTAUTH_URL primeiro, nunca NEXT_PUBLIC_SITE_URL primeiro: uma variável NEXT_PUBLIC_ fica
 * gravada FIXA no código JS durante `next build`, com o valor que estiver activo na máquina onde o
 * build correu — não é lida em tempo real no servidor. Apanhado ao vivo: o build local tem
 * `.env.local` com `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (para desenvolvimento), e esse
 * valor ficava congelado no `.next` publicado, fazendo o robots.txt em produção apontar o sitemap
 * para localhost — Googlebot nunca encontrava o sitemap. NEXTAUTH_URL não tem o prefixo NEXT_PUBLIC_,
 * por isso É lida em tempo real a partir do .env do próprio servidor, correcta independentemente de
 * onde o build foi feito (mesmo raciocínio já usado em lib/mailer.ts e lib/oauth.ts).
 */
export function getSiteUrl(): string {
  const fromEnv = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL)?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  return 'https://dataportal.co.mz'
}

/** E-mail de contacto / pedidos do portal */
export const PORTAL_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_PORTAL_EMAIL?.trim() || 'portaldedados@data4moz.com'

export function buildMapRequestMailto(map: {
  title: string
  slug: string
  coverage?: string
  description?: string
}) {
  const siteUrl = getSiteUrl()
  const subject = `Pedido de mapa interativo: ${map.title}`
  const body =
    `Olá,\n\n` +
    `Gostaria de solicitar mais informação ou acesso relacionado com o mapa interativo.\n\n` +
    `Mapa: ${map.title}\n` +
    `Identificador: ${map.slug}\n` +
    `${map.coverage ? `Cobertura: ${map.coverage}\n` : ''}` +
    `${map.description ? `\nResumo: ${map.description}\n` : ''}` +
    `\nPágina: ${siteUrl}/maps/${map.slug}\n\n` +
    `Obrigado.`
  return {
    email: PORTAL_CONTACT_EMAIL,
    subject,
    body,
    href: `mailto:${encodeURIComponent(PORTAL_CONTACT_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  }
}
