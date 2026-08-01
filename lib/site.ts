/** URL pública do site (SEO, sitemap, robots). Preferir NEXT_PUBLIC_SITE_URL em produção. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
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
