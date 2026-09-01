'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Rows3 } from 'lucide-react'

function formatarValor(v: number): string {
  const casas = Number.isInteger(v) ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2
  return v.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/**
 * Tabela com subtotal por província (PLANO-DATAPROPROMAX.md: "tabela dinâmica com totais").
 * Um pivot completo (duas dimensões categóricas cruzadas) exigiria dados que o motor não produz
 * hoje para a maioria das perguntas; esta é a versão que os dados já suportam sem inventar nada:
 * agrupar as unidades (distrito/posto) pela sua província (pcode truncado, mesma convenção de
 * agregarPorUnidade) e mostrar o subtotal de cada província e o total geral.
 */
export function TabelaResumoProvincia({
  unidades,
  metrica,
  provincias,
}: {
  unidades: { codigo: string; nome: string; valor: number }[]
  metrica: string
  provincias: { codigo: string; nome: string }[]
}) {
  const [abertas, setAbertas] = useState<Set<string>>(new Set())

  const grupos = new Map<string, { nome: string; unidades: typeof unidades; total: number }>()
  for (const u of unidades) {
    const codigoProv = u.codigo.slice(0, 2)
    const nomeProv = provincias.find((p) => p.codigo === codigoProv)?.nome || codigoProv
    const g = grupos.get(codigoProv) || { nome: nomeProv, unidades: [], total: 0 }
    g.unidades.push(u)
    g.total += u.valor
    grupos.set(codigoProv, g)
  }
  const gruposOrdenados = Array.from(grupos.entries()).sort((a, b) => b[1].total - a[1].total)
  const totalGeral = unidades.reduce((s, u) => s + u.valor, 0)

  if (gruposOrdenados.length < 2) return null

  function alternar(codigo: string) {
    setAbertas((prev) => {
      const seguinte = new Set(prev)
      if (seguinte.has(codigo)) seguinte.delete(codigo)
      else seguinte.add(codigo)
      return seguinte
    })
  }

  return (
    <section className="pdx-panel mb-5">
      <div className="pdx-panel-head">
        <span className="pdx-panel-icone" aria-hidden>
          <Rows3 className="size-3.5" />
        </span>
        <h2>Resumo por província</h2>
        <span className="pdx-panel-sub">{metrica}</span>
      </div>
      <div className="pdx-panel-body">
      <div className="pdx-tabela-caixa">
        {gruposOrdenados.map(([codigo, g]) => {
          const aberta = abertas.has(codigo)
          return (
            <div key={codigo} style={{ borderBottom: '1px solid var(--line-soft)' }}>
              <button
                type="button"
                onClick={() => alternar(codigo)}
                aria-expanded={aberta}
                className="pdx-linha-grupo"
              >
                <span className="pdx-linha-grupo-nome">
                  {aberta ? (
                    <ChevronDown className="size-3.5" style={{ color: 'var(--ink-faint)' }} aria-hidden />
                  ) : (
                    <ChevronRight className="size-3.5" style={{ color: 'var(--ink-faint)' }} aria-hidden />
                  )}
                  {g.nome}
                  <span className="pdx-linha-grupo-conta">({g.unidades.length})</span>
                </span>
                <span className="pdx-linha-grupo-valor">{formatarValor(g.total)}</span>
              </button>
              {aberta && (
                <ul className="pdx-sublista">
                  {g.unidades
                    .sort((a, b) => b.valor - a.valor)
                    .map((u) => (
                      <li key={u.codigo}>
                        <span className="truncate">{u.nome}</span>
                        <span>{formatarValor(u.valor)}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )
        })}
        <div className="pdx-linha-total">
          <span>Total geral</span>
          <span>{formatarValor(totalGeral)}</span>
        </div>
      </div>
      </div>
    </section>
  )
}
