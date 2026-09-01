'use client'

/**
 * As formas que o Recharts não traz prontas para o que este portal precisa, e as que traz mas
 * precisam de ser vestidas com o sistema de design do relatório.
 *
 * Cada uma existe porque há uma leitura que as barras não dão:
 *   - treemap  : muitas partes de um total, comparadas por área em vez de por altura
 *   - radar    : o perfil de poucas unidades em vários indicadores, visto de uma vez
 *   - heatmap  : duas dimensões cruzadas, com o padrão a aparecer antes de se ler um número
 *   - cascata  : contribuições que somam e subtraem até um total, com o percurso à vista
 *   - sankey   : para onde vai cada parte, quando há origem e destino
 *
 * A cor segue a mesma regra do resto da análise: magnitude usa a escala temática partilhada com o
 * mapa (sálvia → dourado → terracota → rubi, monótona em luminância), identidade usa a paleta
 * categórica. Nunca as duas ao mesmo tempo no mesmo desenho.
 */
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Sankey,
  Scatter,
  ScatterChart,
  ZAxis,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from 'recharts'
import { CLASSES_TEMATICAS, classeParaValor, limitesQuantil } from '@/lib/analysis/simbologia'
import type { Distribuicao } from '@/lib/analysis/forma-do-grafico'

export type Serie = { nome: string; valores: (number | null)[] }
export type Fluxo = { origem: string; destino: string; valor: number }

const COR_POSITIVO = '#4e7a5a'
const COR_NEGATIVO = '#be5433'
const COR_TOTAL = '#0f3d2e'
const COR_EIXO = '#677063'
const COR_GRELHA = '#eee8d6'

const estiloTooltip = { fontSize: 12, borderRadius: 8, border: '1px solid #e4dcc6' }

function formatar(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const casas = Number.isInteger(v) ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2
  return v.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/* ================================================================= treemap */

/**
 * Cada rectângulo é uma parte do total, e a área é a proporção. O rótulo só entra quando o
 * rectângulo o comporta: um nome cortado a meio é pior do que nome nenhum, porque parece outro
 * nome.
 */
function BlocoTreemap(props: any) {
  const { x, y, width, height, name, valor, cor, depth } = props
  // O Recharts chama este conteúdo também para o nó RAIZ, que embrulha todos os outros e não
  // traz nenhum dos nossos campos. Desenhá-lo pintava um rectângulo por cima de tudo, e pedir-lhe
  // a cor rebentava a página inteira.
  if (!cor || depth === 0 || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }
  const cabeNome = width > 64 && height > 30
  const cabeValor = width > 64 && height > 46
  // A escala temática vai do sálvia claro ao rubi escuro: um rótulo branco fixo era ilegível nos
  // blocos do topo da escala. A cor do texto sai da luminância do próprio bloco.
  const corTexto = corDoTextoSobre(cor)
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={cor} stroke="#faf6ec" strokeWidth={2} rx={3} />
      {cabeNome && (
        <text x={x + 8} y={y + 18} fill={corTexto} fontSize={11} fontWeight={600}>
          {String(name).length > Math.floor(width / 7) ? `${String(name).slice(0, Math.floor(width / 7) - 1)}…` : name}
        </text>
      )}
      {cabeValor && (
        <text x={x + 8} y={y + 34} fill={corTexto} fontSize={11} fontWeight={400} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatar(valor)}
        </text>
      )}
    </g>
  )
}

export function GraficoTreemap({
  eixoX,
  serie,
  altura = 300,
}: {
  eixoX: string[]
  serie: Serie
  altura?: number
}) {
  const valores = serie.valores.filter((v): v is number => typeof v === 'number' && v > 0)
  const limites = limitesQuantil(valores, CLASSES_TEMATICAS.length)
  const dados = eixoX
    .map((nome, i) => ({ name: nome, size: serie.valores[i] ?? 0, valor: serie.valores[i] ?? 0 }))
    .filter((d) => d.size > 0)
    .map((d) => ({ ...d, cor: CLASSES_TEMATICAS[classeParaValor(d.valor, limites)].cor }))

  if (dados.length === 0) return <SemDados altura={altura} />

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <Treemap data={dados} dataKey="size" isAnimationActive={false} content={<BlocoTreemap />}>
        <Tooltip
          contentStyle={estiloTooltip}
          formatter={(v: number) => [formatar(v), serie.nome]}
          labelFormatter={() => ''}
        />
      </Treemap>
    </ResponsiveContainer>
  )
}

/* =================================================================== radar */

export function GraficoRadar({
  eixoX,
  series,
  cores,
  altura = 320,
}: {
  eixoX: string[]
  series: Serie[]
  cores: string[]
  altura?: number
}) {
  const dados = eixoX.map((eixo, i) => {
    const linha: Record<string, string | number | null> = { eixo }
    series.forEach((s) => {
      linha[s.nome] = s.valores[i] ?? null
    })
    return linha
  })

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <RadarChart data={dados} outerRadius="72%">
        <PolarGrid stroke={COR_GRELHA} />
        <PolarAngleAxis dataKey="eixo" tick={{ fontSize: 11, fill: COR_EIXO }} />
        <PolarRadiusAxis tick={{ fontSize: 10, fill: COR_EIXO }} angle={90} />
        {series.map((s, i) => (
          <Radar
            key={s.nome}
            name={s.nome}
            dataKey={s.nome}
            stroke={cores[i % cores.length]}
            fill={cores[i % cores.length]}
            fillOpacity={0.18}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
        <Tooltip contentStyle={estiloTooltip} formatter={(v: number) => formatar(v)} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

/* ================================================================= heatmap */

/**
 * Grelha de células, e não um gráfico do Recharts: a mancha de cor lê-se melhor com rótulos de
 * linha e de coluna reais, e uma grelha CSS dá-os sem a acrobacia de posicionar texto em SVG.
 * A escala é por quantil, a mesma do mapa: resiste a um valor extremo esticar tudo o resto para
 * a mesma cor.
 */
export function GraficoHeatmap({
  eixoX,
  series,
  unidade,
}: {
  eixoX: string[]
  series: Serie[]
  unidade?: string
}) {
  const todos = series.flatMap((s) => s.valores).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (todos.length === 0) return <SemDados altura={240} />
  const limites = limitesQuantil(todos, CLASSES_TEMATICAS.length)

  return (
    <div className="pdx-heatmap-scroll">
      <div
        className="pdx-heatmap"
        style={{ gridTemplateColumns: `minmax(96px, max-content) repeat(${eixoX.length}, minmax(52px, 1fr))` }}
        role="table"
        aria-label={`Matriz de ${series.length} séries por ${eixoX.length} categorias`}
      >
        <div className="pdx-heatmap-canto" />
        {eixoX.map((c) => (
          <div key={c} className="pdx-heatmap-coluna" title={c}>
            {c}
          </div>
        ))}
        {series.map((s) => (
          <div key={s.nome} style={{ display: 'contents' }}>
            <div className="pdx-heatmap-linha" title={s.nome}>
              {s.nome}
            </div>
            {eixoX.map((c, i) => {
              const v = s.valores[i]
              const vazio = v == null || !Number.isFinite(v)
              const classe = vazio ? null : CLASSES_TEMATICAS[classeParaValor(v as number, limites)]
              return (
                <div
                  key={c}
                  className={`pdx-heatmap-celula${vazio ? ' vazia' : ''}`}
                  style={classe ? { background: classe.cor, color: corDoTextoSobre(classe.cor) } : undefined}
                  title={`${s.nome} · ${c}: ${formatar(v)}${unidade ? ` ${unidade}` : ''}`}
                >
                  {vazio ? '' : formatar(v)}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="pdx-heatmap-legenda">
        {CLASSES_TEMATICAS.map((c) => (
          <span key={c.rotulo}>
            <i style={{ background: c.cor }} aria-hidden />
            {c.rotulo}
          </span>
        ))}
      </div>
    </div>
  )
}

const TINTA_ESCURA = '#1a2118'
/** Luminância relativa de TINTA_ESCURA, pré-calculada. */
const LUM_TINTA_ESCURA = 0.0126

/**
 * Tinta escura ou branca por cima de uma cor, conforme a que dá mais contraste.
 *
 * A primeira versão decidia por um limiar de luminância (acima de 0,35, escuro). O dourado da
 * escala, #c7962c, tem 0,34: caía do lado errado por uma casa decimal e o rótulo saía branco a
 * 2,7:1. Em vez de afinar o limiar, calculam-se os dois contrastes e ganha o maior — que é a
 * pergunta que interessava desde o início.
 */
function corDoTextoSobre(hex?: string): string {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return TINTA_ESCURA
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  const lum = 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  const contrasteEscuro = (lum + 0.05) / (LUM_TINTA_ESCURA + 0.05)
  const contrasteClaro = 1.05 / (lum + 0.05)
  return contrasteEscuro >= contrasteClaro ? TINTA_ESCURA : '#ffffff'
}

/* ================================================================= cascata */

/**
 * Cada barra parte de onde a anterior acabou, e a última mostra o total a que se chegou. O truque
 * é uma barra invisível por baixo, com a altura do acumulado: é o que faz a barra visível
 * "flutuar" no sítio certo. Sem isso perde-se a acumulação, que é a razão de ser desta forma.
 */
export function GraficoCascata({
  eixoX,
  serie,
  altura = 300,
  rotuloTotal = 'Total',
}: {
  eixoX: string[]
  serie: Serie
  altura?: number
  rotuloTotal?: string
}) {
  let acumulado = 0
  const passos = eixoX.map((nome, i) => {
    const v = serie.valores[i] ?? 0
    const base = v >= 0 ? acumulado : acumulado + v
    acumulado += v
    return { nome, base, tamanho: Math.abs(v), valor: v, total: false as const }
  })
  const dados = [...passos, { nome: rotuloTotal, base: 0, tamanho: Math.abs(acumulado), valor: acumulado, total: true as const }]

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <ComposedChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <XAxis dataKey="nome" tick={{ fontSize: 11, fill: COR_EIXO }} interval={0} angle={dados.length > 6 ? -25 : 0} textAnchor={dados.length > 6 ? 'end' : 'middle'} height={dados.length > 6 ? 58 : 30} />
        <YAxis tick={{ fontSize: 11, fill: COR_EIXO }} />
        <Tooltip
          contentStyle={estiloTooltip}
          formatter={(_v: number, _n: string, item: any) => [formatar(item?.payload?.valor), item?.payload?.total ? rotuloTotal : serie.nome]}
        />
        {/* Base transparente: só existe para empurrar a barra visível para a altura certa. */}
        <Bar dataKey="base" stackId="c" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="tamanho" stackId="c" isAnimationActive={false} radius={[3, 3, 0, 0]}>
          {dados.map((d, i) => (
            <Cell key={i} fill={d.total ? COR_TOTAL : d.valor >= 0 ? COR_POSITIVO : COR_NEGATIVO} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/* ================================================================== sankey */

function NoSankey(props: any) {
  const { x, y, width, height, payload } = props
  const aoMeio = x > 200
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#175a41" rx={2} />
      <text
        x={aoMeio ? x - 8 : x + width + 8}
        y={y + height / 2}
        textAnchor={aoMeio ? 'end' : 'start'}
        dominantBaseline="middle"
        fontSize={11}
        fill="#1a2118"
      >
        {payload.name}
      </text>
    </g>
  )
}

export function GraficoSankey({ fluxos, altura = 340 }: { fluxos: Fluxo[]; altura?: number }) {
  const nomes: string[] = []
  const indice = (n: string) => {
    const i = nomes.indexOf(n)
    if (i >= 0) return i
    nomes.push(n)
    return nomes.length - 1
  }
  // Origens primeiro, destinos depois: o Sankey do Recharts não aceita um nó que seja ao mesmo
  // tempo origem e destino do mesmo par, e resolver isso antes evita um ciclo que o parte.
  const pares = fluxos.filter((f) => f.origem !== f.destino && Number.isFinite(f.valor) && f.valor > 0)
  if (pares.length < 2) return <SemDados altura={altura} />
  for (const f of pares) indice(f.origem)
  const ligacoes = pares.map((f) => ({ source: indice(f.origem), target: indice(f.destino), value: f.valor }))

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <Sankey
        data={{ nodes: nomes.map((name) => ({ name })), links: ligacoes }}
        node={<NoSankey />}
        link={{ stroke: '#89bfa2', strokeOpacity: 0.4 }}
        nodePadding={22}
        margin={{ top: 8, right: 130, bottom: 8, left: 110 }}
      >
        <Tooltip contentStyle={estiloTooltip} formatter={(v: number) => formatar(v)} />
      </Sankey>
    </ResponsiveContainer>
  )
}

/* =================================================================== vazio */

function SemDados({ altura }: { altura: number }) {
  return (
    <div
      className="flex items-center justify-center text-[12px]"
      style={{ height: altura, color: 'var(--ink-faint)' }}
    >
      Sem valores suficientes para desenhar esta forma.
    </div>
  )
}

/* ================================================================== bolha */

/**
 * Três medidas de cada unidade ao mesmo tempo: duas nos eixos e a terceira no raio.
 *
 * O raio é proporcional à RAIZ do valor, e não ao valor. O olho compara áreas, e usar o valor
 * como raio quadruplica a área quando o valor duplica: uma província com o dobro da população
 * apareceria quatro vezes maior. É o erro clássico desta forma, e é silencioso.
 */
export function GraficoBolha({ eixoX, series, altura = 340 }: { eixoX: string[]; series: Serie[]; altura?: number }) {
  const [sx, sy, sTam] = series
  if (!sx || !sy || !sTam) return <SemDados altura={altura} />

  const dados = eixoX
    .map((nome, i) => ({ nome, x: sx.valores[i], y: sy.valores[i], t: sTam.valores[i] }))
    .filter(
      (d): d is { nome: string; x: number; y: number; t: number } =>
        typeof d.x === 'number' && typeof d.y === 'number' && typeof d.t === 'number' && d.t > 0
    )
  if (dados.length < 3) return <SemDados altura={altura} />

  const limites = limitesQuantil(
    dados.map((d) => d.t),
    CLASSES_TEMATICAS.length
  )

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <ScatterChart margin={{ top: 12, right: 20, left: 4, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COR_GRELHA} />
        <XAxis
          type="number"
          dataKey="x"
          name={sx.nome}
          tick={{ fontSize: 11, fill: COR_EIXO }}
          label={{ value: sx.nome, position: 'insideBottom', offset: -16, fontSize: 11, fill: COR_EIXO }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={sy.nome}
          tick={{ fontSize: 11, fill: COR_EIXO }}
          width={70}
        />
        <Tooltip
          contentStyle={estiloTooltip}
          cursor={{ strokeDasharray: '3 3' }}
          content={({ payload }: any) => {
            const d = payload?.[0]?.payload
            if (!d) return null
            return (
              <div style={{ background: '#fff', border: '1px solid #e4dcc6', borderRadius: 8, padding: 10 }}>
                <strong style={{ fontSize: 12 }}>{d.nome}</strong>
                <div style={{ fontSize: 11.5, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                  {sx.nome}: {formatar(d.x)}
                  <br />
                  {sy.nome}: {formatar(d.y)}
                  <br />
                  {sTam.nome}: {formatar(d.t)}
                </div>
              </div>
            )
          }}
        />
        {/* O tamanho vem do ZAxis, e o `range` é em ÁREA, não em raio: é a área que o olho
            compara, e dar o valor ao raio quadruplicaria a bolha quando o valor duplica. */}
        <ZAxis type="number" dataKey="t" range={[80, 1400]} name={sTam.nome} />
        <Scatter data={dados} isAnimationActive={false}>
          {dados.map((d, i) => (
            <Cell
              key={i}
              fill={CLASSES_TEMATICAS[classeParaValor(d.t, limites)].cor}
              fillOpacity={0.72}
              stroke="#faf6ec"
              strokeWidth={1.5}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

/* =================================================================== funil */

/**
 * Etapas encaixadas, cada uma dentro da anterior. A largura de cada faixa é a proporção que
 * sobrevive da primeira, e ao lado diz-se quanto se perdeu para a etapa anterior: é essa perda
 * que a forma existe para tornar visível.
 */
export function GraficoFunil({ eixoX, serie, unidade }: { eixoX: string[]; serie: Serie; unidade?: string }) {
  const etapas = eixoX
    .map((nome, i) => ({ nome, valor: serie.valores[i] }))
    .filter((e): e is { nome: string; valor: number } => typeof e.valor === 'number' && Number.isFinite(e.valor))
  if (etapas.length < 3 || etapas[0].valor <= 0) return <SemDados altura={220} />

  const topo = etapas[0].valor
  // Um só matiz, do mais escuro ao mais claro, a acompanhar o estreitamento. A escala temática
  // não serve aqui: pintaria a primeira etapa de terracota e a última de sálvia, e lia-se como
  // se partir fosse mau e chegar fosse bom, quando o que a forma mede é a perda pelo caminho.
  const TONS_FUNIL = ['#0f3d2e', '#175a41', '#1f7752', '#4f9c74', '#89bfa2']

  return (
    <div className="pdx-funil">
      {etapas.map((e, i) => {
        const proporcao = e.valor / topo
        const perda = i === 0 ? 0 : etapas[i - 1].valor - e.valor
        const cor = TONS_FUNIL[Math.min(i, TONS_FUNIL.length - 1)]
        return (
          <div key={e.nome} className="etapa">
            <div
              className="faixa"
              style={{ width: `${Math.max(8, proporcao * 100)}%`, background: cor, color: corDoTextoSobre(cor) }}
            >
              <span className="nome">{e.nome}</span>
              <span className="valor">{formatar(e.valor)}</span>
            </div>
            <span className="nota">
              {i === 0
                ? unidade
                  ? `ponto de partida, em ${unidade}`
                  : 'ponto de partida'
                : `${Math.round(proporcao * 100)}% do início · menos ${formatar(perda)} do que a etapa anterior`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* =================================================================== caixa */

/**
 * Diagrama de caixa, desenhado à mão: são cinco números por caixa e o Recharts não traz a forma.
 *
 * Máximo, mínimo e mediana já aparecem como números na análise. O que só a caixa mostra é onde
 * está o miolo da distribuição (metade das unidades vive dentro do rectângulo), quão espalhada
 * está, e quem ficou claramente de fora.
 */
export function GraficoCaixa({ distribuicoes, unidade }: { distribuicoes: Distribuicao[]; unidade?: string }) {
  const todos = distribuicoes.flatMap((d) => [d.min, d.max, ...(d.outliers || []).map((o) => o.valor)])
  if (todos.length === 0) return <SemDados altura={200} />
  const min = Math.min(...todos)
  const max = Math.max(...todos)
  const amplitude = max - min || 1
  const pos = (v: number) => ((v - min) / amplitude) * 100

  return (
    <div className="pdx-caixas">
      {distribuicoes.map((d) => (
        <div key={d.nome} className="caixa-linha">
          <div className="rotulo" title={d.nome}>
            {d.nome}
          </div>
          <div className="pista">
            <span className="bigode" style={{ left: `${pos(d.min)}%`, width: `${pos(d.max) - pos(d.min)}%` }} />
            <span className="ponta" style={{ left: `${pos(d.min)}%` }} title={`Mínimo: ${formatar(d.min)}`} />
            <span className="ponta" style={{ left: `${pos(d.max)}%` }} title={`Máximo: ${formatar(d.max)}`} />
            <span
              className="miolo"
              style={{ left: `${pos(d.q1)}%`, width: `${Math.max(1, pos(d.q3) - pos(d.q1))}%` }}
              title={`Metade das unidades entre ${formatar(d.q1)} e ${formatar(d.q3)}`}
            />
            <span className="mediana" style={{ left: `${pos(d.mediana)}%` }} title={`Mediana: ${formatar(d.mediana)}`} />
            {(d.outliers || []).map((o) => (
              <span key={o.nome} className="fora" style={{ left: `${pos(o.valor)}%` }} title={`${o.nome}: ${formatar(o.valor)}`} />
            ))}
          </div>
          <div className="numeros pdx-num">
            {formatar(d.min)} · <strong>{formatar(d.mediana)}</strong> · {formatar(d.max)}
          </div>
        </div>
      ))}
      <p className="pdx-caixas-legenda">
        A barra escura é a mediana e o rectângulo contém metade das unidades. Os pontos são valores
        claramente fora do padrão{unidade ? `, em ${unidade}` : ''}.
      </p>
    </div>
  )
}

/* ================================================================== cordas */

/** Identidades, não magnitude: cada lugar do círculo é uma identidade diferente. */
const PALETA_CORDAS = ['#175a41', '#c7962c', '#be5433', '#4e7a5a', '#7a2422', '#8a6d1f', '#3f7f8c', '#8c5a3f']

/**
 * Trânsito entre os mesmos lugares, nos dois sentidos.
 *
 * Cada lugar ocupa um arco proporcional a tudo o que sai e entra nele; cada corda liga dois
 * lugares com espessura proporcional ao que passa entre eles. É a forma que mostra reciprocidade,
 * que um Sankey da esquerda para a direita não consegue: lá, A→B e B→A aparecem como dois nós
 * diferentes com o mesmo nome.
 */
export function GraficoCordas({ fluxos, altura = 380 }: { fluxos: Fluxo[]; altura?: number }) {
  const validos = fluxos.filter((f) => Number.isFinite(f.valor) && f.valor > 0 && f.origem !== f.destino)
  const nomes = Array.from(new Set(validos.flatMap((f) => [f.origem, f.destino])))
  if (nomes.length < 3 || validos.length < 2) return <SemDados altura={altura} />

  const totalPorNo = new Map<string, number>()
  for (const f of validos) {
    totalPorNo.set(f.origem, (totalPorNo.get(f.origem) || 0) + f.valor)
    totalPorNo.set(f.destino, (totalPorNo.get(f.destino) || 0) + f.valor)
  }
  const total = Array.from(totalPorNo.values()).reduce((a, b) => a + b, 0)
  if (total <= 0) return <SemDados altura={altura} />

  const lado = altura
  const centro = lado / 2
  const raio = lado / 2 - 80
  const ESPACO = 0.035

  const angulos = new Map<string, { de: number; ate: number; meio: number }>()
  let cursor = -Math.PI / 2
  for (const nome of nomes) {
    const fatia = ((totalPorNo.get(nome) || 0) / total) * (Math.PI * 2 - ESPACO * nomes.length)
    angulos.set(nome, { de: cursor, ate: cursor + fatia, meio: cursor + fatia / 2 })
    cursor += fatia + ESPACO
  }

  const ponto = (angulo: number, r: number): [number, number] => [
    centro + Math.cos(angulo) * r,
    centro + Math.sin(angulo) * r,
  ]
  const arco = (de: number, ate: number, r: number) => {
    const [x1, y1] = ponto(de, r)
    const [x2, y2] = ponto(ate, r)
    return `M ${x1} ${y1} A ${r} ${r} 0 ${ate - de > Math.PI ? 1 : 0} 1 ${x2} ${y2}`
  }

  const maior = Math.max(...validos.map((f) => f.valor))

  return (
    <div className="pdx-cordas">
      <svg viewBox={`0 0 ${lado} ${lado}`} width="100%" height={altura} role="img" aria-label="Trânsito entre lugares">
        {validos.map((f, i) => {
          const a = angulos.get(f.origem)
          const b = angulos.get(f.destino)
          if (!a || !b) return null
          const [x1, y1] = ponto(a.meio, raio - 5)
          const [x2, y2] = ponto(b.meio, raio - 5)
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} Q ${centro} ${centro} ${x2} ${y2}`}
              fill="none"
              stroke={PALETA_CORDAS[nomes.indexOf(f.origem) % PALETA_CORDAS.length]}
              strokeWidth={Math.max(1.5, (f.valor / maior) * 12)}
              strokeOpacity={0.45}
              strokeLinecap="round"
            >
              <title>{`${f.origem} para ${f.destino}: ${formatar(f.valor)}`}</title>
            </path>
          )
        })}
        {nomes.map((nome, i) => {
          const a = angulos.get(nome)!
          const [tx, ty] = ponto(a.meio, raio + 14)
          const aDireita = Math.cos(a.meio) >= 0
          return (
            <g key={nome}>
              <path
                d={arco(a.de, a.ate, raio)}
                fill="none"
                stroke={PALETA_CORDAS[i % PALETA_CORDAS.length]}
                strokeWidth={9}
              >
                <title>{`${nome}: ${formatar(totalPorNo.get(nome))}`}</title>
              </path>
              <text x={tx} y={ty} fontSize={11} fill="#1a2118" textAnchor={aDireita ? 'start' : 'end'} dominantBaseline="middle">
                {nome}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
