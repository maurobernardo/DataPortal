'use client'

import { useState } from 'react'
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
import {
  BarChart3,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  PieChart as PieChartIcon,
  ScatterChart as ScatterChartIcon,
  LayoutGrid,
  Radar as RadarIcon,
  Grid3x3,
  AlignEndHorizontal,
  Workflow,
  CircleDot,
  Filter,
  BoxSelect,
  Orbit,
  ArrowDownAZ,
  ArrowDown01,
} from 'lucide-react'
import { CLASSES_TEMATICAS, limitesQuantil, classeParaValor } from '@/lib/analysis/simbologia'
import { formasPermitidas, type Distribuicao, type TipoGrafico } from '@/lib/analysis/forma-do-grafico'
import {
  GraficoBolha,
  GraficoCaixa,
  GraficoCascata,
  GraficoCordas,
  GraficoFunil,
  GraficoHeatmap,
  GraficoRadar,
  GraficoSankey,
  GraficoTreemap,
} from './GraficosAvancados'

type Grafico = {
  passo_id: string
  tipo: TipoGrafico
  titulo: string
  eixoX: string[]
  series: { nome: string; valores: (number | null)[] }[]
  /** Unidade dos valores. É o que decide se somar faz sentido, e por isso que formas são honestas. */
  unidade?: string
  /** Ligações origem→destino, quando o passo mediu um percurso e não uma distribuição. */
  fluxos?: { origem: string; destino: string; valor: number }[]
  /** Se os valores são partes de um mesmo total. Sem isto o selector não pode oferecer fatias. */
  composicao?: boolean
  /** Resumos de distribuição por cinco números, um por caixa. */
  distribuicoes?: Distribuicao[]
  /** As três primeiras séries são o eixo horizontal, o vertical e o tamanho de cada bolha. */
  bolhas?: boolean
  /** As categorias são etapas encaixadas, cada uma dentro da anterior. */
  funil?: boolean
  /** A justificação da forma escolhida pelo motor, para o leitor perceber porque é este desenho. */
  porqueEstaForma?: string
  referencia?: { nome: string; valores: (number | null)[] }
}

/** Ranking de uma só série (ex.: população por província): degraus do verde institucional — é
 *  uma grandeza, não identidades diferentes, por isso um único matiz claro→escuro é o correcto. */
const PALETA_RANKING = ['#0f3d2e', '#175a41', '#1f7752', '#4f9c74', '#89bfa2', '#c3decf']

/** Categorias sem relação de ordem entre si (fatias de pizza, séries nomeadas diferentes):
 *  matizes realmente distintos, não tons do mesmo verde — validado contra daltonismo (ordem fixa,
 *  nunca ciclada), ver skill "dataviz". Um único verde-sobre-verde é ilegível numa legenda. */
const PALETA_CATEGORICA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']

const COR_REFERENCIA = '#c3decf'

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
/** Ícone e nome de cada forma, para o selector. Um botão só com ícone precisa de nome próprio:
 *  vai em `aria-label` e em `title`, não só como decoração. */
const ROTULO_FORMA: Record<TipoGrafico, { Icone: typeof BarChart3; titulo: string }> = {
  barra: { Icone: BarChart3, titulo: 'Barras' },
  linha: { Icone: LineChartIcon, titulo: 'Linha' },
  area: { Icone: AreaChartIcon, titulo: 'Área' },
  pizza: { Icone: PieChartIcon, titulo: 'Pizza' },
  dispersao: { Icone: ScatterChartIcon, titulo: 'Dispersão' },
  treemap: { Icone: LayoutGrid, titulo: 'Blocos por área' },
  radar: { Icone: RadarIcon, titulo: 'Teia de indicadores' },
  heatmap: { Icone: Grid3x3, titulo: 'Matriz de cor' },
  cascata: { Icone: AlignEndHorizontal, titulo: 'Cascata' },
  sankey: { Icone: Workflow, titulo: 'Fluxo' },
  bolha: { Icone: CircleDot, titulo: 'Bolhas' },
  funil: { Icone: Filter, titulo: 'Funil' },
  caixa: { Icone: BoxSelect, titulo: 'Distribuição' },
  cordas: { Icone: Orbit, titulo: 'Trânsito' },
}

const estiloTooltip = { fontSize: 12, borderRadius: 8, border: '1px solid #e4dcc6' }
/** Vermelho de selecção, deliberadamente fora da paleta quente do relatório: é a mesma cor que o
 *  contorno de destaque nos dois mapas, e tem de se ver por cima de tudo — do verde do ranking às
 *  fotografias do mapa base. Uma cor da paleta perder-se-ia contra o próprio relatório. */
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
  // As formas que continuam a dizer a verdade sobre ESTES dados, calculadas do mesmo módulo que o
  // motor usou para escolher. O selector deixou de oferecer sempre as mesmas cinco: propor uma
  // pizza para percentagens de províncias oferecia um total que não existe, e propor uma dispersão
  // para quatro categorias nomeadas oferecia uma relação onde não há eixo contínuo nenhum.
  const formasDisponiveis = formasPermitidas({
    eixoX: grafico.eixoX,
    series: grafico.series,
    unidade: grafico.unidade,
    fluxos: grafico.fluxos,
    composicao: grafico.composicao,
    distribuicoes: grafico.distribuicoes,
    bolhas: grafico.bolhas,
    funil: grafico.funil,
  })
  const podeAlternarTipo = formasDisponiveis.length > 1
  // Reordenar continua a ser só para série única: com várias séries, mudar a ordem do eixo deixaria
  // de comparar as mesmas categorias lado a lado.
  const podeOrdenar = grafico.series.length === 1

  const [tipoActivo, setTipoActivo] = useState<Grafico['tipo']>(grafico.tipo)
  const [ordem, setOrdem] = useState<'valor' | 'nome'>('valor')

  // Dados já vêm ordenados por valor (é o que o executor produz para rankings); "nome" reordena
  // eixoX e a série na mesma ordem alfabética, sem tocar nos valores em si.
  const grafico2: Grafico =
    podeOrdenar && ordem === 'nome'
      ? (() => {
          const indices = grafico.eixoX.map((_, i) => i).sort((a, b) => grafico.eixoX[a].localeCompare(grafico.eixoX[b]))
          return {
            ...grafico,
            eixoX: indices.map((i) => grafico.eixoX[i]),
            series: grafico.series.map((s) => ({ ...s, valores: indices.map((i) => s.valores[i]) })),
          }
        })()
      : grafico
  // Se o motor mudou de ideias (dados novos), a escolha manual antiga pode ter deixado de ser
  // honesta: nesse caso volta-se à forma do motor em vez de desenhar uma leitura errada.
  const tipoEfectivo = podeAlternarTipo && formasDisponiveis.includes(tipoActivo) ? tipoActivo : grafico.tipo

  const clicavel = !!aoClicarCategoria && (tipoEfectivo === 'barra' || tipoEfectivo === 'pizza')
  const formaAvancada = [
    'treemap',
    'radar',
    'heatmap',
    'cascata',
    'sankey',
    'bolha',
    'funil',
    'caixa',
    'cordas',
  ].includes(tipoEfectivo)
  // Muitas categorias com nomes compridos não cabem lado a lado no eixo X sem sobrepor texto:
  // passa a barras horizontais (uma linha por categoria) em vez de espremer rótulos verticais.
  const barrasHorizontais = tipoEfectivo === 'barra' && grafico2.eixoX.length > 6
  const altura =
    tipoEfectivo === 'pizza'
      ? 280
      : tipoEfectivo === 'sankey'
        ? Math.min(520, Math.max(280, (grafico.fluxos?.length ?? 4) * 34))
        : tipoEfectivo === 'cordas'
          ? 380
          : tipoEfectivo === 'bolha'
            ? 340
            : tipoEfectivo === 'radar'
              ? 340
              : tipoEfectivo === 'treemap' || tipoEfectivo === 'cascata'
                ? 320
                : barrasHorizontais
                  ? Math.min(560, Math.max(260, grafico2.eixoX.length * 30))
                  : 260

  // Ranking de série única (ex.: "maiores unidades"): cada barra colorida pela sua própria classe
  // de magnitude (mesma simbologia do mapa — verde/amarelo/laranja/vermelho), não um único matiz
  // de verde. Séries múltiplas continuam com a paleta categórica: aí a cor distingue IDENTIDADES
  // diferentes (províncias, grupos), não magnitude, e cada barra teria de ser uma classe própria.
  const rankingTematico = tipoEfectivo === 'barra' && grafico2.series.length === 1
  const valoresRanking = rankingTematico ? (grafico2.series[0].valores.filter((v): v is number => v != null)) : []
  const limitesRanking = rankingTematico ? limitesQuantil(valoresRanking, CLASSES_TEMATICAS.length) : []

  return (
    <div className="pdx-panel">
      <div className="pdx-panel-head">
        <h2>{grafico.titulo}</h2>
        {(podeAlternarTipo || podeOrdenar) && (
          <div className="flex items-center gap-2 ml-auto">
            {podeAlternarTipo && (
              // Cada botão diz o que faz por `aria-label`, e não só por `title`: um `title` não é
              // lido por leitor de ecrã de forma fiável, e estes botões são só ícone.
              <div className="pdx-segmentado" role="group" aria-label="Tipo de gráfico">
                {formasDisponiveis.map((tipo) => {
                  const { Icone, titulo } = ROTULO_FORMA[tipo]
                  return (
                  <button
                    key={tipo}
                    type="button"
                    title={titulo}
                    aria-label={titulo}
                    aria-pressed={tipoEfectivo === tipo}
                    onClick={() => setTipoActivo(tipo)}
                  >
                    <Icone className="size-3.5" aria-hidden />
                  </button>
                  )
                })}
              </div>
            )}
            {podeOrdenar && (
              <div className="pdx-segmentado" role="group" aria-label="Ordenação">
                <button
                  type="button"
                  title="Ordenar por valor"
                  aria-label="Ordenar por valor"
                  aria-pressed={ordem === 'valor'}
                  onClick={() => setOrdem('valor')}
                >
                  <ArrowDown01 className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  title="Ordenar por nome"
                  aria-label="Ordenar por nome"
                  aria-pressed={ordem === 'nome'}
                  onClick={() => setOrdem('nome')}
                >
                  <ArrowDownAZ className="size-3.5" aria-hidden />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="pdx-panel-body">
      {clicavel && (
        <p className="text-[11px] mb-2" style={{ color: 'var(--ink-faint)' }}>
          Clique numa barra para destacar no mapa
        </p>
      )}
      {tipoEfectivo === 'treemap' && grafico2.series[0] && (
        <GraficoTreemap eixoX={grafico2.eixoX} serie={grafico2.series[0]} altura={altura} />
      )}
      {tipoEfectivo === 'radar' && (
        <GraficoRadar eixoX={grafico2.eixoX} series={grafico2.series} cores={PALETA_CATEGORICA} altura={altura} />
      )}
      {tipoEfectivo === 'heatmap' && (
        <GraficoHeatmap eixoX={grafico2.eixoX} series={grafico2.series} unidade={grafico.unidade} />
      )}
      {tipoEfectivo === 'cascata' && grafico2.series[0] && (
        <GraficoCascata eixoX={grafico2.eixoX} serie={grafico2.series[0]} altura={altura} />
      )}
      {tipoEfectivo === 'sankey' && <GraficoSankey fluxos={grafico.fluxos || []} altura={altura} />}
      {tipoEfectivo === 'cordas' && <GraficoCordas fluxos={grafico.fluxos || []} altura={altura} />}
      {tipoEfectivo === 'bolha' && <GraficoBolha eixoX={grafico2.eixoX} series={grafico2.series} altura={altura} />}
      {tipoEfectivo === 'funil' && grafico2.series[0] && (
        <GraficoFunil eixoX={grafico2.eixoX} serie={grafico2.series[0]} unidade={grafico.unidade} />
      )}
      {tipoEfectivo === 'caixa' && (
        <GraficoCaixa distribuicoes={grafico.distribuicoes || []} unidade={grafico.unidade} />
      )}
      {!formaAvancada && (
      <ResponsiveContainer width="100%" height={altura}>
        {tipoEfectivo === 'linha' ? (
          <LineChart data={paraLinhas(grafico2)} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee8d6" />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#677063' }} />
            <YAxis tick={{ fontSize: 11, fill: '#677063' }} />
            <Tooltip contentStyle={estiloTooltip} formatter={formatarTooltip} />
            {grafico2.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {grafico2.referencia && (
              <Line
                type="monotone"
                dataKey={grafico2.referencia.nome}
                stroke={COR_REFERENCIA}
                strokeDasharray="4 4"
                dot={false}
                strokeWidth={1.5}
              />
            )}
            {grafico2.series.map((s, i) => (
              <Line
                key={s.nome}
                type="monotone"
                dataKey={s.nome}
                stroke={grafico2.series.length > 1 ? corCategorica(i) : corRanking(0)}
                strokeWidth={2.5}
                dot={false}
              />
            ))}
          </LineChart>
        ) : tipoEfectivo === 'area' ? (
          <AreaChart data={paraLinhas(grafico2)} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee8d6" />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#677063' }} />
            <YAxis tick={{ fontSize: 11, fill: '#677063' }} />
            <Tooltip contentStyle={estiloTooltip} formatter={formatarTooltip} />
            {grafico2.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {grafico2.series.map((s, i) => {
              const cor = grafico2.series.length > 1 ? corCategorica(i) : corRanking(0)
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
        ) : tipoEfectivo === 'pizza' ? (
          <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <Tooltip contentStyle={estiloTooltip} formatter={formatarTooltip} />
            {/* Legenda à direita, não por baixo: com o gráfico à esquerda, o texto nunca cai por
                cima da rosca — só ao lado, por mais entradas que a legenda tenha. */}
            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 11, maxWidth: '42%' }} />
            <Pie
              data={paraFatias(grafico2)}
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
              {paraFatias(grafico2).map((f, i) => (
                <Cell
                  key={i}
                  fill={corCategorica(i)}
                  stroke={categoriaActiva === f.nome ? COR_ACTIVA : undefined}
                  strokeWidth={categoriaActiva === f.nome ? 3 : undefined}
                />
              ))}
            </Pie>
          </PieChart>
        ) : tipoEfectivo === 'dispersao' ? (
          paraPontos(grafico2).length > 0 ? (
            <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee8d6" />
              <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: '#677063' }} />
              <YAxis type="number" dataKey="y" tick={{ fontSize: 11, fill: '#677063' }} />
              <ZAxis range={[40, 40]} />
              <Tooltip contentStyle={estiloTooltip} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={paraPontos(grafico2)} fill={corRanking(0)} fillOpacity={0.7} />
            </ScatterChart>
          ) : (
            <p className="text-[12px] text-center pt-16" style={{ color: 'var(--ink-faint)' }}>
              Dispersão exige um eixo numérico; as categorias deste gráfico não são números.
            </p>
          )
        ) : (
          <BarChart
            data={paraLinhas(grafico2)}
            layout={barrasHorizontais ? 'vertical' : 'horizontal'}
            margin={{ top: 8, right: 16, left: barrasHorizontais ? 8 : 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#eee8d6" vertical={barrasHorizontais} horizontal={!barrasHorizontais} />
            {barrasHorizontais ? (
              <>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#677063' }} />
                <YAxis dataKey="x" type="category" width={140} tick={{ fontSize: 11, fill: '#677063' }} />
              </>
            ) : (
              <>
                <XAxis dataKey="x" tick={{ fontSize: 12, fill: '#677063' }} />
                <YAxis tick={{ fontSize: 11, fill: '#677063' }} />
              </>
            )}
            <Tooltip contentStyle={estiloTooltip} formatter={formatarTooltip} />
            {grafico2.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {grafico2.series.map((s, i) => {
              const cor = grafico2.series.length > 1 ? corCategorica(i) : corRanking(0)
              return (
                <Bar
                  key={s.nome}
                  dataKey={s.nome}
                  fill={cor}
                  radius={barrasHorizontais ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                  onClick={clicavel ? (d: any) => aoClicarCategoria!(d.payload?.x ?? d.x) : undefined}
                  style={clicavel ? { cursor: 'pointer' } : undefined}
                >
                  {(clicavel || rankingTematico) &&
                    paraLinhas(grafico2).map((linha, idx) => {
                      const activa = clicavel && categoriaActiva === linha.x
                      // Activa: mantém a cor real da simbologia, só ganha um contorno vermelho a
                      // marcar a selecção — trocar para vermelho sólido apagava a informação que a
                      // cor temática estava a dar (a mesma unidade deixava de parecer "alta"/"baixa").
                      if (rankingTematico) {
                        const valor = linha[s.nome]
                        const corClasse =
                          typeof valor === 'number'
                            ? CLASSES_TEMATICAS[classeParaValor(valor, limitesRanking)].cor
                            : cor
                        return (
                          <Cell
                            key={idx}
                            fill={corClasse}
                            stroke={activa ? COR_ACTIVA : undefined}
                            strokeWidth={activa ? 3 : undefined}
                          />
                        )
                      }
                      return (
                        <Cell key={idx} fill={cor} stroke={activa ? COR_ACTIVA : undefined} strokeWidth={activa ? 3 : undefined} />
                      )
                    })}
                </Bar>
              )
            })}
          </BarChart>
        )}
      </ResponsiveContainer>
      )}
      {grafico.porqueEstaForma && (
        <p className="pdx-porque-forma">{grafico.porqueEstaForma}</p>
      )}
      {rankingTematico && (
        <div className="pdx-legenda">
          <span className="pdx-legenda-titulo">Legenda</span>
          {CLASSES_TEMATICAS.map((classe) => (
            <span key={classe.rotulo} className="pdx-legenda-item">
              <span className="pdx-legenda-chave" style={{ background: classe.cor }} aria-hidden />
              {classe.rotulo}
            </span>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
