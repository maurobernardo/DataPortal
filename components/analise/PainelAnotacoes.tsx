'use client'

import { useEffect, useState } from 'react'
import { Loader2, MessageSquarePlus, Trash2 } from 'lucide-react'

/**
 * As notas que uma pessoa escreve sobre a análise.
 *
 * Existe para o dashboard poder ir a uma reunião como está, em vez de sair daqui em print com o
 * contexto escrito num email à parte. Como as exportações capturam o bloco onde este painel vive,
 * uma nota escrita aqui viaja para o PDF e para o HTML sem mais nada.
 *
 * O painel deixa clara a fronteira entre o que o motor mediu e o que uma pessoa escreveu. Fica
 * abaixo dos resultados, tem cabeçalho próprio, e cada nota mostra o autor e a data. Um comentário
 * misturado com os números do motor herdaria a autoridade deles sem ter passado por verificação
 * nenhuma, e é precisamente essa confusão que o portal existe para evitar.
 */

const MAX_CARACTERES = 600

type Anotacao = {
  id: number
  utilizador_id: number
  ancora: string
  texto: string
  autor: string | null
  criado_em: string
}

export function PainelAnotacoes({
  analiseId,
  utilizadorId,
  publico,
}: {
  analiseId: string
  /** Quem está a ver. Só o autor de uma nota vê o botão de apagar. */
  utilizadorId?: number | null
  /** Análise partilhada publicamente: quem escreve tem de saber antes de escrever. */
  publico?: boolean
}) {
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([])
  const [texto, setTexto] = useState('')
  const [aGravar, setAGravar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregou, setCarregou] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch(`/api/analise/${analiseId}/anotacoes`)
      .then((r) => (r.ok ? r.json() : { anotacoes: [] }))
      .then((d) => {
        if (vivo) setAnotacoes(d.anotacoes || [])
      })
      .catch(() => {})
      .finally(() => vivo && setCarregou(true))
    return () => {
      vivo = false
    }
  }, [analiseId])

  async function guardar() {
    const limpo = texto.trim()
    if (!limpo) return
    setAGravar(true)
    setErro(null)
    try {
      const r = await fetch(`/api/analise/${analiseId}/anotacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: limpo, ancora: '' }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível guardar')
      setAnotacoes(d.anotacoes || [])
      setTexto('')
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível guardar')
    } finally {
      setAGravar(false)
    }
  }

  async function apagar(id: number) {
    try {
      const r = await fetch(`/api/analise/${analiseId}/anotacoes?anotacao=${id}`, { method: 'DELETE' })
      const d = await r.json()
      if (r.ok) setAnotacoes(d.anotacoes || [])
    } catch {
      /* mantém a lista como está: uma falha de rede não pode fazer a nota parecer apagada */
    }
  }

  // Enquanto não se sabe se há notas, não se desenha nada: um painel vazio a aparecer e a
  // desaparecer meio segundo depois é pior do que aparecer um pouco mais tarde.
  if (!carregou) return null

  const podeEscrever = !!utilizadorId
  if (anotacoes.length === 0 && !podeEscrever) return null

  return (
    <section className="pdx-panel mb-5">
      <div className="pdx-panel-head">
        <span className="pdx-panel-icone" aria-hidden>
          <MessageSquarePlus className="size-3.5" />
        </span>
        <h2>Notas de quem preparou</h2>
        <span className="pdx-panel-sub">
          {anotacoes.length === 0
            ? 'Escritas por pessoas, não pelo motor'
            : `${anotacoes.length} ${anotacoes.length === 1 ? 'nota' : 'notas'}, escritas por pessoas`}
        </span>
      </div>

      <div className="pdx-panel-body">
        {anotacoes.length > 0 && (
          <ul className="pdx-anotacoes">
            {anotacoes.map((a) => (
              <li key={a.id}>
                <p>{a.texto}</p>
                <p className="pdx-anotacao-pe">
                  <span>{a.autor || 'Utilizador removido'}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {new Date(a.criado_em).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  {utilizadorId === a.utilizador_id && (
                    <button
                      type="button"
                      onClick={() => apagar(a.id)}
                      className="pdx-ligacao ml-auto print:hidden"
                      aria-label="Apagar esta nota"
                    >
                      <Trash2 className="size-3" aria-hidden />
                      Apagar
                    </button>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}

        {podeEscrever && (
          <div className="print:hidden mt-3">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, MAX_CARACTERES))}
              placeholder="O que é preciso saber para ler isto bem?"
              rows={3}
              aria-label="Escrever uma nota"
              className="pdx-campo w-full"
            />
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <button type="button" onClick={guardar} disabled={aGravar || !texto.trim()} className="pdx-btn">
                {aGravar ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                Guardar nota
              </button>
              <span className="pdx-nota">
                {texto.length}/{MAX_CARACTERES}
                {publico ? ' · esta análise está partilhada publicamente, e a nota fica visível' : ''}
              </span>
              {erro && <span className="pdx-nota pdx-nota-erro">{erro}</span>}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
