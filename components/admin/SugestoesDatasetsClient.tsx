'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lightbulb, RefreshCw, Tags, TrendingUp, Search, ExternalLink, Plus, Database, Target, FolderTree, ListChecks } from 'lucide-react'
import type { GrupoPalavraChave, SugestaoDataset, SugestaoTipoCategoria } from '@/lib/analysis/sugestoes-datasets'

type TemaCoberto = { tema: string; total: number; jaCoberto: boolean }

type Props = {
  palavrasChaveInicial: GrupoPalavraChave[]
  sugestoesInicial: SugestaoDataset[]
  temasCobertosInicial: TemaCoberto[]
  totalPerguntasClassificadasInicial: number
  tiposPorCategoriaInicial: SugestaoTipoCategoria[]
}

function Sparkline({ valores }: { valores: number[] }) {
  const largura = 120
  const altura = 28
  const max = Math.max(1, ...valores)
  const passo = largura / Math.max(1, valores.length - 1)
  const pontos = valores.map((v, i) => `${i * passo},${altura - (v / max) * (altura - 4) - 2}`).join(' ')
  const aCrescer = valores.length >= 2 && valores[valores.length - 1] > valores[0]
  return (
    <svg width={largura} height={altura} className="shrink-0" aria-hidden="true">
      <polyline points={pontos} fill="none" stroke={aCrescer ? '#064E2C' : '#9CA3AF'} strokeWidth={2} />
    </svg>
  )
}

function tendenciaLabel(valores: number[]): string {
  const metade = Math.floor(valores.length / 2)
  const primeiraMetade = valores.slice(0, metade).reduce((a, b) => a + b, 0)
  const segundaMetade = valores.slice(metade).reduce((a, b) => a + b, 0)
  if (segundaMetade > primeiraMetade) return 'Em crescimento'
  if (segundaMetade < primeiraMetade) return 'Em queda'
  return 'Estável'
}

export function SugestoesDatasetsClient({
  palavrasChaveInicial,
  sugestoesInicial,
  temasCobertosInicial,
  totalPerguntasClassificadasInicial,
  tiposPorCategoriaInicial,
}: Props) {
  const [palavrasChave] = useState(palavrasChaveInicial)
  const [sugestoes, setSugestoes] = useState(sugestoesInicial)
  const [temasCobertos, setTemasCobertos] = useState(temasCobertosInicial)
  const [totalClassificadas, setTotalClassificadas] = useState(totalPerguntasClassificadasInicial)
  const [tiposPorCategoria, setTiposPorCategoria] = useState(tiposPorCategoriaInicial)
  const [aActualizar, setAActualizar] = useState(false)
  const [ultimaMensagem, setUltimaMensagem] = useState<string | null>(null)
  const [aMarcar, setAMarcar] = useState<string | null>(null)
  const [aEnriquecer, setAEnriquecer] = useState<string | null>(null)

  async function marcarEmAvaliacao(tema: string) {
    setAMarcar(tema)
    try {
      const resposta = await fetch('/api/admin/sugestoes-datasets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error || 'Falha ao marcar sugestão')
      setSugestoes((anterior) => anterior.map((s) => (s.tema === tema ? { ...s, emAvaliacao: true } : s)))
    } catch (erro: any) {
      setUltimaMensagem(erro?.message || 'Erro ao marcar sugestão como em avaliação.')
    } finally {
      setAMarcar(null)
    }
  }

  async function enriquecer(tema: string) {
    setAEnriquecer(tema)
    try {
      const resposta = await fetch('/api/admin/sugestoes-datasets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema, acao: 'enriquecer' }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error || 'Falha ao pesquisar fontes externas')
      setSugestoes((anterior) =>
        anterior.map((s) =>
          s.tema === tema
            ? {
                ...s,
                nivelGeograficoSugerido: dados.nivelGeograficoSugerido,
                resumoExterno: dados.resumoExterno,
                fontesExternas: dados.fontesExternas,
                enriquecidoEm: new Date().toISOString(),
              }
            : s
        )
      )
    } catch (erro: any) {
      setUltimaMensagem(erro?.message || 'Erro ao pesquisar fontes externas.')
    } finally {
      setAEnriquecer(null)
    }
  }

  async function actualizarSugestoes() {
    setAActualizar(true)
    setUltimaMensagem(null)
    try {
      const respostaPost = await fetch('/api/admin/sugestoes-datasets', { method: 'POST' })
      const dadosPost = await respostaPost.json()
      if (!respostaPost.ok) throw new Error(dadosPost.error || 'Falha ao classificar perguntas')

      const respostaGet = await fetch('/api/admin/sugestoes-datasets')
      const dados = await respostaGet.json()
      if (!respostaGet.ok) throw new Error(dados.error || 'Falha ao carregar sugestões')

      setSugestoes(dados.sugestoes)
      setTemasCobertos(dados.temasCobertos)
      setTotalClassificadas(dados.totalPerguntasClassificadas)
      setTiposPorCategoria(dados.tiposPorCategoria || [])
      setUltimaMensagem(
        `${dadosPost.classificadasAgora} pergunta(s) nova(s) classificada(s) de ${dadosPost.total} no total. ` +
          `${dadosPost.categoriasAnalisadas} categoria(s) com pouca cobertura analisada(s).`
      )
    } catch (erro: any) {
      setUltimaMensagem(erro?.message || 'Erro ao actualizar sugestões.')
    } finally {
      setAActualizar(false)
    }
  }

  const temasComCobertura = temasCobertos.filter((t) => t.jaCoberto).length
  const percentagemCobertura = temasCobertos.length > 0 ? Math.round((temasComCobertura / temasCobertos.length) * 100) : 0
  const maxTotalTema = Math.max(1, ...temasCobertos.map((t) => t.total))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-green-600" />
            Sugestões de Datasets
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Baseado em perguntas reais feitas ao AI Insights. Toda sugestão aponta para as perguntas que a
            motivam; nenhuma fonte é apresentada como confirmada sem validação humana.
          </p>
        </div>
        <button
          onClick={actualizarSugestoes}
          disabled={aActualizar}
          className="inline-flex items-center gap-2 rounded-lg bg-[#064E2C] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[#04361F] disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${aActualizar ? 'animate-spin' : ''}`} />
          {aActualizar ? 'A classificar perguntas novas...' : 'Actualizar sugestões'}
        </button>
      </div>

      {ultimaMensagem && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          {ultimaMensagem}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Perguntas classificadas</p>
          <p className="text-3xl font-bold text-gray-900">{totalClassificadas}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sugestões activas</p>
          <p className="text-3xl font-bold text-gray-900">{sugestoes.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Temas identificados</p>
          <p className="text-3xl font-bold text-gray-900">{temasCobertos.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Já cobertos no catálogo</p>
          <p className="text-3xl font-bold text-gray-900">{percentagemCobertura}%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Target className="w-4 h-4 text-green-600" />
          <h2 className="text-sm font-bold text-gray-900">Datasets sugeridos</h2>
          <span className="text-xs text-gray-400">({totalClassificadas} pergunta(s) já classificada(s))</span>
        </div>
        {sugestoes.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">
            Ainda sem sugestões com procura suficiente. Carregue em "Actualizar sugestões" para classificar
            perguntas novas, ou aguarde mais perguntas serem feitas no portal.
          </p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {sugestoes.map((s) => (
              <li key={s.tema} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-sm font-bold text-gray-900 capitalize">{s.tema.replace(/_/g, ' ')}</h3>
                  <div className="flex items-center gap-3">
                    <Sparkline valores={s.tendenciaSemanal} />
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {tendenciaLabel(s.tendenciaSemanal)}
                    </span>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-green-50 text-green-700">
                      {s.totalSemCobertura} pergunta(s) sem cobertura
                    </span>
                  </div>
                </div>

                {s.entidadesNaoReconhecidas.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Entidades citadas que podem não ter correspondência no portal: {s.entidadesNaoReconhecidas.join(', ')}
                  </p>
                )}

                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2 inline-block">
                  Fonte institucional provável: a confirmar por uma pessoa antes de qualquer publicação.
                </p>

                {s.resumoExterno && (
                  <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-700">{s.resumoExterno}</p>
                    {s.nivelGeograficoSugerido && (
                      <p className="text-xs text-gray-500 mt-1">
                        Nível geográfico sugerido: <span className="font-semibold">{s.nivelGeograficoSugerido}</span>
                      </p>
                    )}
                    {s.fontesExternas.length > 0 && (
                      <ul className="mt-1.5 space-y-1">
                        {s.fontesExternas.map((f, i) => (
                          <li key={i}>
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {f.titulo}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <ul className="mt-2 space-y-1">
                  {s.perguntasExemplo.map((p, i) => (
                    <li key={i} className="text-xs text-gray-500 truncate" title={p}>
                      "{p}"
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {s.emAvaliacao ? (
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700">
                      Em avaliação
                    </span>
                  ) : (
                    <button
                      onClick={() => marcarEmAvaliacao(s.tema)}
                      disabled={aMarcar === s.tema}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {aMarcar === s.tema ? 'A marcar...' : 'Marcar como em avaliação'}
                    </button>
                  )}

                  <button
                    onClick={() => enriquecer(s.tema)}
                    disabled={aEnriquecer === s.tema}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Search className="w-3.5 h-3.5" />
                    {aEnriquecer === s.tema ? 'A pesquisar...' : s.resumoExterno ? 'Pesquisar de novo' : 'Pesquisar fontes externas'}
                  </button>

                  <Link
                    href={`/admin?sugerirTitulo=${encodeURIComponent(`Dados de ${s.tema.replace(/_/g, ' ')}`)}&sugerirPalavrasChave=${encodeURIComponent(s.tema.replace(/_/g, ' '))}&sugerirTipo=alfanumerico`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#064E2C] text-white text-xs font-semibold px-3 py-1.5 hover:bg-[#04361F]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Criar dataset a partir desta sugestão
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-green-600" />
          <h2 className="text-sm font-bold text-gray-900">Categorias com pouca cobertura: que tipo de dataset cadastrar</h2>
        </div>
        {tiposPorCategoria.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">
            Ainda sem análise por categoria. Carregue em "Actualizar sugestões" para gerar tipos
            concretos de dataset a cadastrar por categoria fraca.
          </p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {tiposPorCategoria.map((c) => (
              <li key={c.categoriaId} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-sm font-bold text-gray-900">{c.categoria}</h3>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-gray-100 text-gray-600">
                      {c.totalDatasets} dataset(s) no catálogo
                    </span>
                    {c.perguntasRelacionadas > 0 && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-green-50 text-green-700">
                        {c.perguntasRelacionadas} pergunta(s) real(is) relacionada(s)
                      </span>
                    )}
                  </div>
                </div>
                <ul className="mt-2.5 space-y-1.5">
                  {c.tiposSugeridos.map((tipo, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-gray-700">
                      <ListChecks className="w-3.5 h-3.5 text-[#064E2C] mt-0.5 shrink-0" />
                      {tipo}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2.5 inline-block">
                  Sugestão de tipo de dataset: fonte institucional a confirmar por uma pessoa antes de qualquer publicação.
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-bold text-gray-900">Temas classificados (todos)</h2>
        </div>
        {temasCobertos.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">
            Nenhuma pergunta classificada ainda. Carregue em "Actualizar sugestões" para começar.
          </p>
        ) : (
          <div className="p-5 space-y-2.5">
            {temasCobertos.map((t) => (
              <div key={t.tema} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-[13px] text-gray-700 sm:w-40 sm:shrink-0 sm:truncate capitalize">
                  {t.tema.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${t.jaCoberto ? 'bg-gray-300' : 'bg-[#064E2C]'}`}
                      style={{ width: `${Math.max(2, (t.total / maxTotalTema) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[12px] font-bold text-gray-800 tabular-nums">
                    {t.total}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold shrink-0 ${
                      t.jaCoberto ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700'
                    }`}
                  >
                    {t.jaCoberto ? 'Coberto' : 'Sem cobertura'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Tags className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-bold text-gray-900">Palavras-chave mais frequentes (sem modelo)</h2>
        </div>
        {palavrasChave.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">Ainda não há perguntas suficientes.</p>
        ) : (
          <div className="p-5 flex flex-wrap gap-2">
            {palavrasChave.map((g) => (
              <span
                key={g.palavra}
                title={g.exemplos.join(' | ')}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
              >
                {g.palavra}
                <span className="font-bold text-gray-900">{g.total}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
