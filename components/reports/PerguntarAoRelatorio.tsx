'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Lock, MessageCircleQuestion, Send } from 'lucide-react'

/**
 * A alternativa a ler o documento inteiro: perguntar-lhe directamente.
 *
 * A resposta diz sempre em que página do relatório está, e diz claramente quando não encontrou
 * nada, em vez de compor uma resposta plausível a partir do título e do tema geral do relatório.
 *
 * Exige sessão iniciada, porque cada pergunta tem um custo real. O gate fica visível ANTES de a
 * pessoa escrever, com o campo desactivado: deixar escrever e só recusar ao enviar (o que a API já
 * faz, com 401) seria pior experiência para o mesmo resultado.
 */
export function PerguntarAoRelatorio({ reportId, autenticado }: { reportId: number; autenticado: boolean }) {
  const [pergunta, setPergunta] = useState('')
  const [historico, setHistorico] = useState<
    { pergunta: string; resposta: string; paginas: number[]; encontrado: boolean }[]
  >([])
  const [aPerguntar, setAPerguntar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function perguntar() {
    const texto = pergunta.trim()
    if (!texto) return
    setAPerguntar(true)
    setErro(null)
    try {
      const r = await fetch(`/api/reports/${reportId}/perguntar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: texto }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível responder')
      setHistorico((prev) => [
        ...prev,
        { pergunta: texto, resposta: d.resposta, paginas: d.paginas_citadas || [], encontrado: d.encontrado },
      ])
      setPergunta('')
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível responder')
    } finally {
      setAPerguntar(false)
    }
  }

  if (!autenticado) {
    return (
      <div className="rpt-detail-hero">
        <div className="rpt-detail-body rpt-digesto-bloqueado">
          <Lock className="size-5" aria-hidden />
          <div>
            <h2>Fazer uma pergunta a este relatório</h2>
            <p className="rpt-detail-text">
              Em vez de ler o documento todo, pode perguntar directamente o que precisa de saber.
              Inicie sessão gratuitamente para experimentar.
            </p>
            <Link href={`/login?next=/relatorios/${reportId}%23analise`} className="rpt-btn rpt-btn-primary">
              Iniciar sessão
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rpt-detail-hero">
      <div className="rpt-detail-body">
        <h2 className="rpt-digesto-titulo">
          <MessageCircleQuestion className="size-4" aria-hidden />
          Fazer uma pergunta a este relatório
        </h2>

        {historico.length > 0 && (
          <ul className="rpt-pergunta-historico">
            {historico.map((h, i) => (
              <li key={i}>
                <p className="rpt-pergunta-texto">{h.pergunta}</p>
                <p className="rpt-pergunta-resposta">
                  {h.resposta}
                  {h.encontrado && h.paginas.length > 0 && (
                    <span className="rpt-digesto-pagina">
                      {' '}
                      {h.paginas.map((p) => `página ${p}`).join(', ')}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="rpt-pergunta-caixa">
          <input
            type="text"
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && perguntar()}
            placeholder="Ex.: quais são as principais recomendações?"
            aria-label="Pergunta ao relatório"
            className="rpt-pergunta-input"
          />
          <button type="button" onClick={perguntar} disabled={aPerguntar || !pergunta.trim()} className="rpt-btn rpt-btn-primary">
            {aPerguntar ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          </button>
        </div>
        {erro && <p className="rpt-digesto-erro">{erro}</p>}
      </div>
    </div>
  )
}
