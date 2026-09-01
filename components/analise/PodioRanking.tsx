import { Trophy } from 'lucide-react'

const ROTULO_LUGAR = ['1º', '2º', '3º']

function formatarValor(v: number): string {
  const casas = Number.isInteger(v) ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2
  return v.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/**
 * Pódio de ranking (PLANO-DATAPROPROMAX.md, componentes ilustrativos): as 3 maiores unidades em
 * destaque, com a diferença percentual para o líder — não é um cálculo novo, é a mesma série que
 * já alimenta o mapa/gráfico, só reapresentada de forma mais rápida de ler do que uma tabela.
 */
export function PodioRanking({
  unidades,
  metrica,
}: {
  unidades: { codigo: string; nome: string; valor: number }[]
  metrica: string
}) {
  const topo = [...unidades].sort((a, b) => b.valor - a.valor).slice(0, 3)
  if (topo.length < 2) return null
  const lider = topo[0].valor

  return (
    <section className="pdx-panel mb-5">
      <div className="pdx-panel-head">
        <span className="pdx-panel-icone" aria-hidden>
          <Trophy className="size-3.5" />
        </span>
        <h2>Pódio</h2>
        <span className="pdx-panel-sub">{metrica}</span>
      </div>
      <div className="pdx-panel-body grid grid-cols-1 sm:grid-cols-3 gap-3">
        {topo.map((u, i) => {
          const diferenca = lider > 0 ? Math.round(((u.valor - lider) / lider) * 100) : 0
          return (
            <div key={u.codigo} className="pdx-podio-item" data-lugar={i + 1}>
              <span className="pdx-podio-medalha">{ROTULO_LUGAR[i]}</span>
              <div className="min-w-0">
                <p className="pdx-podio-nome truncate" title={u.nome}>
                  {u.nome}
                </p>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="pdx-podio-valor">{formatarValor(u.valor)}</span>
                  {i > 0 && <span className="pdx-podio-face">{diferenca}% face ao 1º</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
