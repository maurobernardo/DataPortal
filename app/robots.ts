import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'

// Sem isto, o Next gera este ficheiro UMA VEZ durante `next build` (estático), com o valor de
// getSiteUrl() calculado na máquina onde o build correu — nunca no servidor de produção. Como o
// build é sempre feito localmente, onde .env.local tem localhost:3000, o robots.txt publicado
// ficava sempre a apontar o sitemap para localhost, mesmo depois de corrigir getSiteUrl() em si
// (apanhado ao vivo: o robots.txt em produção continuava com localhost mesmo após o deploy da
// correcção). `force-dynamic` obriga a recalcular isto a cada pedido, no servidor real.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/api/'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
