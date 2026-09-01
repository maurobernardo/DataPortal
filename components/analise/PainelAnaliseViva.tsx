'use client'

import { useEffect, useState } from 'react'
import { Activity, Loader2, RefreshCw } from 'lucide-react'

/**
 * A pergunta que continua a ser feita, e o que mudou desde a última vez.
 *
 * O painel só mostra mudanças quando elas existem e quando são comparáveis. Quando o motor traçou
 * um plano diferente, diz isso por palavras em vez de listar variações: dois planos diferentes
 * produzem cálculos que não são o mesmo número medido duas vezes, e compará-los daria descobertas
 * que ninguém consegue desmentir porque nunca existiram.
 */

type Mudanca = {
  comparavel: boolean
  razao?: string
  numeros: { id: string; antes: number; depois: number; delta: number; deltaPct: number | null }[]
  unidades: { serie: string; nome: string; antes: number; depois: number; delta: number }[]
  unidadesNovas: string[]
  unidadesPerdidas: string[]
}

type Viva = {
  raiz_id: string
  periodicidade: 'semanal' | 'mensal' | 'trimestral'
  activa: boolean
  ultima_corrida: string | null
  ultima_analise_id: string | null
}

const ROTULO: Record<string, string> = {
  semanal: 'Todas as semanas',
  mensal: 'Todos os meses',
  trimestral: 'Cada trimestre',
}

function formatar(v: number): string {
  const casas = Number.isInteger(v) ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2
  return v.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export function PainelAnaliseViva({ analiseId, ehDono }: { analiseId: string; ehDono: boolean }) {
  const [viva, setViva] = useState<Viva | null>(null)
  const [proxima, setProxima] = useState<string | null>(null)
  const [mudanca, setMudanca] = useState<Mudanca | null>(null)
  const [aTrabalhar, setATrabalhar] = useState(false)
  const [carregou, setCarregou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    fetch(`/api/analise/${analiseId}/viva`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d) return
        setViva(d.viva)
        setProxima(d.proxima)
        setMudanca(d.corridas?.[0]?.comparacao ?? null)
      })
      .catch(() => {})
      .finally(() => vivo && setCarregou(true))
    return () => {
      vivo = false
    }
  }, [analiseId])

  async function alternar(periodicidade: Viva['periodicidade'] | null) {
    setATrabalhar(true)
    setErro(null)
    try {
      const r = await fetch(`/api/analise/${analiseId}/viva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activa: periodicidade !== null, periodicidade: periodicidade || 'mensal' }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível guardar')
      setViva(d.viva)
      setProxima(d.proxima)
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível guardar')
    } finally {
      setATrabalhar(false)
    }
  }

  async function correrAgora() {
    setATrabalhar(true)
    setErro(null)
    try {
      const r = await fetch(`/api/analise/${analiseId}/viva`, { method: 'PUT' })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.erro || 'A nova corrida falhou')
      setMudanca(d.comparacao)
    } catch (e: any) {
      setErro(e?.message || 'A nova corrida falhou')
    } finally {
      setATrabalhar(false)
    }
  }

  if (!carregou) return null
  const activa = !!viva?.activa
  if (!activa && !ehDono) return null

  return (
    <section className="pdx-panel mb-5">
      <div className="pdx-panel-head">
        <span className="pdx-panel-icone" aria-hidden>
          <Activity className="size-3.5" />
        </span>
        <h2>{activa ? 'Esta pergunta continua a ser feita' : 'Acompanhar esta pergunta'}</h2>
        {activa && viva?.ultima_corrida && (
          <span className="pdx-panel-sub">
            Última corrida em{' '}
            {new Date(viva.ultima_corrida).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      <div className="pdx-panel-body">
        {!activa ? (
          <>
            <p className="pdx-nota mb-3">
              Os dados por baixo desta análise vão mudar. Com o acompanhamento ligado, o portal volta
              a fazer a mesma pergunta e mostra aqui o que mudou, sem apagar o relatório de hoje.
            </p>
            {ehDono && (
              <div className="pdx-abas print:hidden">
                {(['semanal', 'mensal', 'trimestral'] as const).map((p) => (
                  <button key={p} type="button" onClick={() => alternar(p)} disabled={aTrabalhar}>
                    {ROTULO[p]}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap mb-4 print:hidden">
              <span className="pdx-nota">
                {ROTULO[viva!.periodicidade]}
                {proxima
                  ? `, a próxima por volta de ${new Date(proxima).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}`
                  : ''}
              </span>
              {ehDono && (
                <>
                  <button type="button" onClick={correrAgora} disabled={aTrabalhar} className="pdx-btn">
                    {aTrabalhar ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="size-3.5" aria-hidden />
                    )}
                    Correr agora
                  </button>
                  <button type="button" onClick={() => alternar(null)} disabled={aTrabalhar} className="pdx-ligacao">
                    Deixar de acompanhar
                  </button>
                </>
              )}
            </div>

            {aTrabalhar && (
              <p className="pdx-nota">
                A refazer a análise inteira, o que leva o mesmo tempo da primeira vez.
              </p>
            )}

            {mudanca && !mudanca.comparavel && <p className="pdx-nota">{mudanca.razao}</p>}

            {mudanca?.comparavel && (
              <MudancasDaCorrida mudanca={mudanca} />
            )}
          </>
        )}
        {erro && <p className="pdx-nota pdx-nota-erro mt-2">{erro}</p>}
      </div>
    </section>
  )
}

function MudancasDaCorrida({ mudanca }: { mudanca: Mudanca }) {
  const nada =
    mudanca.numeros.length === 0 &&
    mudanca.unidades.length === 0 &&
    mudanca.unidadesNovas.length === 0 &&
    mudanca.unidadesPerdidas.length === 0

  if (nada) {
    return <p className="pdx-nota">Desde a última corrida, nada mudou de forma material.</p>
  }

  return (
    <div className="pdx-mudancas">
      {mudanca.unidades.slice(0, 8).map((u, i) => (
        <div key={`${u.nome}-${i}`} className="pdx-mudanca">
          <span className="nome">{u.nome}</span>
          <span className="valores">
            {formatar(u.antes)} <span aria-hidden>→</span> {formatar(u.depois)}
          </span>
          {/* Seta sem cor de julgamento: subir nao e bom nem mau sem saber a metrica. */}
          <span className="delta">
            {u.delta > 0 ? '▲' : '▼'} {formatar(Math.abs(u.delta))}
          </span>
        </div>
      ))}
      {mudanca.numeros.slice(0, 6).map((n) => (
        <div key={n.id} className="pdx-mudanca">
          <span className="nome">{n.id.replace(/_/g, ' ')}</span>
          <span className="valores">
            {formatar(n.antes)} <span aria-hidden>→</span> {formatar(n.depois)}
          </span>
          <span className="delta">
            {n.delta > 0 ? '▲' : '▼'} {n.deltaPct === null ? formatar(Math.abs(n.delta)) : `${formatar(Math.abs(n.deltaPct))}%`}
          </span>
        </div>
      ))}
      {(mudanca.unidadesNovas.length > 0 || mudanca.unidadesPerdidas.length > 0) && (
        <p className="pdx-nota mt-1">
          {mudanca.unidadesNovas.length > 0 && `Passaram a ter dados: ${mudanca.unidadesNovas.join(', ')}. `}
          {mudanca.unidadesPerdidas.length > 0 && `Deixaram de ter dados: ${mudanca.unidadesPerdidas.join(', ')}.`}
        </p>
      )}
    </div>
  )
}
