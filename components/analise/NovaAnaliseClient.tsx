'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LineChart,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react'
import { getCategoryIcon } from '@/lib/ai-category-icons'
import { ComoFuncionaDrawer } from '@/components/analise/ComoFuncionaDrawer'
import '@/app/geo-catalog.css'

export type DatasetParaEscolha = {
  id: number
  title: string
  dataType: string
  source: string | null
  year: number | string | null
  format: string | null
  description: string | null
  category: { id: number; name: string } | null
}

const MAX_DATASETS = 3
const MIN_PERGUNTA = 5

type EventoStream = { tipo: string; [chave: string]: unknown }

/**
 * Consome o SSE de POST /api/analise.
 *
 * EventSource não suporta corpo em POST, por isso o streaming é lido manualmente do
 * ReadableStream da resposta: cada quadro "data: {...}\n\n" é um evento do pipeline.
 */
async function* lerEventos(resposta: Response): AsyncGenerator<EventoStream> {
  const leitor = resposta.body?.getReader()
  if (!leitor) return
  const descodificador = new TextDecoder()
  let restante = ''

  while (true) {
    const { done, value } = await leitor.read()
    if (done) break
    restante += descodificador.decode(value, { stream: true })
    const quadros = restante.split('\n\n')
    restante = quadros.pop() || ''
    for (const quadro of quadros) {
      const linha = quadro.split('\n').find((l) => l.startsWith('data: '))
      if (!linha) continue
      try {
        yield JSON.parse(linha.slice(6))
      } catch {
        // Quadro corrompido ou parcial: ignora-se em vez de rebentar o ecrã inteiro.
      }
    }
  }
}

// Mensagens genéricas do ecrã de espera: nunca nomeiam etapas internas do motor (planeamento,
// suficiência, etc.) — o utilizador só precisa de saber que está a decorrer, não como funciona.
const MENSAGENS_ESPERA = [
  'A preparar a sua análise...',
  'A processar os dados seleccionados...',
  'A verificar a qualidade da informação...',
  'A montar o dashboard...',
]

export function NovaAnaliseClient({ datasets }: { datasets: DatasetParaEscolha[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pesquisa, setPesquisa] = useState('')
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [pergunta, setPergunta] = useState('')
  const [aCorrer, setACorrer] = useState(false)
  const [aAbrirDashboard, setAAbrirDashboard] = useState(false)
  const [mensagemEspera, setMensagemEspera] = useState(MENSAGENS_ESPERA[0])
  const [progresso, setProgresso] = useState(5)
  // Progresso real (não só decorativo): os passos do plano já vinham com descrições pensadas para
  // isto ("descricao_humana... é lida em tempo real numa barra de progresso" — prompts.ts) mas a
  // UI nunca os mostrava, só um spinner genérico a rodar mensagens por tempo. Numa análise de
  // 2-4 minutos isso é indistinguível de estar pendurada; uma lista que vai marcando passos reais
  // mostra que está mesmo a trabalhar.
  const [passosPlano, setPassosPlano] = useState<{ id: string; descricao_humana: string; feito: boolean }[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [manualExpanded, setManualExpanded] = useState<Record<string | number, boolean>>({})
  const [comoFuncionaAberto, setComoFuncionaAberto] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const perguntaRef = useRef<HTMLTextAreaElement>(null)

  // Pré-preenche a partir de "Perguntas sugeridas" de uma análise anterior (?datasets=1,2&pergunta=...):
  // o utilizador continua a ter de carregar em "Analisar" — nunca dispara sozinho, isso teria um
  // custo real sem confirmação.
  useEffect(() => {
    const datasetsParam = searchParams.get('datasets')
    const perguntaParam = searchParams.get('pergunta')
    if (datasetsParam) {
      const ids = datasetsParam
        .split(',')
        .map((v) => Number.parseInt(v, 10))
        .filter((id) => Number.isFinite(id) && datasets.some((d) => d.id === id))
        .slice(0, MAX_DATASETS)
      if (ids.length > 0) setSeleccionados(ids)
    }
    if (perguntaParam) setPergunta(perguntaParam.slice(0, 500))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Enquanto a análise corre, roda por mensagens genéricas e avança uma barra de progresso por
  // tempo (não por etapa real do motor) — só transmite "está a decorrer", nunca o mecanismo.
  useEffect(() => {
    if (!aCorrer || aAbrirDashboard) return
    let i = 0
    const intervaloMensagem = setInterval(() => {
      i = (i + 1) % MENSAGENS_ESPERA.length
      setMensagemEspera(MENSAGENS_ESPERA[i])
    }, 4000)
    const intervaloProgresso = setInterval(() => {
      setProgresso((p) => (p < 90 ? p + 1.5 : p))
    }, 800)
    return () => {
      clearInterval(intervaloMensagem)
      clearInterval(intervaloProgresso)
    }
  }, [aCorrer, aAbrirDashboard])

  const filtrados = pesquisa.trim()
    ? datasets.filter((d) => d.title.toLowerCase().includes(pesquisa.trim().toLowerCase()))
    : datasets

  const grupos = useMemo(() => {
    const mapa = new Map<number | string, { categoria: { id: number; name: string } | null; itens: DatasetParaEscolha[] }>()
    for (const d of filtrados) {
      const chave = d.category?.id ?? 'sem-categoria'
      if (!mapa.has(chave)) mapa.set(chave, { categoria: d.category, itens: [] })
      mapa.get(chave)!.itens.push(d)
    }
    const lista = Array.from(mapa.entries()).map(([chave, valor]) => ({ chave, ...valor }))

    // O portal tem categorias com o MESMO nome repetidas por tipo de dado (ex.: "Demografia"
    // existe como categoria geoespacial E como categoria alfanumérica, com ids diferentes) — sem
    // desambiguar, o painel mostrava dois acordeões chamados "Demografia" lado a lado sem
    // qualquer diferença visível. Só se acrescenta o sufixo quando há mesmo colisão de nome.
    const contagemPorNome = new Map<string, number>()
    for (const g of lista) {
      const nome = g.categoria?.name || 'Sem categoria'
      contagemPorNome.set(nome, (contagemPorNome.get(nome) || 0) + 1)
    }

    return lista
      .map((g) => {
        const nomeBase = g.categoria?.name || 'Sem categoria'
        const colide = (contagemPorNome.get(nomeBase) || 0) > 1
        const ehGeo = g.itens[0]?.dataType === 'geoespacial'
        const rotulo = colide ? `${nomeBase} · ${ehGeo ? 'Geoespacial' : 'Alfanumérico'}` : nomeBase
        return { ...g, rotulo }
      })
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo))
  }, [filtrados])

  const temFiltro = pesquisa.trim().length > 0

  function estaExpandido(chave: number | string, indice: number) {
    if (chave in manualExpanded) return manualExpanded[chave]
    if (temFiltro) return true
    return indice < 2
  }

  function alternarCategoria(chave: number | string, indice: number) {
    setManualExpanded((prev) => ({ ...prev, [chave]: !estaExpandido(chave, indice) }))
  }

  function alternar(id: number) {
    setSeleccionados((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_DATASETS) return prev
      return [...prev, id]
    })
  }

  function focarPergunta() {
    perguntaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    perguntaRef.current?.focus()
  }

  function tentarExemplo() {
    setComoFuncionaAberto(false)
    // Dá tempo ao painel de fechar (e devolver o foco) antes de saltar para a pergunta — chamar
    // os dois em sincronia faz o scroll disparar antes do painel sair do ecrã.
    requestAnimationFrame(focarPergunta)
  }

  const perguntaValida = pergunta.trim().length >= MIN_PERGUNTA
  const datasetsValidos = seleccionados.length > 0
  const podeAnalisar = perguntaValida && datasetsValidos

  async function iniciar() {
    if (!podeAnalisar) return
    setACorrer(true)
    setErro(null)
    setMensagemEspera(MENSAGENS_ESPERA[0])
    setProgresso(5)
    setPassosPlano([])

    const controlador = new AbortController()
    abortRef.current = controlador

    try {
      const resposta = await fetch('/api/analise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pergunta: pergunta.trim(),
          dataset_ids: seleccionados,
          fontes_externas: false,
        }),
        signal: controlador.signal,
      })

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null)
        throw new Error(corpo?.error || `Falha ao iniciar a análise (${resposta.status})`)
      }

      for await (const evento of lerEventos(resposta)) {
        if (evento.tipo === 'concluido') {
          // Mantém o ecrã de espera visível: só sai dele quando a navegação para o
          // dashboard já tiver a página seguinte pronta, nunca voltando ao ecrã de selecção.
          setAAbrirDashboard(true)
          setProgresso(100)
          router.push(evento.url as string)
          return
        } else if (evento.tipo === 'erro') {
          throw new Error((evento.mensagem as string) || 'A análise falhou')
        } else if (evento.tipo === 'plano_pronto') {
          const passos = (evento.passos as { id: string; descricao_humana: string }[]) || []
          setPassosPlano(passos.map((p) => ({ ...p, feito: false })))
        } else if (evento.tipo === 'passo_fim') {
          const id = evento.id as string
          setPassosPlano((prev) => prev.map((p) => (p.id === id ? { ...p, feito: true } : p)))
        }
      }
      throw new Error('A ligação terminou antes da análise concluir. Tente novamente.')
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setErro(e?.message || 'Algo correu mal.')
        setACorrer(false)
      }
    } finally {
      abortRef.current = null
    }
  }

  return (
    <div className="geo-detail-page">
      <div className="geo-detail-inner max-w-5xl">
        {!aCorrer && (
          <div className="flex items-center justify-between gap-2 mb-2">
            <button
              type="button"
              onClick={() => setComoFuncionaAberto(true)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-bold text-[#064E2C] hover:bg-[#F1F8F4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C]"
            >
              <HelpCircle className="size-4" aria-hidden />
              Como funciona?
            </button>
            <Link
              href="/analise"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#CFE3D6] bg-[#F1F8F4] px-4 py-2.5 text-[13px] font-bold text-[#064E2C] hover:bg-[#E2F0E6] hover:border-[#064E2C] transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C]"
            >
              <LayoutDashboard className="size-4" aria-hidden />
              Minhas análises
            </Link>
          </div>
        )}

        <header className="mb-6">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#064E2C] bg-[#F1F8F4] rounded-full px-2.5 py-1 mb-3">
            <LineChart className="size-3.5" aria-hidden />
            Motor de análise profunda
          </p>
          <h1 className="text-2xl md:text-[30px] font-extrabold text-[var(--pd-ink-900)] tracking-tight mb-2">
            Faça uma pergunta aos dados
          </h1>
          <p className="text-[14px] text-[var(--pd-ink-500)] leading-relaxed max-w-2xl">
            Planeia a análise, desce à geografia mais fina disponível, calcula em código (nunca
            escreve um número à mão) e revê-se a si próprio antes de responder. Normalmente
            demora menos de um minuto.
          </p>
        </header>

        {!aCorrer && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 lg:gap-5 items-start">
              <section className="geo-detail-card p-5">
                <label htmlFor="na-pergunta" className="block text-sm font-bold text-[var(--pd-ink-900)] mb-2">
                  Pergunta
                </label>
                <textarea
                  id="na-pergunta"
                  ref={perguntaRef}
                  value={pergunta}
                  onChange={(e) => setPergunta(e.target.value)}
                  rows={8}
                  maxLength={500}
                  placeholder="Ex.: Onde estão concentradas as escolas em Moçambique?"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E2E8E5] focus:outline-none focus:ring-2 focus:ring-[#064E2C] resize-none"
                />
                <p className="mt-2 text-[11px] text-gray-400 text-right">{pergunta.length}/500</p>
              </section>

              <section className="geo-detail-card p-5 flex flex-col min-w-0">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="text-sm font-bold text-[var(--pd-ink-900)]">Datasets</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      datasetsValidos ? 'bg-[#F1F8F4] text-[#064E2C]' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {seleccionados.length}/{MAX_DATASETS}
                  </span>
                </div>

                {seleccionados.length > 0 && (
                  <ul aria-label="Datasets seleccionados" className="flex flex-wrap gap-1.5 mb-3">
                    {seleccionados.map((id) => {
                      const d = datasets.find((x) => x.id === id)
                      if (!d) return null
                      return (
                        <li key={id}>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] pl-3 pr-1 py-1 text-[12px] font-semibold text-[#064E2C] max-w-full">
                            <span className="truncate max-w-[150px]">{d.title}</span>
                            <button
                              type="button"
                              onClick={() => alternar(id)}
                              aria-label={`Remover ${d.title} da selecção`}
                              className="inline-flex shrink-0 items-center justify-center size-8 rounded-full hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C]"
                            >
                              <X className="size-3.5" aria-hidden />
                            </button>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <label htmlFor="na-pesquisa-dataset" className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">
                  Procurar dataset
                </label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" aria-hidden />
                  <input
                    id="na-pesquisa-dataset"
                    type="text"
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                    placeholder="Nome do dataset..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-[#E2E8E5] focus:outline-none focus:ring-2 focus:ring-[#064E2C]"
                  />
                </div>

                <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
                  {grupos.map((grupo, indice) => {
                    const expandido = estaExpandido(grupo.chave, indice)
                    const CategoryIcon = getCategoryIcon(grupo.categoria?.name)
                    return (
                      <div key={grupo.chave} className="rounded-xl border border-[#E2E8E5] bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => alternarCategoria(grupo.chave, indice)}
                          aria-expanded={expandido}
                          className="w-full flex items-center justify-between gap-2 px-3.5 py-3 min-h-11 bg-[#FAFBFA] hover:bg-[#F1F8F4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#064E2C]"
                        >
                          <span className="flex items-center gap-2 text-[13px] font-bold text-gray-900 min-w-0">
                            <span className="inline-flex shrink-0 items-center justify-center w-6 h-6 rounded-md bg-[#F1F8F4] border border-[#CFE3D6] text-[#064E2C]">
                              <CategoryIcon className="w-3.5 h-3.5" />
                            </span>
                            <span className="truncate">{grupo.rotulo}</span>
                            <span className="shrink-0 rounded-full bg-white border border-[#CFE3D6] px-1.5 py-0.5 text-[10px] font-semibold text-[#064E2C]">
                              {grupo.itens.length}
                            </span>
                          </span>
                          {expandido ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" aria-hidden />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" aria-hidden />
                          )}
                        </button>
                        {expandido && (
                          <div className="grid grid-cols-1 gap-2 p-3">
                            {grupo.itens.map((d) => {
                              const activo = seleccionados.includes(d.id)
                              const desactivado = !activo && seleccionados.length >= MAX_DATASETS
                              return (
                                <button
                                  key={d.id}
                                  type="button"
                                  disabled={desactivado}
                                  aria-pressed={activo}
                                  onClick={() => alternar(d.id)}
                                  className={`text-left rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] ${
                                    activo
                                      ? 'border-[#064E2C] bg-[#F1F8F4]'
                                      : desactivado
                                        ? 'border-[#E2E8E5] opacity-40 cursor-not-allowed'
                                        : 'border-[#E2E8E5] hover:border-[#CFE3D6]'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-[13px] font-bold text-gray-900 leading-snug line-clamp-2">{d.title}</p>
                                    <span
                                      className={`shrink-0 size-4 rounded flex items-center justify-center border ${
                                        activo ? 'bg-[#064E2C] border-[#064E2C] text-white' : 'border-gray-300'
                                      }`}
                                      aria-hidden
                                    >
                                      {activo && <Check className="size-3" />}
                                    </span>
                                  </div>
                                  {d.description && (
                                    <p className="text-[11px] text-gray-500 leading-snug line-clamp-2 mt-1.5">
                                      {d.description}
                                    </p>
                                  )}
                                  <div className="flex items-center flex-wrap gap-1.5 mt-2">
                                    <span
                                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                        d.dataType === 'geoespacial' ? 'bg-[#EAF2FB] text-[#1F6FB2]' : 'bg-[#F5F0FB] text-[#6B4FBB]'
                                      }`}
                                    >
                                      {d.dataType === 'geoespacial' ? 'Geo' : 'Tabular'}
                                    </span>
                                    {d.format && (
                                      <span className="rounded-full bg-gray-50 border border-gray-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-500">
                                        {d.format}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-400 mt-1.5">
                                    {[d.source, d.year].filter(Boolean).join(' · ')}
                                  </p>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {grupos.length === 0 && (
                    <p className="text-[13px] text-gray-400 py-4 text-center">Nenhum dataset encontrado.</p>
                  )}
                </div>
              </section>
            </div>

            {erro && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 mt-4">
                <ShieldAlert className="size-4 text-red-600 shrink-0 mt-0.5" aria-hidden />
                <p className="text-[13px] text-red-800">{erro}</p>
              </div>
            )}

            <div className="na-actionbar">
              <div>
                <div className="flex items-center gap-2 text-[13px] font-semibold">
                  <span className={`inline-flex items-center gap-1.5 ${perguntaValida ? 'text-[#064E2C]' : 'text-gray-400'}`}>
                    {perguntaValida ? (
                      <CheckCircle2 className="size-4" aria-hidden />
                    ) : (
                      <Circle className="size-4" aria-hidden />
                    )}
                    Pergunta
                  </span>
                  <span className="text-gray-300" aria-hidden>
                    ·
                  </span>
                  <span className={`inline-flex items-center gap-1.5 ${datasetsValidos ? 'text-[#064E2C]' : 'text-gray-400'}`}>
                    {datasetsValidos ? (
                      <CheckCircle2 className="size-4" aria-hidden />
                    ) : (
                      <Circle className="size-4" aria-hidden />
                    )}
                    Datasets {seleccionados.length}/{MAX_DATASETS}
                  </span>
                </div>
                {!podeAnalisar && (
                  <p className="text-[12px] text-gray-500 mt-1" aria-live="polite">
                    Seleccione 1 a {MAX_DATASETS} datasets e escreva a sua pergunta (mín. {MIN_PERGUNTA} caracteres).
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={iniciar}
                disabled={!podeAnalisar}
                className="geo-detail-btn-primary sm:w-auto w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Analisar
              </button>
            </div>
          </>
        )}

        {aCorrer && (
          <section className="geo-detail-card p-8 md:p-10 text-center">
            <div className="mx-auto mb-5 inline-flex items-center justify-center size-16 rounded-full bg-[#F1F8F4] border border-[#CFE3D6]">
              <Loader2 className="size-7 text-[#064E2C] animate-spin" aria-hidden />
            </div>
            <p className="text-base font-bold text-[var(--pd-ink-900)] mb-1.5">
              {aAbrirDashboard ? 'A abrir a análise...' : 'A analisar, aguarde...'}
            </p>
            <p className="text-[13px] text-[var(--pd-ink-500)] mb-6 min-h-[1.25em]">
              {aAbrirDashboard ? 'Quase pronto.' : mensagemEspera}
            </p>

            <div className="h-1.5 rounded-full bg-[#E7F3EB] overflow-hidden mb-1 max-w-sm mx-auto">
              <div
                className="h-full bg-[#064E2C] transition-[width] duration-700 ease-out"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mb-6">
              Perguntas ricas (vários anos, várias províncias) podem demorar alguns minutos.
            </p>

            {/* Lista real do plano, não decorativa: cada passo marca-se assim que o cálculo real
                correspondente termina (evento passo_fim) — mostra trabalho a acontecer de facto
                em vez de um spinner indistinguível de estar pendurado numa análise longa. */}
            {passosPlano.length > 0 && !aAbrirDashboard && (
              <ul className="max-w-sm mx-auto text-left space-y-2">
                {passosPlano.map((p) => (
                  <li key={p.id} className="flex items-start gap-2 text-[12.5px] leading-snug">
                    {p.feito ? (
                      <Check className="size-3.5 mt-0.5 text-[#064E2C] shrink-0" aria-hidden />
                    ) : (
                      <Loader2 className="size-3.5 mt-0.5 text-gray-300 animate-spin shrink-0" aria-hidden />
                    )}
                    <span className={p.feito ? 'text-[var(--pd-ink-700)]' : 'text-gray-400'}>{p.descricao_humana}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {comoFuncionaAberto && (
        <ComoFuncionaDrawer onClose={() => setComoFuncionaAberto(false)} onTryIt={tentarExemplo} />
      )}
    </div>
  )
}
