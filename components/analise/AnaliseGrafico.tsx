'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'

type Grafico = {
  passo_id: string
  tipo: 'linha' | 'barra' | 'pizza' | 'dispersao' | 'area'
  titulo: string
  eixoX: string[]
  series: { nome: string; valores: (number | null)[] }[]
  referencia?: { nome: string; valores: (number | null)[] }
}

/** Ranking de uma só série (ex.: população por província): degraus do verde institucional — é
 *  uma grandeza, não identidades diferentes, por isso um único matiz claro→escuro é o correcto. */
const PALETA_RANKING = ['#064E2C', '#0a6339', '#3D8B5F', '#7BB596', '#B8DBC8', '#CFE3D6']

/** Categorias sem relação de ordem entre si (fatias de pizza, séries nomeadas diferentes):
 *  matizes realmente distintos, não tons do mesmo verde — validado contra daltonismo (ordem fixa,
 *  nunca ciclada), ver skill "dataviz". Um único verde-sobre-verde é ilegível numa legenda. */
const PALETA_CATEGORICA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']

const COR_REFERENCIA = '#B8DBC8'

function corRanking(indice: number): string {
  return PALETA_RANKING[indice % PALETA_RANKING.length]
}

function corCategorica(indice: number): string {
  return PALETA_CATEGORICA[indice % PALETA_CATEGORICA.length]
}

function paraLinhas(g: Grafico) {
  return g.eixoX.map((x, i) => {
    const linha: Record<string, string | number | null> = { x }
    g.series.forEach((s) => {
      linha[s.nome] = s.valores[i] ?? null
    })
    if (g.referencia) linha[g.referencia.nome] = g.referencia.valores[i] ?? null
    return linha
  })
}

function paraFatias(g: Grafico) {
  const valores = g.series[0]?.valores || []
  return g.eixoX.map((nome, i) => ({ nome, valor: valores[i] ?? 0 })).filter((f) => f.valor > 0)
}

function paraPontos(g: Grafico) {
  const y = g.series[0]?.valores || []
  return g.eixoX
    .map((xTexto, i) => ({ x: Number.parseFloat(xTexto), y: y[i] }))
    .filter((p) => Number.isFinite(p.x) && p.y != null)
}

const formatarTooltip = (v: number) => v?.toLocaleString('pt-PT')
const estiloTooltip = { fontSize: 12, borderRadius: 8, border: '1px solid #E2E8E5' }
const COR_ACTIVA = '#B91C1C'

/**
 * Renderiza os gráficos não geográficos que o executor produz (Parte 9). Cada tipo novo de
 * gráfico que o executor vier a produzir só precisa de um novo `tipo` aqui, não de um componente
 * à parte.
 *
 * `aoClicarCategoria` liga o gráfico ao mapa (Parte 20-bis): clicar numa barra ou fatia destaca a
 * unidade correspondente no mapa, em vez de gráfico e mapa serem dois painéis surdos um ao outro.
 */
export function AnaliseGrafico({
  grafico,
  aoClicarCategoria,
  categoriaActiva,
}: {
  grafico: Grafico
  aoClicarCategoria?: (rotulo: string) => void
  categoriaActiva?: string | null
}) {
  const clicavel = !!aoClicarCategoria && (grafico.tipo === 'barra' || grafico.tipo === 'pizza')
  // Muitas categorias com nomes compridos não cabem lado a lado no eixo X sem sobrepor texto:
  // passa a barras horizontais (uma linha por categoria) em vez de espremer rótulos verticais.
  const barrasHorizontais = grafico.tipo === 'barra' && grafico.eixoX.length > 6
  const altura =
    grafico.tipo === 'pizza' ? 280 : barrasHorizontais ? Math.min(560, Math.max(260, grafico.eixoX.length * 30)) : 260

  return (
    <div className="rounded-[14px] border border-[#E2E8E5] bg-white p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-bold text-[var(--pd-ink-900)]">{grafico.titulo}</p>
        {clicavel && <p className="text-[10.5px] text-gray-400 shrink-0">Clique para destacar no mapa</p>}
      </div>
      <ResponsiveContainer width="100%" height={altura}>
        {grafico.tipo === 'linha' ? (
          <LineChart data={paraLinhas(grafico)} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F1" />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
            <Tooltip contentStyle={estiloTooltip} formatter={formatarTooltip} />
            {grafico.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {grafico.referencia && (
              <Line
                type="monotone"
                dataKey={grafico.referencia.nome}
                stroke={COR_REFERENCIA}
                strokeDasharray="4 4"
                dot={false}
                strokeWidth={1.5}
              />
            )}
            {grafico.series.map((s, i) => (
              <Line
                key={s.nome}
                type="monotone"
                dataKey={s.nome}
                stroke={grafico.series.length > 1 ? corCategorica(i) : corRanking(0)}
                strokeWidth={2.5}
                dot={false}
              />
            ))}
          </LineChart>
        ) : grafico.tipo === 'area' ? (
          <AreaChart data={paraLinhas(grafico)} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F1" />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
            <Tooltip contentStyle={estiloTooltip} formatter={formatarTooltip} />
            {grafico.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {grafico.series.map((s, i) => {
              const cor = grafico.series.length > 1 ? corCategorica(i) : corRanking(0)
              return (
                <Area
                  key={s.nome}
                  type="monotone"
                  dataKey={s.nome}
                  stroke={cor}
                  fill={cor}
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              )
            })}
          </AreaChart>
        ) : grafico.tipo === 'pizza' ? (
          <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <Tooltip contentStyle={estiloTooltip} formatter={formatarTooltip} />
            {/* Legenda à direita, não por baixo: com o gráfico à esquerda, o texto nunca cai por
                cima da rosca — só ao lado, por mais entradas que a legenda tenha. */}
            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 11, maxWidth: '42%' }} />
            <Pie
              data={paraFatias(grafico)}
              dataKey="valor"
              nameKey="nome"
              cx="34%"
              cy="50%"
              // Raio em percentagem, não px fixo: num cartão estreito (grelha de 2-3 colunas) um
              // raio fixo de 80px podia ultrapassar o espaço deixado à legenda; em percentagem
              // encolhe com o contentor em vez de ficar por baixo do texto.
              innerRadius="34%"
              outerRadius="60%"
              paddingAngle={2}
              onClick={clicavel ? (d: any) => aoClicarCategoria!(d.nome) : undefined}
              style={clicavel ? { cursor: 'pointer' } : undefined}
            >
              {paraFatias(grafico).map((f, i) => (
                <Cell
                  key={i}
                  fill={corCategorica(i)}
                  stroke={categoriaActiva === f.nome ? COR_ACTIVA : undefined}
                  strokeWidth={categoriaActiva === f.nome ? 3 : undefined}
                />
              ))}
            </Pie>
          </PieChart>
        ) : grafico.tipo === 'dispersao' ? (
          <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F1" />
            <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis type="number" dataKey="y" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <ZAxis range={[40, 40]} />
            <Tooltip contentStyle={estiloTooltip} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={paraPontos(grafico)} fill={corRanking(0)} fillOpacity={0.7} />
          </ScatterChart>
        ) : (
          <BarChart
            data={paraLinhas(grafico)}
            layout={barrasHorizontais ? 'vertical' : 'horizontal'}
            margin={{ top: 8, right: 16, left: barrasHorizontais ? 8 : 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F1" vertical={barrasHorizontais} horizontal={!barrasHorizontais} />
            {barrasHorizontais ? (
              <>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis dataKey="x" type="category" width={140} tick={{ fontSize: 11, fill: '#6b7280' }} />
              </>
            ) : (
              <>
                <XAxis dataKey="x" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              </>
            )}
            <Tooltip contentStyle={estiloTooltip} formatter={formatarTooltip} />
            {grafico.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {grafico.series.map((s, i) => {
              const cor = grafico.series.length > 1 ? corCategorica(i) : corRanking(0)
              return (
                <Bar
                  key={s.nome}
                  dataKey={s.nome}
                  fill={cor}
                  radius={barrasHorizontais ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                  onClick={clicavel ? (d: any) => aoClicarCategoria!(d.payload?.x ?? d.x) : undefined}
                  style={clicavel ? { cursor: 'pointer' } : undefined}
                >
                  {clicavel &&
                    paraLinhas(grafico).map((linha, idx) => (
                      <Cell key={idx} fill={categoriaActiva === linha.x ? COR_ACTIVA : cor} />
                    ))}
                </Bar>
              )
            })}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
