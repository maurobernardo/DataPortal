'use client'

import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'

/** Alterna `publico` (coluna já existente em `analises`) e copia o link actual para a área de
 *  transferência quando activa — partilhado entre a página de detalhe e o dashboard.
 *  `variante="clara"` é para usar sobre o hero verde-escuro, onde as cores por omissão
 *  (pensadas para fundo branco) ficariam sem contraste. */
export function PartilharBotao({
  analiseId,
  publicoInicial,
  variante = 'padrao',
}: {
  analiseId: string
  publicoInicial: boolean
  variante?: 'padrao' | 'clara'
}) {
  const [publico, setPublico] = useState(publicoInicial)
  const [aAlterar, setAAlterar] = useState(false)
  const [copiado, setCopiado] = useState(false)

  async function alternar() {
    setAAlterar(true)
    try {
      const resposta = await fetch(`/api/analise/${analiseId}/partilhar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publico: !publico }),
      })
      if (resposta.ok) {
        const dados = await resposta.json()
        setPublico(dados.publico)
        if (dados.publico && typeof window !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(window.location.href).catch(() => {})
          setCopiado(true)
          setTimeout(() => setCopiado(false), 2000)
        }
      }
    } finally {
      setAAlterar(false)
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={aAlterar}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-60 print:hidden ${
        variante === 'clara'
          ? publico
            ? 'border-white/40 bg-white/20 text-white'
            : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
          : publico
            ? 'border-[#064E2C] bg-[#F1F8F4] text-[#064E2C]'
            : 'border-[#E2E8E5] text-[var(--pd-ink-700)] hover:border-[#CFE3D6]'
      }`}
    >
      {copiado ? <Check className="size-3.5" aria-hidden /> : <Share2 className="size-3.5" aria-hidden />}
      {copiado ? 'Link copiado' : publico ? 'Link público activo' : 'Partilhar'}
    </button>
  )
}
