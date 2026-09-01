'use client'

import { useState } from 'react'
import { Check, Code2, Share2 } from 'lucide-react'

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
  const [embedCopiado, setEmbedCopiado] = useState(false)

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

  async function copiarEmbed() {
    if (typeof window === 'undefined' || !navigator.clipboard) return
    const embedUrl = `${window.location.origin}/embed/analise/${analiseId}`
    const snippet = `<iframe src="${embedUrl}" width="100%" height="600" style="border:0" loading="lazy" title="Análise do Data Portal"></iframe>`
    await navigator.clipboard.writeText(snippet).catch(() => {})
    setEmbedCopiado(true)
    setTimeout(() => setEmbedCopiado(false), 2000)
  }

  // A variante "clara" continua a assentar em classes utilitárias porque é usada sobre o
  // cabeçalho verde da página de detalhe, fora do âmbito .pdx do sistema de design.
  const classesBase =
    variante === 'clara'
      ? 'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors border-white/30 bg-white/10 text-white hover:bg-white/20'
      : 'pdx-btn'

  return (
    <div className="inline-flex items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={alternar}
        disabled={aAlterar}
        className={
          variante === 'clara'
            ? `${classesBase} disabled:opacity-60${publico ? ' border-white/40 bg-white/20' : ''}`
            : `pdx-btn${publico ? ' pdx-btn-activo' : ''}`
        }
      >
        {copiado ? <Check className="size-3.5" aria-hidden /> : <Share2 className="size-3.5" aria-hidden />}
        {copiado ? 'Link copiado' : publico ? 'Link público activo' : 'Partilhar'}
      </button>

      {publico && (
        <button
          type="button"
          onClick={copiarEmbed}
          title="Copiar código para incorporar esta análise noutro site"
          className={classesBase}
        >
          {embedCopiado ? <Check className="size-3.5" aria-hidden /> : <Code2 className="size-3.5" aria-hidden />}
          {embedCopiado ? 'Código copiado' : 'Incorporar'}
        </button>
      )}
    </div>
  )
}
