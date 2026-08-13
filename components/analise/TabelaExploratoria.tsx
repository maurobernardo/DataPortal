'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpDown, Download, Loader2, Map as MapIcon, Search } from 'lucide-react'
import { rotularColuna } from '@/lib/analysis/rotulos-cliente'

type Dataset = { id: number; titulo: string }
type Ordenacao = { coluna: string; direccao: 'asc' | 'desc' } | null

/**
 * Datasets vindos de fontes como OpenStreetMap têm dezenas de colunas de atributos que quase
 * nunca são preenchidas (ex.: "Emergency", "Addr Full") — mostrá-las é uma parede de células
 * vazias que não ajuda ninguém a explorar os dados. Remove colunas 100% vazias na amostra
 * carregada antes de desenhar a tabela.
 */
function filtrarColunasVazias(colunas: string[], linhas: string[][]): { colunas: string[]; linhas: string[][] } {
  const temValor = colunas.map((_, i) => linhas.some((l) => (l[i] || '').trim() !== ''))
  if (temValor.every(Boolean)) return { colunas, linhas }
  return {
    colunas: colunas.filter((_, i) => temValor[i]),
    linhas: linhas.map((l) => l.filter((_, i) => temValor[i])),
  }
}

/**
 * Reaproveita a mesma API pública de pré-visualização usada na página do dataset
 * (/api/datasets/[id]/preview) em vez de guardar a tabela completa em `resultados` — isso já
 * causou um bug real de max_allowed_packet com geometria bruta; dados tabulares completos
 * teriam o mesmo problema em datasets maiores. A pré-visualização (50 linhas para tabelas, 500
 * feições para geoespaciais — limites da própria API) chega para pesquisar, ordenar e filtrar;
 * para o ficheiro completo, a exportação/página do dataset servem.
 */
function useTabelaDataset(datasetId: number) {
  const [estado, setEstado] = useState<'a_carregar' | 'pronto' | 'vazio' | 'erro'>('a_carregar')
  const [colunas, setColunas] = useState<string[]>([])
  const [linhas, setLinhas] = useState<string[][]>([])
  const [limiteAmostra, setLimiteAmostra] = useState(0)

  useEffect(() => {
    let cancelado = false
    setEstado('a_carregar')
    fetch(`/api/datasets/${datasetId}/preview`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelado) return
        if (d?.type === 'table' && Array.isArray(d.columns) && d.columns.length > 0) {
          const filtradas = filtrarColunasVazias(d.columns, d.rows || [])
          setColunas(filtradas.colunas)
          setLinhas(filtradas.linhas)
          setLimiteAmostra(50)
          setEstado('pronto')
        } else if (d?.type === 'geo' && Array.isArray(d.geojson?.features) && d.geojson.features.length > 0) {
          const chaves = new Set<string>()
          for (const f of d.geojson.features) Object.keys(f?.properties || {}).forEach((k) => chaves.add(k))
          const cols = Array.from(chaves)
          const linhasBrutas = d.geojson.features.map((f: any) => cols.map((c) => String(f?.properties?.[c] ?? '')))
          const filtradas = filtrarColunasVazias(cols, linhasBrutas)
          setColunas(filtradas.colunas)
          setLinhas(filtradas.linhas)
          setLimiteAmostra(500)
          setEstado('pronto')
        } else {
          setEstado('vazio')
        }
      })
      .catch(() => !cancelado && setEstado('erro'))
    return () => {
      cancelado = true
    }
  }, [datasetId])

  return { estado, colunas, linhas, limiteAmostra }
}

function TabelaDataset({
  dataset,
  temNoMapa,
  aoClicarLinha,
  valorDestacado,
}: {
  dataset: Dataset
  temNoMapa: boolean
  aoClicarLinha?: (valores: string[]) => void
  valorDestacado?: string | null
}) {
  const { estado, colunas, linhas, limiteAmostra } = useTabelaDataset(dataset.id)
  const [pesquisa, setPesquisa] = useState('')
  const [ordenacao, setOrdenacao] = useState<Ordenacao>(null)
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set())
  const [colunaFiltro, setColunaFiltro] = useState<string | null>(null)
  const [valorFiltro, setValorFiltro] = useState('')

  const iColunaFiltro = colunaFiltro ? colunas.indexOf(colunaFiltro) : -1
  const iColunaOrdenacao = ordenacao ? colunas.indexOf(ordenacao.coluna) : -1

  const linhasFiltradas = useMemo(() => {
    let r = linhas
    if (pesquisa.trim()) {
      const termo = pesquisa.trim().toLowerCase()
      r = r.filter((linha) => linha.some((v) => v.toLowerCase().includes(termo)))
    }
    if (iColunaFiltro >= 0 && valorFiltro.trim()) {
      const termo = valorFiltro.trim().toLowerCase()
      r = r.filter((linha) => (linha[iColunaFiltro] || '').toLowerCase().includes(termo))
    }
    if (iColunaOrdenacao >= 0 && ordenacao) {
      const mult = ordenacao.direccao === 'asc' ? 1 : -1
      r = [...r].sort((a, b) => {
        const va = a[iColunaOrdenacao] || ''
        const vb = b[iColunaOrdenacao] || ''
        const na = Number.parseFloat(va)
        const nb = Number.parseFloat(vb)
        if (Number.isFinite(na) && Number.isFinite(nb)) return (na - nb) * mult
        return va.localeCompare(vb) * mult
      })
    }
    return r
  }, [linhas, pesquisa, iColunaFiltro, valorFiltro, iColunaOrdenacao, ordenacao])

  function alternarOrdenacao(coluna: string) {
    setOrdenacao((prev) => {
      if (!prev || prev.coluna !== coluna) return { coluna, direccao: 'asc' }
      if (prev.direccao === 'asc') return { coluna, direccao: 'desc' }
      return null
    })
  }

  function alternarSeleccao(i: number) {
    setSeleccionadas((prev) => {
      const seguinte = new Set(prev)
      if (seguinte.has(i)) seguinte.delete(i)
      else seguinte.add(i)
      return seguinte
    })
  }

  function exportarCsv() {
    const alvo = seleccionadas.size > 0 ? linhasFiltradas.filter((_, i) => seleccionadas.has(i)) : linhasFiltradas
    const escapar = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const csv = [colunas.map(escapar).join(';'), ...alvo.map((l) => l.map((v) => escapar(v || '')).join(';'))].join('\n')
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dataset.titulo.replace(/[^\w\-]+/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function verNoMapa() {
    if (temNoMapa) {
      document.getElementById(`camada-mapa-${dataset.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  if (estado === 'a_carregar') {
    return (
      <div className="flex items-center gap-2 text-[13px] text-gray-500 py-8 justify-center">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        A carregar {dataset.titulo}…
      </div>
    )
  }
  if (estado === 'vazio' || estado === 'erro') {
    return (
      <div className="text-[13px] text-gray-500 py-8 text-center">
        Sem pré-visualização tabular disponível para este dataset.{' '}
        <Link href={`/dataset/${dataset.id}`} className="text-[#064E2C] font-semibold hover:underline">
          Ver na página do dataset
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" aria-hidden />
          <input
            type="text"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Pesquisar…"
            className="pl-8 pr-3 py-1.5 text-[12.5px] rounded-lg border border-[#E2E8E5] w-48 focus:outline-none focus:ring-2 focus:ring-[#064E2C]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={colunaFiltro || ''}
            onChange={(e) => {
              setColunaFiltro(e.target.value || null)
              setValorFiltro('')
            }}
            className="text-[12px] rounded-lg border border-[#E2E8E5] px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#064E2C]"
          >
            <option value="">Filtrar coluna…</option>
            {colunas.map((c) => (
              <option key={c} value={c}>
                {rotularColuna(c)}
              </option>
            ))}
          </select>
          {colunaFiltro && (
            <input
              type="text"
              value={valorFiltro}
              onChange={(e) => setValorFiltro(e.target.value)}
              placeholder={`valor em "${rotularColuna(colunaFiltro)}"`}
              className="text-[12px] rounded-lg border border-[#E2E8E5] px-2 py-1.5 w-32 focus:outline-none focus:ring-2 focus:ring-[#064E2C]"
            />
          )}
          {temNoMapa && (
            <button
              type="button"
              onClick={verNoMapa}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8E5] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--pd-ink-700)] hover:border-[#CFE3D6]"
            >
              <MapIcon className="size-3.5" aria-hidden />
              Ver no mapa
            </button>
          )}
          <button
            type="button"
            onClick={exportarCsv}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8E5] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--pd-ink-700)] hover:border-[#CFE3D6]"
          >
            <Download className="size-3.5" aria-hidden />
            {seleccionadas.size > 0 ? `Exportar (${seleccionadas.size})` : 'Exportar CSV'}
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-[#E2E8E5] max-h-[420px]">
        <table className="w-full text-[12.5px] border-collapse">
          <thead className="sticky top-0 bg-[#F7F9F8] z-10">
            <tr>
              <th className="px-2 py-2 w-8">
                <input
                  type="checkbox"
                  checked={seleccionadas.size > 0 && seleccionadas.size === linhasFiltradas.length}
                  onChange={(e) =>
                    setSeleccionadas(e.target.checked ? new Set(linhasFiltradas.map((_, i) => i)) : new Set())
                  }
                  aria-label="Seleccionar todas as linhas"
                />
              </th>
              {colunas.map((c) => (
                <th key={c} className="text-left px-3 py-2 font-bold text-[var(--pd-ink-700)] whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => alternarOrdenacao(c)}
                    className="inline-flex items-center gap-1 hover:text-[#064E2C]"
                  >
                    {rotularColuna(c)}
                    <ArrowUpDown className="size-3" aria-hidden />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhasFiltradas.map((linha, i) => {
              const destacada = !!valorDestacado && linha.some((v) => v === valorDestacado)
              return (
                <tr
                  key={i}
                  onClick={() => aoClicarLinha?.(linha)}
                  className={`border-t border-[#E2E8E5] ${aoClicarLinha ? 'cursor-pointer hover:bg-[#F7F9F8]' : ''} ${
                    destacada ? 'bg-[#F0F7F2]' : seleccionadas.has(i) ? 'bg-[#F7F9F8]' : ''
                  }`}
                >
                  <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={seleccionadas.has(i)}
                      onChange={() => alternarSeleccao(i)}
                      aria-label={`Seleccionar linha ${i + 1}`}
                    />
                  </td>
                  {linha.map((v, j) => (
                    <td
                      key={j}
                      className={`px-3 py-1.5 whitespace-nowrap max-w-[240px] truncate ${
                        destacada && v === valorDestacado ? 'font-bold text-[#064E2C]' : 'text-[var(--pd-ink-800)]'
                      }`}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400 mt-2 px-1">
        {linhasFiltradas.length} de {linhas.length} registos mostrados
        {linhas.length >= limiteAmostra ? ` (amostra dos primeiros ${limiteAmostra} do dataset)` : ''}.
      </p>
    </div>
  )
}

export function TabelaExploratoria({
  datasets,
  datasetIdsComMapa,
  aoClicarLinha,
  valorDestacado,
}: {
  datasets: Dataset[]
  datasetIdsComMapa: number[]
  /** Clicar numa linha destaca a categoria correspondente nos gráficos da análise, quando o
   *  valor clicado coincide com uma das categorias que algum gráfico já mostra. */
  aoClicarLinha?: (valores: string[]) => void
  valorDestacado?: string | null
}) {
  const [activo, setActivo] = useState(0)
  if (datasets.length === 0) return null

  return (
    <section className="rounded-2xl border border-[#E2E8E5] bg-white p-5 mb-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-base font-bold text-[var(--pd-ink-900)]">Tabela Exploratória</h2>
          {aoClicarLinha && <p className="text-[11px] text-gray-400 mt-0.5">Clique numa linha para destacar nos gráficos</p>}
        </div>
        {datasets.length > 1 && (
          <div className="inline-flex rounded-lg border border-[#E2E8E5] p-0.5">
            {datasets.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setActivo(i)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  activo === i ? 'bg-[#064E2C] text-white' : 'text-[var(--pd-ink-700)] hover:bg-gray-50'
                }`}
              >
                {d.titulo}
              </button>
            ))}
          </div>
        )}
      </div>
      <TabelaDataset
        dataset={datasets[activo]}
        temNoMapa={datasetIdsComMapa.includes(datasets[activo].id)}
        aoClicarLinha={aoClicarLinha}
        valorDestacado={valorDestacado}
      />
    </section>
  )
}
