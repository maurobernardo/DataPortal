'use client'

import { useEffect, useRef, useState } from 'react'
import { Building2, Check, ChevronDown } from 'lucide-react'
import { CHAVE_PARCEIRO, PARCEIROS, parceiroPorSlug, type Parceiro } from '@/lib/parceiros'

/**
 * Para quem este relatório vai ser preparado.
 *
 * Um doador ou um ministério não distribui internamente um documento com a marca de outra pessoa
 * no topo, e era isso que o PDF obrigava: saía Data4Moz e mais nada. Escolher aqui o parceiro põe
 * o logótipo dele no cabeçalho, e a escolha viaja para o PDF e para o HTML sem mais nada, porque
 * as duas exportações capturam este mesmo bloco.
 *
 * O que NÃO muda é o selo de autoria nem o rodapé de fontes. A frase é "preparado para", nunca
 * "por": o parceiro é o destinatário do trabalho, e escrever o contrário seria atribuir-lhe uma
 * análise que ele não fez e uma responsabilidade por números que não verificou.
 *
 * A escolha fica no browser de quem prepara, e não na análise: duas pessoas podem exportar a mesma
 * análise para dois parceiros diferentes no mesmo dia, e nenhuma delas está a alterar o trabalho.
 */
export function SelectorParceiro({
  parceiro,
  onEscolher,
}: {
  parceiro: Parceiro | null
  onEscolher: (p: Parceiro | null) => void
}) {
  const [aberto, setAberto] = useState(false)
  const caixaRef = useRef<HTMLDivElement>(null)

  // Restaura a última escolha. Em janela privada ou com dados de site bloqueados o acesso lança,
  // e o selector tem de continuar a funcionar: sem marca é um estado válido, não uma avaria.
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CHAVE_PARCEIRO)
      const p = parceiroPorSlug(guardado)
      if (p) onEscolher(p)
    } catch {
      /* sem armazenamento: fica sem marca, que é o estado por omissão */
    }
    // Só à entrada: a seguir manda a escolha do utilizador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!aberto) return
    function foraDaCaixa(e: MouseEvent) {
      if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) setAberto(false)
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', foraDaCaixa)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', foraDaCaixa)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  function escolher(p: Parceiro | null) {
    onEscolher(p)
    setAberto(false)
    try {
      if (p) window.localStorage.setItem(CHAVE_PARCEIRO, p.slug)
      else window.localStorage.removeItem(CHAVE_PARCEIRO)
    } catch {
      /* a escolha vale para esta sessão na mesma */
    }
  }

  return (
    <div className="relative print:hidden" ref={caixaRef}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="listbox"
        className="pdx-btn"
        title="Preparar este relatório com a marca de um parceiro"
      >
        <Building2 className="size-3.5" aria-hidden />
        {parceiro ? parceiro.rotulo : 'Marca'}
        <ChevronDown className="size-3" aria-hidden />
      </button>

      {aberto && (
        <div className="pd-popover-in pdx-popover pdx-popover-lista" role="listbox" aria-label="Parceiro do relatório">
          <button type="button" role="option" aria-selected={!parceiro} onClick={() => escolher(null)}>
            <span className="pdx-parceiro-vazio" aria-hidden />
            Sem marca de parceiro
            {!parceiro && <Check className="size-3.5 ml-auto" aria-hidden />}
          </button>
          {PARCEIROS.map((p) => (
            <button
              key={p.slug}
              type="button"
              role="option"
              aria-selected={parceiro?.slug === p.slug}
              onClick={() => escolher(p)}
            >
              {/* <img> e não next/image: este logótipo tem de estar desenhado no DOM no momento em
                  que o html2canvas captura, e o srcset do next/image pode resolver para um
                  ficheiro ainda não carregado. Mesma razão do logótipo do portal no cabeçalho. */}
              <img src={p.logo} alt="" width={22} height={22} />
              {p.rotulo}
              {parceiro?.slug === p.slug && <Check className="size-3.5 ml-auto" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
