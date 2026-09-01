'use client'

import { useState } from 'react'
import { Languages, Loader2 } from 'lucide-react'

/**
 * Troca o relatório entre português e inglês.
 *
 * A primeira vez custa uma chamada ao modelo e alguns segundos; a partir daí a versão fica guardada
 * e a troca é imediata. O botão diz qual das duas coisas vai acontecer, porque um botão que às
 * vezes responde num instante e às vezes leva dez segundos, sem avisar qual vai ser, parece
 * avariado nas vezes lentas.
 *
 * Quando a tradução é recusada por ter alterado números, o erro aparece aqui e o relatório fica em
 * português. É o comportamento certo: uma versão inglesa com números diferentes dos portugueses
 * seria indetectável para quem só lê uma das duas.
 */
export function SelectorIdioma({
  analiseId,
  idioma,
  onMudar,
  temTraducao,
}: {
  analiseId: string
  idioma: 'pt' | 'en'
  onMudar: (idioma: 'pt' | 'en', traducao?: any) => void
  /** Já guardada: a troca é instantânea e o rótulo não deve prometer espera. */
  temTraducao: boolean
}) {
  const [aTraduzir, setATraduzir] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function paraIngles() {
    if (temTraducao) {
      onMudar('en')
      return
    }
    setATraduzir(true)
    setErro(null)
    try {
      const r = await fetch(`/api/analise/${analiseId}/traduzir`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível traduzir')
      onMudar('en', d.traducao)
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível traduzir')
    } finally {
      setATraduzir(false)
    }
  }

  return (
    <div className="relative print:hidden">
      <div className="pdx-abas" role="group" aria-label="Idioma do relatório">
        <button type="button" aria-pressed={idioma === 'pt'} onClick={() => onMudar('pt')}>
          PT
        </button>
        <button type="button" aria-pressed={idioma === 'en'} onClick={paraIngles} disabled={aTraduzir}>
          {aTraduzir ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Languages className="size-3" aria-hidden />}
          EN
        </button>
      </div>
      {aTraduzir && !temTraducao && (
        <p className="pdx-nota mt-1">A traduzir pela primeira vez, demora alguns segundos.</p>
      )}
      {erro && <p className="pdx-nota pdx-nota-erro mt-1 max-w-64">{erro}</p>}
    </div>
  )
}
