/** Mini-gráfico de tendência dentro de um cartão de KPI — só aparece quando o cálculo vem de uma
 *  série temporal real (o chamador já verificou isso); não desenha nada a partir de menos de 2
 *  pontos, porque uma linha entre um ponto só não mostra tendência nenhuma. */
export function Sparkline({ valores, cor = '#064E2C' }: { valores: (number | null)[]; cor?: string }) {
  const nums = valores.filter((v): v is number => typeof v === 'number')
  if (nums.length < 2) return null

  const w = 60
  const h = 20
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const amplitude = max - min || 1
  const pontos = nums
    .map((v, i) => `${(i / (nums.length - 1)) * w},${h - ((v - min) / amplitude) * (h - 3) - 1.5}`)
    .join(' ')
  const ultimo = nums[nums.length - 1]
  const ultimoX = w
  const ultimoY = h - ((ultimo - min) / amplitude) * (h - 3) - 1.5

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden>
      <polyline points={pontos} fill="none" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <circle cx={ultimoX} cy={ultimoY} r="2" fill={cor} />
    </svg>
  )
}
