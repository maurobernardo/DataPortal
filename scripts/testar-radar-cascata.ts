/**
 * Bateria sobre as duas formas que o motor passou a emitir por conta propria: o radar de perfil
 * comparado e a cascata de variacao.
 *
 * O que interessa testar nao e que aparecam: e que NAO aparecam quando mentiriam. Um radar com
 * eixos em ordens de grandeza diferentes esmaga tudo menos um; uma cascata sem mudanca de sinal
 * repete a escada que a linha ja mostrava; uma teia com um eixo em falta desenha um vertice no
 * centro que se le como zero quando e "nao medido".
 *
 * Uso: npx tsx scripts/testar-radar-cascata.ts
 */
import { gerarGraficosDeGarantia, type ContextoExecucao, type GraficoResultado, type SerieGeografica } from '../lib/analysis/executor'

function contexto(series: SerieGeografica[], graficos: GraficoResultado[] = []): ContextoExecucao {
  return {
    tabelas: new Map(),
    ligacoes: new Map(),
    calcs: {},
    series,
    graficos,
    destaques: [],
    avisos: [],
    enriquecimentoPopulacao: new Map(),
    camadasBrutas: [],
    qualidade: [],
    codigoExecutado: [],
    listas: [],
    multiplos: [],
    custoExecucaoCodigo: 0,
  } as ContextoExecucao
}

const PROV = [
  ['01', 'Niassa'],
  ['02', 'Cabo Delgado'],
  ['03', 'Nampula'],
  ['04', 'Zambézia'],
  ['05', 'Tete'],
]

function serie(metrica: string, valores: number[], normalizacao = 'nenhuma'): SerieGeografica {
  return {
    passo_id: `p_${metrica}`,
    nivel: 'admin1',
    unidades: PROV.map(([codigo, nome], i) => ({ codigo, nome, valor: valores[i] })),
    metrica,
    normalizacao,
  } as SerieGeografica
}

function temporal(passo_id: string, anos: string[], valores: (number | null)[]): GraficoResultado {
  return {
    passo_id,
    tipo: 'linha',
    titulo: `Evolução de ${passo_id}`,
    eixoX: anos,
    series: [{ nome: 'valor', valores }],
    categoria: 'temporal',
  } as GraficoResultado
}

type Caso = { nome: string; ctx: ContextoExecucao; esperaTipo?: string; naoEspera?: string }

const CASOS: Caso[] = [
  // ------------------------------------------------------------------ radar
  {
    nome: 'tres indicadores em percentagem sobre as mesmas provincias',
    ctx: contexto([
      serie('Cobertura vacinal (%)', [76, 82, 88, 79, 90]),
      serie('Acesso a agua (%)', [55, 61, 70, 58, 66]),
      serie('Electricidade (%)', [30, 44, 52, 38, 49]),
    ]),
    esperaTipo: 'radar',
  },
  {
    nome: 'escalas incomparaveis nao formam teia',
    ctx: contexto([
      serie('População', [1800000, 2300000, 5900000, 5100000, 2700000]),
      serie('Escolas', [480, 720, 1240, 1180, 760]),
      serie('Hospitais', [8, 11, 19, 17, 12]),
    ]),
    naoEspera: 'radar',
  },
  {
    nome: 'duas series so nao chegam para uma teia',
    ctx: contexto([serie('A (%)', [10, 20, 30, 40, 50]), serie('B (%)', [15, 25, 35, 45, 55])]),
    naoEspera: 'radar',
  },
  {
    nome: 'series sem unidades em comum nao formam teia',
    ctx: contexto([
      { ...serie('A (%)', [1, 2, 3, 4, 5]), unidades: [{ codigo: '01', nome: 'Niassa', valor: 10 }] } as SerieGeografica,
      { ...serie('B (%)', [1, 2, 3, 4, 5]), unidades: [{ codigo: '02', nome: 'Cabo Delgado', valor: 20 }] } as SerieGeografica,
      { ...serie('C (%)', [1, 2, 3, 4, 5]), unidades: [{ codigo: '03', nome: 'Nampula', valor: 30 }] } as SerieGeografica,
    ]),
    naoEspera: 'radar',
  },

  // ------------------------------------------------------------------ caixa
  {
    nome: 'distribuicao de um indicador entre as unidades',
    ctx: contexto([serie('Escolas por distrito', [120, 380, 90, 150, 110])]),
    esperaTipo: 'caixa',
  },
  {
    nome: 'poucas unidades nao dao quartis com sentido',
    ctx: contexto([
      { ...serie('X', [1, 2, 3, 4, 5]), unidades: PROV.slice(0, 3).map(([c, n], i) => ({ codigo: c, nome: n, valor: 10 + i })) } as SerieGeografica,
    ]),
    naoEspera: 'caixa',
  },

  // ------------------------------------------------------------------ bolha
  {
    nome: 'tres medidas em escalas diferentes: bolha',
    ctx: contexto([
      serie('População', [1800000, 2300000, 5900000, 5100000, 2700000]),
      serie('Escolas', [480, 720, 1240, 1180, 760]),
      serie('Hospitais', [8, 11, 19, 17, 12]),
    ]),
    esperaTipo: 'bolha',
  },
  {
    nome: 'tres medidas comparaveis ficam no radar, sem bolha',
    ctx: contexto([
      serie('Cobertura vacinal (%)', [76, 82, 88, 79, 90]),
      serie('Acesso a agua (%)', [55, 61, 70, 58, 66]),
      serie('Electricidade (%)', [30, 44, 52, 38, 49]),
    ]),
    naoEspera: 'bolha',
  },

  // ---------------------------------------------------------------- cascata
  {
    nome: 'serie temporal com subidas e descidas',
    ctx: contexto([], [temporal('t1', ['2018', '2019', '2020', '2021', '2022'], [100, 130, 110, 145, 138])]),
    esperaTipo: 'cascata',
  },
  {
    nome: 'serie so a subir nao vira cascata',
    ctx: contexto([], [temporal('t2', ['2018', '2019', '2020', '2021', '2022'], [100, 110, 120, 130, 140])]),
    naoEspera: 'cascata',
  },
  {
    nome: 'serie curta demais nao vira cascata',
    ctx: contexto([], [temporal('t3', ['2020', '2021', '2022'], [100, 130, 110])]),
    naoEspera: 'cascata',
  },
  {
    nome: 'serie com projeccao nao mistura observado com previsto',
    ctx: contexto([], [
      {
        ...temporal('t4', ['2018', '2019', '2020', '2021', '2022'], [100, 130, 110, 145, 138]),
        series: [
          { nome: 'valor', valores: [100, 130, 110, 145, 138] },
          { nome: 'Projecção', valores: [null, null, null, 145, 150] },
        ],
      } as GraficoResultado,
    ]),
    naoEspera: 'cascata',
  },
]

let passou = 0
const falhas: string[] = []

for (const c of CASOS) {
  const antes = c.ctx.graficos.length
  gerarGraficosDeGarantia(c.ctx)
  const novos = c.ctx.graficos.slice(antes)
  const tipos = novos.map((g) => g.tipo)

  if (c.esperaTipo) {
    if (tipos.includes(c.esperaTipo as never)) passou++
    else falhas.push(`  ${c.nome}: esperava um "${c.esperaTipo}", veio [${tipos.join(', ') || 'nada'}]`)
  }
  if (c.naoEspera) {
    if (!tipos.includes(c.naoEspera as never)) passou++
    else falhas.push(`  ${c.nome}: NAO devia produzir "${c.naoEspera}", e produziu`)
  }
}

// A cascata tem de fechar na variacao total: e a promessa da forma.
{
  const ctx = contexto([], [temporal('soma', ['2018', '2019', '2020', '2021', '2022'], [100, 130, 110, 145, 138])])
  gerarGraficosDeGarantia(ctx)
  const cascata = ctx.graficos.find((g) => g.tipo === 'cascata')
  const soma = (cascata?.series[0].valores || []).reduce((a: number, v) => a + (v ?? 0), 0)
  if (cascata && Math.abs(soma - (138 - 100)) < 1e-9) passou++
  else falhas.push(`  soma das variacoes devia dar ${138 - 100}, deu ${soma}`)
}

// O radar so pode desenhar tres teias: mais do que isso vira novelo.
{
  const ctx = contexto([
    serie('Cobertura vacinal (%)', [76, 82, 88, 79, 90]),
    serie('Acesso a agua (%)', [55, 61, 70, 58, 66]),
    serie('Electricidade (%)', [30, 44, 52, 38, 49]),
  ])
  gerarGraficosDeGarantia(ctx)
  const radar = ctx.graficos.find((g) => g.tipo === 'radar')
  if (radar && radar.series.length === 3 && radar.eixoX.length === 3) passou++
  else falhas.push(`  radar devia ter 3 teias e 3 eixos, tem ${radar?.series.length} e ${radar?.eixoX.length}`)
}

const total = CASOS.filter((c) => c.esperaTipo).length + CASOS.filter((c) => c.naoEspera).length + 2
console.log(`\nRadar e cascata: ${passou}/${total}`)
if (falhas.length) {
  console.log('\nFalhas:')
  falhas.forEach((f) => console.log(f))
  process.exit(1)
}
console.log('Tudo certo.\n')
