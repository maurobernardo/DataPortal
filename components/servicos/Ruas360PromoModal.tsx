'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { X, Eye, ArrowRight } from 'lucide-react'

const CHAVE_VISTO = 'pd-promo-ruas360-visto'

/**
 * Pop-up de entrada na página de Serviços, só para chamar atenção para o Mapeamento e
 * Levantamento 360° — é o serviço mais visual do catálogo (dá para "ver" o resultado num visor
 * a sério, ao contrário dos outros, que são todos pedidos por formulário) e por isso o que mais
 * beneficia de um empurrão logo à entrada, em vez de esperar que alguém desça até ao encontrar na
 * grelha. Aparece uma vez por sessão do browser (sessionStorage, não localStorage): reaparecer a
 * cada visita seria cansativo, mas nunca mais aparecer depois da primeira vez esconderia o aviso
 * de quem só voltou a esta página muito mais tarde, já sem se lembrar dela.
 */
export function Ruas360PromoModal() {
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    let visto = false
    try {
      visto = sessionStorage.getItem(CHAVE_VISTO) === '1'
    } catch {
      // Sem sessionStorage (privado/bloqueado): mostra na mesma, só não lembra a próxima vez.
    }
    if (visto) return
    const t = setTimeout(() => setAberto(true), 900)
    return () => clearTimeout(t)
  }, [])

  function fechar() {
    setAberto(false)
    try {
      sessionStorage.setItem(CHAVE_VISTO, '1')
    } catch {}
  }

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[rgba(6,20,13,0.55)] backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ruas360-promo-titulo"
      onClick={fechar}
    >
      <div
        className="relative w-full max-w-[440px] rounded-3xl bg-[#064E2C] text-white shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar"
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-[1] p-7 md:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2C744] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#3B2A05] mb-5">
            Novo no portal
          </span>

          <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/10 border border-white/15 mb-5">
            <Eye className="w-6 h-6 text-[#F2C744]" strokeWidth={2} />
          </div>

          <h2 id="ruas360-promo-titulo" className="text-2xl font-extrabold tracking-tight leading-snug mb-3">
            Explore o nosso serviço de Mapeamento e Levantamento 360°
          </h2>
          <p className="text-[15px] text-[#CFE3D6] leading-relaxed mb-7">
            Ruas de Maputo e Chimoio já captadas em 360°, com sinais de trânsito georreferenciados,
            navegáveis dentro do portal. Sem conta, sem instalar nada.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/ruas-360"
              onClick={fechar}
              // Cor por style, não por classe: a folha da página (".svc a{color:inherit}") tem mais
              // especificidade do que uma classe Tailwind isolada e ganhava-lhe, deixando o texto
              // branco sobre fundo branco, invisível.
              style={{ color: '#064E2C' }}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold hover:bg-[#F1F8F4] transition-colors"
            >
              Explorar o visor
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={fechar}
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
