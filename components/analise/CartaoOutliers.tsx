import { Sigma } from 'lucide-react'

function formatarValor(v: number): string {
  const casas = Number.isInteger(v) ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2
  return v.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/**
 * Cartão de outliers (PLANO-DATAPROPROMAX.md, componentes ilustrativos): unidades fora do
 * intervalo de Tukey (Q1-1,5·IQR a Q3+1,5·IQR), calculado aqui sobre a mesma série que já
 * alimenta o mapa/gráfico — não é um cálculo novo do motor, é a mesma regra de
 * `detectarOutliers` (lib/analysis/library/estatistica.ts) aplicada do lado do cliente sobre
 * dados já reais, para não depender de o plano ter pedido esse passo explicitamente.
 */
export function CartaoOutliers({
  unidades,
  metrica,
}: {
  unidades: { codigo: string; nome: string; valor: number }[]
  metrica: string
}) {
  if (unidades.length < 4) return null

  const valores = unidades.map((u) => u.valor).sort((a, b) => a - b)
  const q1 = valores[Math.floor(valores.length * 0.25)]
  const q3 = valores[Math.floor(valores.length * 0.75)]
  const iqr = q3 - q1
  const limiteInferior = q1 - 1.5 * iqr
  const limiteSuperior = q3 + 1.5 * iqr

  const outliers = unidades
    .filter((u) => u.valor < limiteInferior || u.valor > limiteSuperior)
    .sort((a, b) => Math.abs(b.valor - (b.valor > q3 ? q3 : q1)) - Math.abs(a.valor - (a.valor > q3 ? q3 : q1)))

  if (outliers.length === 0) return null

  return (
    // Dourado, e não uma cor de alarme: um valor fora do padrão é um facto interessante dos
    // dados, não um problema com a análise — o âmbar e o vermelho ficam reservados para avisos
    // genuínos, e pintar este cartão de alarme fazia parecer errada uma análise correcta.
    <section className="pdx-panel mb-5">
      <div className="pdx-panel-head">
        <span className="pdx-panel-icone" aria-hidden>
          <Sigma className="size-3.5" />
        </span>
        <h2>
          {outliers.length} {outliers.length === 1 ? 'unidade fora do padrão' : 'unidades fora do padrão'}
        </h2>
        <span className="pdx-panel-sub">{metrica}</span>
      </div>
      <div className="pdx-panel-body">
        <div className="flex flex-wrap gap-2">
          {outliers.slice(0, 6).map((u) => (
            <span key={u.codigo} className="pdx-fora">
              <span className="pdx-fora-nome">{u.nome}</span>
              <span className="pdx-fora-valor">{formatarValor(u.valor)}</span>
            </span>
          ))}
        </div>
        <p className="text-[11.5px] mt-3" style={{ color: 'var(--ink-faint)' }}>
          Valores claramente acima ou abaixo da maioria das unidades.
        </p>
      </div>
    </section>
  )
}
