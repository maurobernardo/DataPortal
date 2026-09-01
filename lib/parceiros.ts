/**
 * Os parceiros do portal, num sítio só.
 *
 * A mesma lista estava copiada em `PartnersCarouselSection` e em `app/parceiros/page.tsx`, com as
 * duas cópias já a divergir (o carrossel tem sete logótipos que a página não tem). Agora que a
 * exportação de relatórios também precisa dela, três cópias seria garantir que ficam três listas
 * diferentes.
 *
 * Sobre os rótulos: são os que já estavam no código, tal e qual. Vários são abreviaturas ou
 * palavras soltas ("We", "Fly", "Move") que não identificam a organização, e a tentação é escrever
 * ali o nome oficial. Não o fiz de propósito: inventar o nome de uma organização real num
 * documento que vai ser distribuído com o nosso rodapé é fabricar um facto. Quem souber os nomes
 * corrige-os aqui, uma vez, e ficam corrigidos em todo o lado.
 */

export type Parceiro = {
  /** Identificador estável, usado em URLs e em armazenamento local. */
  slug: string
  rotulo: string
  logo: string
}

export const PARCEIROS: Parceiro[] = [
  { slug: 'angola', rotulo: 'Angola', logo: '/images/parceiros/angola.png' },
  { slug: 'african', rotulo: 'African', logo: '/images/parceiros/african.png' },
  { slug: 'governo', rotulo: 'Governo', logo: '/images/parceiros/governo.png' },
  { slug: 'angolagoverno', rotulo: 'Governo de Angola', logo: '/images/parceiros/angolagoverno.png' },
  { slug: 'dorcas', rotulo: 'Dorcas', logo: '/images/parceiros/dorcas.png' },
  { slug: 'cae', rotulo: 'CAE', logo: '/images/parceiros/cae.png' },
  { slug: 'ripple', rotulo: 'Ripple', logo: '/images/parceiros/ripple.png' },
  { slug: 'women', rotulo: 'Women', logo: '/images/parceiros/women.png' },
  { slug: 'digital', rotulo: 'Digital', logo: '/images/parceiros/digital.png' },
  { slug: 'd4d', rotulo: 'D4D', logo: '/images/parceiros/d4d.png' },
  { slug: 'data4angola', rotulo: 'Data4Angola', logo: '/images/parceiros/data4angola.png' },
  { slug: 'ghg', rotulo: 'GHG', logo: '/images/parceiros/ghg.png' },
  { slug: 'esri', rotulo: 'Esri', logo: '/images/parceiros/esri.png' },
  { slug: 'move', rotulo: 'Move', logo: '/images/parceiros/move.png' },
  { slug: 'we', rotulo: 'We', logo: '/images/parceiros/we.png' },
  { slug: 'remo', rotulo: 'Remo', logo: '/images/parceiros/remo.png' },
  { slug: 'itc', rotulo: 'ITC', logo: '/images/parceiros/itc.png' },
  { slug: 'fly', rotulo: 'Fly', logo: '/images/parceiros/fly.png' },
  { slug: 'aero', rotulo: 'Aero', logo: '/images/parceiros/aero.png' },
  { slug: 'harvest', rotulo: 'Harvest', logo: '/images/parceiros/harvest.png' },
  { slug: 'ilg', rotulo: 'ILG', logo: '/images/parceiros/ilg.png' },
  { slug: 'undp', rotulo: 'UNDP', logo: '/images/parceiros/undp.jpeg' },
  { slug: 'usaid', rotulo: 'USAID', logo: '/images/parceiros/usaid.png' },
]

export function parceiroPorSlug(slug?: string | null): Parceiro | null {
  if (!slug) return null
  return PARCEIROS.find((p) => p.slug === slug) ?? null
}

/** Onde a escolha fica guardada entre visitas. Quem prepara relatórios fá-lo para o mesmo parceiro. */
export const CHAVE_PARCEIRO = 'dataportal:parceiro-do-relatorio'
