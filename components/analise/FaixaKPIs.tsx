'use client'

import { useState } from 'react'
import { Info, MapPin, ShieldCheck, X } from 'lucide-react'
import { Sparkline } from './Sparkline'
import { linhasEmPortugues, metodoEmPortugues } from '@/lib/analysis/metodos-em-portugues'
import { referenciaDoKpi, type ReferenciaKpi } from '@/lib/analysis/referencia-kpi'

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

function formatar(v: number): string {
  const casas = Number.isInteger(v) ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2
  return v.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/**
 * A linha que diz se o numero e muito, ou se esta a mudar.
 *
 * Sem cor de julgamento, de proposito. Uma subida nao e boa nem ma sem saber a metrica: mais
 * escolas e bom, mais casos de colera e o contrario, e o cartao nao sabe qual das duas esta a
 * mostrar. Pintar de verde o que sobe e emitir uma opiniao que ninguem pediu e que metade das
 * vezes esta errada. A seta diz a direccao, o texto diz o tamanho, e o juizo fica para quem le.
 */
function ReferenciaKPI({ referencia }: { referencia: ReferenciaKpi }) {
  if (!referencia) return null

  if (referencia.tipo === 'variacao') {
    const { delta, deltaPct, subiu } = referencia
    if (delta === 0) {
      return <span className="pdx-kpi-ref">Sem alteração face ao período anterior</span>
    }
    return (
      <span className="pdx-kpi-ref">
        <span aria-hidden>{subiu ? '▲' : '▼'}</span>{' '}
        {deltaPct === null
          ? `${subiu ? '+' : ''}${formatar(delta)} face ao período anterior`
          : `${subiu ? '+' : ''}${formatar(deltaPct)}% face ao período anterior`}
      </span>
    )
  }

  const { minimo, maximo, mediana, posicaoPct, acimaDaMediana, nUnidades } = referencia
  const posicaoMediana = ((mediana - minimo) / (maximo - minimo)) * 100
  return (
    <span className="pdx-kpi-ref">
      {/* A barra e a mesma informacao que o texto, para quem le de relance. O marcador da mediana
          e o que impede a barra de ser decorativa: sem ele, "a meio" nao significa nada. */}
      <span className="pdx-kpi-barra" aria-hidden>
        <span className="pdx-kpi-barra-mediana" style={{ left: `${posicaoMediana}%` }} />
        <span className="pdx-kpi-barra-marca" style={{ left: `${posicaoPct}%` }} />
      </span>
      {acimaDaMediana ? 'Acima' : 'Abaixo'} da mediana das {nUnidades} unidades ({formatar(minimo)} a{' '}
      {formatar(maximo)})
    </span>
  )
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
  series = [],
  nomesUnidades = [],
  unidadeDestacada = null,
  onDestacar,
}: {
  numerosChave: { calc_id: string; rotulo: string; contexto: string; valor: string }[]
  calcs?: Record<string, { passo_id?: string; proveniencia: Proveniencia }>
  graficos?: GraficoSerie[]
  /** Séries por unidade geográfica: dão a distribuição contra a qual um KPI se lê. */
  series?: { passo_id: string; unidades: { valor: number }[] }[]
  nomesUnidades?: string[]
  unidadeDestacada?: string | null
  onDestacar?: (unidade: string | null) => void
}) {
  const [provenienciaAberta, setProvenienciaAberta] = useState<string | null>(null)

  if (!numerosChave?.length) return null

  return (
    <div className="pdx-kpi-grid">
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
        const serieTemporal = serieTemporalDoCalc(calc?.passo_id, graficos)
        // A referência sai do MESMO passo que produziu o número. Cruzar passos diferentes daria
        // uma comparação entre coisas que ninguém pediu para comparar.
        const serieDoPasso = calc?.passo_id
          ? series.find((x) => x.passo_id === calc.passo_id)
          : undefined
        const referencia = referenciaDoKpi({
          valor: (calc as any)?.valor,
          serieTemporal,
          unidadesDaSerie: serieDoPasso?.unidades ?? null,
        })
        return (
          <div key={k.calc_id} className="relative">
            <Componente
              type={unidade ? 'button' : undefined}
              onClick={unidade ? () => onDestacar!(activo ? null : unidade) : undefined}
              // Um único sinal por estado, não vários a competir: a atenção vive só na barra de
              // acento do topo, e o destaque activo só no anel à volta do cartão.
              className={[
                'pdx-kpi',
                atencao ? 'pdx-kpi-atencao' : '',
                activo ? 'pdx-kpi-activo' : '',
                unidade ? 'pdx-kpi-clicavel' : '',
                proveniencia ? 'pdx-kpi-com-info' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="pdx-kpi-tag">{k.rotulo}</span>
              <div className="flex items-end justify-between gap-3">
                <span className="pdx-kpi-val">{k.valor}</span>
                {serieTemporal && (
                  <Sparkline valores={serieTemporal} cor={atencao ? '#7d3520' : '#175a41'} />
                )}
              </div>
              {/* A frase que explica o número vinha calculada e não era desenhada em lado nenhum:
                  sem ela, o cartão dizia "360" e "Distrito com mais escolas" sem nomear o distrito. */}
              {k.contexto && <span className="pdx-kpi-nota">{k.contexto}</span>}
              {referencia && <ReferenciaKPI referencia={referencia} />}
              {unidade && (
                <span className="pdx-kpi-dica" data-activo={activo}>
                  <MapPin className="size-3" aria-hidden />
                  {activo ? 'A destacar no mapa' : 'Clique para destacar no mapa'}
                </span>
              )}
            </Componente>
            {proveniencia && (
              <button
                type="button"
                aria-label="Porquê confio nisto"
                aria-expanded={popoverAberto}
                onClick={() => setProvenienciaAberta(popoverAberto ? null : k.calc_id)}
                className="pdx-kpi-info print:hidden"
              >
                <Info className="size-3.5" aria-hidden />
              </button>
            )}
            {proveniencia && popoverAberto && (
              <div className="pd-popover-in pdx-popover print:hidden" role="dialog" aria-label="Como este número foi obtido">
                <div className="pdx-popover-topo">
                  <p>
                    <ShieldCheck className="size-3.5" aria-hidden />
                    De onde vem este número
                  </p>
                  <button type="button" aria-label="Fechar" onClick={() => setProvenienciaAberta(null)}>
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
                <dl>
                  <dt>Como foi obtido</dt>
                  <dd>{metodoEmPortugues(proveniencia.metodo)}</dd>
                  <dt>A partir de</dt>
                  <dd>{proveniencia.datasets.join('; ') || 'dados do próprio portal'}</dd>
                  <dt>Quanto foi lido</dt>
                  <dd>{linhasEmPortugues(proveniencia.linhas_usadas)}</dd>
                </dl>
                {/* Frase de fecho fixa: é a promessa que o painel inteiro existe para sustentar. */}
                <p className="pdx-popover-rodape">
                  Calculado a partir dos dados publicados no portal. Nenhum valor foi escrito à mão.
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
