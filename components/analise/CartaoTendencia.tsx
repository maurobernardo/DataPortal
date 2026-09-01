import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

function formatarValor(v: number): string {
  const casas = Number.isInteger(v) ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2
  return v.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/**
 * Cartão de tendência (PLANO-DATAPROPROMAX.md, componentes ilustrativos): quando um dos gráficos
 * é uma série temporal, mostra a variação entre o primeiro e o último ponto em destaque, com a
 * seta a apontar na direcção certa. Não é um cálculo novo: é o mesmo gráfico já produzido,
 * reapresentado para se ler em 2 segundos em vez de precisar de ler o eixo inteiro.
 */
export function CartaoTendencia({
  titulo,
  eixoX,
  valores,
}: {
  titulo: string
  eixoX: string[]
  valores: (number | null)[]
}) {
  const pontosValidos = valores
    .map((v, i) => (v != null ? { x: eixoX[i], v } : null))
    .filter((p): p is { x: string; v: number } => p != null)
  if (pontosValidos.length < 2) return null

  const primeiro = pontosValidos[0]
  const ultimo = pontosValidos[pontosValidos.length - 1]
  const variacaoAbs = ultimo.v - primeiro.v
  const variacaoPct = primeiro.v !== 0 ? (variacaoAbs / Math.abs(primeiro.v)) * 100 : null
  const direccao = variacaoAbs > 0 ? 'subida' : variacaoAbs < 0 ? 'queda' : 'estavel'
  // A direcção fica na seta, e não na cor: verde a subir e vermelho a descer diziam "bom" e "mau",
  // um juízo que os dados não sustentam — este componente não sabe se a métrica é cobertura
  // vacinal ou casos de cólera, e numa delas subir é exactamente a má notícia.
  const Icone = direccao === 'subida' ? ArrowUpRight : direccao === 'queda' ? ArrowDownRight : Minus
  const descricao = direccao === 'subida' ? 'Subiu' : direccao === 'queda' ? 'Desceu' : 'Manteve-se'

  return (
    <section className="pdx-panel mb-5">
      <div className="pdx-panel-head">
        <span className="pdx-panel-icone" aria-hidden>
          <Icone className="size-3.5" />
        </span>
        <h2>Tendência</h2>
        <span className="pdx-panel-sub">{titulo}</span>
      </div>
      <div className="pdx-panel-body flex items-center gap-4">
        <span className="pdx-tendencia-icone">
          <Icone className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="pdx-tendencia-valor">
              <span className="sr-only">{descricao} </span>
              {variacaoAbs > 0 ? '+' : ''}
              {formatarValor(variacaoAbs)}
              {variacaoPct != null && ` (${variacaoPct > 0 ? '+' : ''}${formatarValor(variacaoPct)}%)`}
            </span>
            <span className="pdx-tendencia-intervalo">
              de {primeiro.x} ({formatarValor(primeiro.v)}) a {ultimo.x} ({formatarValor(ultimo.v)})
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
