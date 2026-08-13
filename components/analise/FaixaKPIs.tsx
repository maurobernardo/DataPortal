'use client'

import { useState } from 'react'
import { Info, X } from 'lucide-react'
import { Sparkline } from './Sparkline'

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').trim()
}

/** Um KPI cujo valor ou contexto nomeia uma unidade do mapa (ex.: "Limpopo", "Nampula") pode
 *  destacá-la ao clicar — mesma lógica de correspondência por prefixo usada nos gráficos. */
function nomeDeUnidade(texto: string, nomesUnidades: string[]): string | null {
  const t = normalizar(texto)
  if (t.length < 3) return null
  for (const nome of nomesUnidades) {
    const n = normalizar(nome)
    if (t === n || t.includes(n) || n.includes(t)) return nome
  }
  return null
}

/** Heurística por palavra-chave, não um julgamento estatístico: só muda a cor de acento para
 *  chamar a atenção quando o próprio rótulo/contexto já usa linguagem de risco ou carência — nunca
 *  decide isso a partir do valor numérico, que dependeria de saber o que é "alto" em cada métrica. */
const PALAVRAS_ATENCAO = /desiguald|risco|carenc|d[eé]ficit|escass|vulnerab|lacuna|baixa cobertura|abaixo da m[eé]dia/i
function precisaAtencao(rotulo: string, contexto: string): boolean {
  return PALAVRAS_ATENCAO.test(rotulo) || PALAVRAS_ATENCAO.test(contexto || '')
}

type Proveniencia = { datasets: string[]; linhas_usadas: number; metodo: string }
type GraficoSerie = { passo_id: string; categoria?: string; eixoX: string[]; series: { nome: string; valores: (number | null)[] }[] }

/** Uma sparkline só faz sentido quando o KPI vier de um passo que também gerou uma série
 *  temporal — cruza pelo passo_id, sem inventar tendência a partir de um número isolado. */
function serieTemporalDoCalc(passoId: string | undefined, graficos: GraficoSerie[]): (number | null)[] | null {
  if (!passoId) return null
  const grafico = graficos.find((g) => g.passo_id === passoId && g.categoria === 'temporal')
  const valores = grafico?.series?.[0]?.valores
  return valores && valores.length >= 2 ? valores : null
}

/**
 * Faixa de KPIs partilhada entre a página de detalhe e o dashboard (Fase 6, explicabilidade):
 * cartões pequenos e numerosos, cada um com um "porquê confio nisto" opcional que mostra a
 * proveniência (R3: nunca como badge sempre visível, só num popover que o leitor pede).
 */
export function FaixaKPIs({
  numerosChave,
  calcs = {},
  graficos = [],
  nomesUnidades = [],
  unidadeDestacada = null,
  onDestacar,
}: {
  numerosChave: { calc_id: string; rotulo: string; contexto: string; valor: string }[]
  calcs?: Record<string, { passo_id?: string; proveniencia: Proveniencia }>
  graficos?: GraficoSerie[]
  nomesUnidades?: string[]
  unidadeDestacada?: string | null
  onDestacar?: (unidade: string | null) => void
}) {
  const [provenienciaAberta, setProvenienciaAberta] = useState<string | null>(null)

  if (!numerosChave?.length) return null

  return (
    <div className="flex flex-wrap gap-3 mb-5">
      {numerosChave.map((k) => {
        const unidade =
          onDestacar && nomesUnidades.length > 0
            ? nomeDeUnidade(String(k.valor), nomesUnidades) || nomeDeUnidade(String(k.contexto || ''), nomesUnidades)
            : null
        const activo = !!unidade && unidadeDestacada === unidade
        const Componente = unidade ? 'button' : 'div'
        const calc = calcs[k.calc_id]
        const proveniencia = calc?.proveniencia
        const popoverAberto = provenienciaAberta === k.calc_id
        const atencao = precisaAtencao(k.rotulo, k.contexto)
        const corValor = atencao ? '#92400E' : '#064E2C'
        const serieTemporal = serieTemporalDoCalc(calc?.passo_id, graficos)
        return (
          <div key={k.calc_id} className="relative grow basis-[150px]">
            <Componente
              type={unidade ? 'button' : undefined}
              onClick={unidade ? () => onDestacar!(activo ? null : unidade) : undefined}
              className={`w-full rounded-xl border bg-white p-4 text-left transition-colors ${
                activo ? 'border-[#B91C1C] ring-1 ring-[#B91C1C]' : atencao ? 'border-amber-200' : 'border-[#E2E8E5]'
              } ${unidade ? 'cursor-pointer hover:border-[#CFE3D6]' : ''}`}
              style={atencao && !activo ? { borderLeftWidth: 3, borderLeftColor: '#D97706' } : undefined}
            >
              <div className="flex items-end justify-between gap-2 mb-1.5">
                <p className="text-[24px] font-extrabold leading-none tabular-nums" style={{ color: corValor }}>
                  {k.valor}
                </p>
                {serieTemporal && <Sparkline valores={serieTemporal} cor={corValor} />}
              </div>
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-500 leading-snug">{k.rotulo}</p>
              {unidade && (
                <p className="text-[10px] text-gray-400 mt-1">{activo ? 'A destacar no mapa' : 'Clique para destacar'}</p>
              )}
            </Componente>
            {proveniencia && (
              <button
                type="button"
                aria-label="Porquê confio nisto"
                aria-expanded={popoverAberto}
                onClick={() => setProvenienciaAberta(popoverAberto ? null : k.calc_id)}
                className="absolute top-2.5 right-2.5 rounded-full p-1 text-gray-300 hover:text-[#064E2C] hover:bg-[#F1F8F4] transition-colors print:hidden"
              >
                <Info className="size-3.5" aria-hidden />
              </button>
            )}
            {proveniencia && popoverAberto && (
              <div className="pd-popover-in absolute z-20 top-full left-0 mt-1.5 w-64 rounded-xl border border-[#E2E8E5] bg-white p-3.5 shadow-lg print:hidden">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#064E2C]">Porquê confio nisto</p>
                  <button
                    type="button"
                    aria-label="Fechar"
                    onClick={() => setProvenienciaAberta(null)}
                    className="text-gray-300 hover:text-gray-600 shrink-0"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
                <dl className="space-y-1.5 text-[12px] text-[var(--pd-ink-700)]">
                  <div>
                    <dt className="text-gray-400 text-[10.5px] uppercase tracking-wide">Método</dt>
                    <dd className="font-medium">{proveniencia.metodo}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400 text-[10.5px] uppercase tracking-wide">Fonte de dados</dt>
                    <dd className="font-medium">{proveniencia.datasets.join('; ') || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400 text-[10.5px] uppercase tracking-wide">Linhas usadas</dt>
                    <dd className="font-medium tabular-nums">{proveniencia.linhas_usadas.toLocaleString('pt-PT')}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
