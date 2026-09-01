import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

/** Selo destacado nos catálogos (Geoespacial e Alfanumérico): quem consulta dados directamente
 *  aqui é exactamente quem mais precisa de saber como esses dados foram recolhidos, por isso o
 *  selo fica no topo da própria página de catálogo, não escondido no rodapé nem a competir com o
 *  cabeçalho principal do site. */
export function EticaBadgeCatalogo() {
  return (
    <Link href="/abordagem-etica" className="pd-hero-ethics-badge geo-ch-ethics-badge">
      <ShieldCheck className="w-4 h-4" aria-hidden />
      Quer saber como recolhemos os dados? Clique aqui
    </Link>
  )
}
