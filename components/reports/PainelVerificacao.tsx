'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, ScaleIcon, Search } from 'lucide-react'

/**
 * Verifica os números deste relatório contra um dataset do portal.
 *
 * Painel de trabalho da equipa do portal, não da pessoa que lê o relatório: comparar um número com
 * o dataset certo exige saber que dataset é esse, e isso é conhecimento de quem gere o catálogo,
 * não de quem só quer ler o relatório. Vive dentro do painel administrativo (Tailwind), por isso
 * usa as mesmas classes utilitárias do resto do formulário, e não o sistema `rpt-*` da página
 * pública do relatório.
 *
 * O dataset escolhe-se pelo NOME, como em qualquer pesquisa do portal, nunca por um identificador
 * numérico: um "ID do dataset" só significa alguma coisa para quem já decorou o catálogo de cor.
 */

type Dataset = { id: number; title: string }

export function PainelVerificacao({ reportId }: { reportId: number }) {
  const [pesquisa, setPesquisa] = useState('')
  const [resultadosPesquisa, setResultadosPesquisa] = useState<Dataset[]>([])
  const [aPesquisar, setAPesquisar] = useState(false)
  const [datasetEscolhido, setDatasetEscolhido] = useState<Dataset | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [nivelGeo, setNivelGeo] = useState<'admin1' | 'admin2' | 'admin3'>('admin1')
  const [colunaMetrica, setColunaMetrica] = useState('')
  const [colunaIndicador, setColunaIndicador] = useState('')
  const [valorIndicador, setValorIndicador] = useState('')
  const [colunaTempo, setColunaTempo] = useState('')
  const [unidadeMetrica, setUnidadeMetrica] = useState('')
  const [aVerificar, setAVerificar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultados, setResultados] = useState<any[] | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!pesquisa.trim() || datasetEscolhido) {
      setResultadosPesquisa([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setAPesquisar(true)
      try {
        const r = await fetch(`/api/datasets?search=${encodeURIComponent(pesquisa.trim())}&take=8`)
        const d = await r.json()
        setResultadosPesquisa(Array.isArray(d) ? d.map((x: any) => ({ id: x.id, title: x.title })) : [])
      } catch {
        setResultadosPesquisa([])
      } finally {
        setAPesquisar(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [pesquisa, datasetEscolhido])

  async function verificar() {
    if (!datasetEscolhido) return
    setAVerificar(true)
    setErro(null)
    setResultados(null)
    try {
      const r = await fetch(`/api/reports/${reportId}/verificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId: datasetEscolhido.id,
          nivelGeo,
          colunaMetrica: colunaMetrica || undefined,
          colunaIndicador: colunaIndicador || undefined,
          valorIndicador: valorIndicador || undefined,
          colunaTempo: colunaTempo || undefined,
          unidadeMetrica: unidadeMetrica || undefined,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível verificar')
      setResultados(d.resultados)
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível verificar')
    } finally {
      setAVerificar(false)
    }
  }

  const corBorda: Record<string, string> = {
    confirma: 'border-l-green-600',
    diverge: 'border-l-amber-500',
    nao_comparavel: 'border-l-gray-300',
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <ScaleIcon className="w-4 h-4 text-amber-600" />
        Compare os números deste relatório com um conjunto de dados do catálogo
      </p>

      <label className="block relative">
        <span className="text-xs font-semibold text-gray-600">Qual conjunto de dados?</span>
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 bg-white">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            value={datasetEscolhido ? datasetEscolhido.title : pesquisa}
            onChange={(e) => {
              setDatasetEscolhido(null)
              setPesquisa(e.target.value)
            }}
            placeholder="Escreva o nome do conjunto de dados…"
            className="flex-1 min-w-0 text-sm outline-none"
          />
          {aPesquisar && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>
        {resultadosPesquisa.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {resultadosPesquisa.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => {
                    setDatasetEscolhido(d)
                    setResultadosPesquisa([])
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-green-50"
                >
                  {d.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </label>

      {datasetEscolhido && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Nível geográfico</span>
              <select
                value={nivelGeo}
                onChange={(e) => setNivelGeo(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="admin1">Província</option>
                <option value="admin2">Distrito</option>
                <option value="admin3">Posto administrativo</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Coluna com o valor a comparar</span>
              <input
                value={colunaMetrica}
                onChange={(e) => setColunaMetrica(e.target.value)}
                placeholder="ex.: value"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Unidade de medida</span>
              <input
                value={unidadeMetrica}
                onChange={(e) => setUnidadeMetrica(e.target.value)}
                placeholder="ex.: toneladas"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Coluna do ano (se existir)</span>
              <input
                value={colunaTempo}
                onChange={(e) => setColunaTempo(e.target.value)}
                placeholder="ex.: year"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-gray-600">
                Coluna que identifica o indicador (só em ficheiros com vários indicadores na mesma coluna)
              </span>
              <input
                value={colunaIndicador}
                onChange={(e) => setColunaIndicador(e.target.value)}
                placeholder="ex.: variable_name_pt"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-gray-600">Nome exacto do indicador a isolar</span>
              <input
                value={valorIndicador}
                onChange={(e) => setValorIndicador(e.target.value)}
                placeholder="ex.: Produção de milho (toneladas)"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={verificar}
            disabled={aVerificar}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {aVerificar && <Loader2 className="w-4 h-4 animate-spin" />}
            Comparar
          </button>
        </>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {resultados && (
        <ul className="space-y-2">
          {resultados.map((r, i) => (
            <li
              key={i}
              className={`rounded-lg border-l-4 bg-gray-50 p-3 ${corBorda[r.veredicto.estado] || 'border-l-gray-300'}`}
            >
              <p className="text-sm font-semibold text-gray-800">{r.afirmacao.texto}</p>
              {r.veredicto.estado === 'nao_comparavel' ? (
                <p className="text-xs text-gray-500 mt-1">Não foi possível comparar: {r.veredicto.razao}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Relatório: {r.afirmacao.valor} {r.afirmacao.unidade} · Portal: {r.veredicto.valorPortal.toFixed(1)}{' '}
                  {r.veredicto.unidade}
                  {' · '}
                  {r.veredicto.estado === 'confirma' ? 'os valores batem certo' : 'os valores divergem'}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
