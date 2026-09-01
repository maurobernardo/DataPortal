/**
 * Bateria sobre a escolha da forma do grafico.
 *
 * O que se testa nao e "o codigo corre": e se a forma escolhida diz a verdade sobre os dados.
 * Cada caso e um formato real que o executor produz, e o esperado e a leitura correcta desse
 * formato. Os casos negativos valem tanto como os positivos: uma pizza de percentagens de
 * provincias soma 900% e esse todo nao existe.
 *
 * Uso: npx tsx scripts/testar-forma-do-grafico.ts
 */
import { escolherForma, formasPermitidas, perfilarDados, somarFazSentido } from '../lib/analysis/forma-do-grafico'

type Caso = {
  nome: string
  dados: Parameters<typeof escolherForma>[0]
  esperado: string
  /** Formas que NAO podem ser oferecidas no selector para estes dados. */
  proibidas?: string[]
}

const provincias = ['Niassa', 'Cabo Delgado', 'Nampula', 'Zambézia', 'Tete', 'Manica', 'Sofala', 'Inhambane', 'Gaza', 'Maputo Província', 'Maputo Cidade']
const anos = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022']

const CASOS: Caso[] = [
  // ---------------------------------------------------------------- tempo
  {
    nome: 'serie anual de contagens',
    dados: { eixoX: anos, series: [{ nome: 'Casos', valores: [10, 12, 15, 14, 19, 22, 25, 28] }], unidade: 'casos' },
    esperado: 'linha',
  },
  {
    nome: 'duas series anuais',
    dados: {
      eixoX: anos,
      series: [
        { nome: 'Nampula', valores: [10, 12, 15, 14, 19, 22, 25, 28] },
        { nome: 'Sofala', valores: [8, 9, 11, 13, 12, 14, 16, 17] },
      ],
      unidade: 'casos',
    },
    esperado: 'linha',
  },
  {
    nome: 'anos-mes continuam a ser tempo',
    dados: { eixoX: ['2022-01', '2022-02', '2022-03', '2022-04'], series: [{ nome: 'v', valores: [1, 2, 3, 4] }] },
    esperado: 'linha',
  },

  // ---------------------------------------------------------------- parte de um todo
  {
    nome: 'quatro categorias aditivas: pizza',
    dados: { eixoX: ['Milho', 'Mapira', 'Arroz', 'Feijão'], series: [{ nome: 'Área', valores: [400, 300, 200, 100] }], unidade: 'hectares', composicao: true },
    esperado: 'pizza',
  },
  {
    nome: 'onze provincias aditivas: treemap, nao pizza',
    dados: { eixoX: provincias, series: [{ nome: 'Escolas', valores: [120, 210, 360, 300, 180, 150, 190, 130, 110, 90, 70] }], unidade: 'escolas', composicao: true },
    esperado: 'treemap',
  },
  {
    nome: 'muitas categorias demais para treemap: barra',
    dados: {
      eixoX: Array.from({ length: 60 }, (_, i) => `Distrito ${i + 1}`),
      series: [{ nome: 'Escolas', valores: Array.from({ length: 60 }, (_, i) => 10 + i) }],
      unidade: 'escolas',
      composicao: true,
    },
    esperado: 'barra',
  },
  {
    nome: 'percentagens por provincia NAO sao um todo',
    dados: { eixoX: provincias, series: [{ nome: 'Cobertura', valores: [76, 80, 82, 79, 88, 90, 85, 91, 93, 95, 90] }], unidade: '%' },
    esperado: 'barra',
    proibidas: ['pizza', 'treemap'],
  },
  {
    nome: 'taxa por mil habitantes NAO e um todo',
    dados: { eixoX: ['A', 'B', 'C', 'D'], series: [{ nome: 'Médicos', valores: [1.2, 0.8, 2.1, 1.5] }], unidade: 'por 1000 habitantes' },
    esperado: 'barra',
    proibidas: ['pizza', 'treemap'],
  },

  {
    nome: 'duas medias de grupos NAO sao um todo',
    dados: { eixoX: ['Norte', 'Sul'], series: [{ nome: 'Média', valores: [43.2, 31.8] }], unidade: 'hectares' },
    esperado: 'barra',
    proibidas: ['pizza', 'treemap'],
  },
  {
    nome: 'sem declaracao de composicao nao ha fatias',
    dados: { eixoX: ['A', 'B', 'C', 'D'], series: [{ nome: 'v', valores: [4, 3, 2, 1] }], unidade: 'un' },
    esperado: 'barra',
    proibidas: ['pizza', 'treemap'],
  },

  // ---------------------------------------------------------------- matriz
  {
    nome: 'quatro culturas por onze provincias: heatmap',
    dados: {
      eixoX: provincias,
      series: [
        { nome: 'Milho', valores: provincias.map((_, i) => 100 + i * 7) },
        { nome: 'Mapira', valores: provincias.map((_, i) => 80 + i * 5) },
        { nome: 'Arroz', valores: provincias.map((_, i) => 60 + i * 9) },
        { nome: 'Feijão', valores: provincias.map((_, i) => 40 + i * 3) },
      ],
      unidade: 'hectares',
    },
    esperado: 'heatmap',
  },
  {
    nome: 'matriz esburacada nao vira heatmap',
    dados: {
      eixoX: ['A', 'B', 'C', 'D', 'E'],
      series: [
        { nome: 'X', valores: [1, null, null, null, 5] },
        { nome: 'Y', valores: [null, 2, null, null, null] },
        { nome: 'Z', valores: [null, null, 3, null, null] },
      ],
    },
    esperado: 'barra',
  },

  // ---------------------------------------------------------------- radar
  {
    nome: 'tres provincias em cinco indicadores comparaveis: radar',
    dados: {
      eixoX: ['Vacinação', 'Nutrição', 'Água', 'Saneamento', 'Electricidade'],
      series: [
        { nome: 'Nampula', valores: [76, 48, 55, 40, 30] },
        { nome: 'Maputo Cidade', valores: [90, 82, 95, 88, 92] },
        { nome: 'Sofala', valores: [82, 60, 70, 55, 48] },
      ],
      unidade: '%',
    },
    esperado: 'radar',
  },
  {
    nome: 'escalas muito diferentes nao viram radar',
    dados: {
      eixoX: ['População', 'Escolas', 'Hospitais', 'Estradas'],
      series: [
        { nome: 'Nampula', valores: [5000000, 360, 12, 800] },
        { nome: 'Sofala', valores: [2000000, 190, 8, 500] },
      ],
    },
    esperado: 'barra',
    proibidas: ['radar'],
  },

  {
    nome: 'quatro unidades em quatro indicadores: radar, nao heatmap',
    dados: {
      eixoX: ['Vacinação', 'Nutrição', 'Água', 'Saneamento'],
      series: [
        { nome: 'A', valores: [70, 60, 50, 40] },
        { nome: 'B', valores: [80, 70, 60, 50] },
        { nome: 'C', valores: [60, 50, 40, 30] },
        { nome: 'D', valores: [90, 80, 70, 60] },
      ],
      unidade: '%',
    },
    esperado: 'radar',
  },
  {
    nome: 'eixos a mais para uma teia: heatmap',
    dados: {
      eixoX: Array.from({ length: 14 }, (_, i) => `Indicador ${i + 1}`),
      series: [
        { nome: 'A', valores: Array.from({ length: 14 }, (_, i) => 50 + i) },
        { nome: 'B', valores: Array.from({ length: 14 }, (_, i) => 40 + i) },
        { nome: 'C', valores: Array.from({ length: 14 }, (_, i) => 60 + i) },
      ],
      unidade: '%',
    },
    esperado: 'heatmap',
  },
  {
    nome: 'series a mais para uma teia: heatmap',
    dados: {
      eixoX: ['A', 'B', 'C', 'D', 'E'],
      series: Array.from({ length: 7 }, (_, k) => ({ nome: `U${k}`, valores: [50 + k, 40 + k, 60 + k, 30 + k, 70 + k] })),
      unidade: '%',
    },
    esperado: 'heatmap',
  },

  // ---------------------------------------------------------------- cascata
  {
    nome: 'contribuicoes com sinal: cascata',
    dados: {
      eixoX: ['Nampula', 'Zambézia', 'Sofala', 'Tete', 'Gaza'],
      series: [{ nome: 'Variação', valores: [1200, -400, 300, -150, 90] }],
      unidade: 'hectares',
    },
    esperado: 'cascata',
  },
  {
    nome: 'so positivos nao e cascata (cinco partes de um total: pizza)',
    dados: {
      eixoX: ['A', 'B', 'C', 'D', 'E'],
      series: [{ nome: 'v', valores: [10, 20, 30, 40, 50] }],
      unidade: 'toneladas',
      composicao: true,
    },
    esperado: 'pizza',
    proibidas: ['cascata'],
  },

  // ---------------------------------------------------------------- fluxo
  {
    nome: 'ligacoes origem-destino: sankey',
    dados: {
      eixoX: [],
      series: [],
      fluxos: [
        { origem: 'Nampula', destino: 'Milho', valor: 300 },
        { origem: 'Nampula', destino: 'Mapira', valor: 120 },
        { origem: 'Sofala', destino: 'Milho', valor: 200 },
      ],
    },
    esperado: 'sankey',
  },

  {
    nome: 'fitas a mais: matriz em vez de novelo, com o fluxo no selector',
    dados: {
      eixoX: provincias,
      series: [
        { nome: 'Milho', valores: provincias.map((_, i) => 10 + i) },
        { nome: 'Mapira', valores: provincias.map((_, i) => 20 + i) },
        { nome: 'Arroz', valores: provincias.map((_, i) => 30 + i) },
        { nome: 'Feijão', valores: provincias.map((_, i) => 40 + i) },
      ],
      unidade: 'registos',
      fluxos: provincias.flatMap((pv) =>
        ['Milho', 'Mapira', 'Arroz', 'Feijão'].map((c) => ({ origem: pv, destino: c, valor: 10 }))
      ),
    },
    esperado: 'heatmap',
  },


  // ------------------------------------------------------------ caixa, funil, bolha, cordas
  {
    nome: 'distribuicao resumida em cinco numeros: caixa',
    dados: {
      eixoX: [],
      series: [],
      distribuicoes: [{ nome: 'Escolas por distrito', min: 4, q1: 38, mediana: 62, q3: 120, max: 360, n: 128 }],
    },
    esperado: 'caixa',
  },
  {
    nome: 'etapas encaixadas: funil',
    dados: {
      eixoX: ['Registos no ficheiro', 'Com provincia identificada', 'Com valor na metrica'],
      series: [{ nome: 'Registos', valores: [5000, 3200, 2800] }],
      funil: true,
      composicao: true,
    },
    esperado: 'funil',
  },
  {
    nome: 'etapas que sobem nao sao um funil',
    dados: {
      eixoX: ['A', 'B', 'C'],
      series: [{ nome: 'v', valores: [100, 250, 180] }],
      funil: true,
    },
    proibidas: ['funil'],
    esperado: 'barra',
  },
  {
    nome: 'ranking nao vira funil sem declaracao',
    dados: {
      eixoX: ['Nampula', 'Zambezia', 'Tete', 'Sofala'],
      series: [{ nome: 'Escolas', valores: [360, 300, 210, 120] }],
      unidade: 'escolas',
      composicao: true,
    },
    esperado: 'pizza',
    proibidas: ['funil'],
  },
  {
    nome: 'tres medidas por unidade: bolha',
    dados: {
      eixoX: provincias,
      series: [
        { nome: 'Populacao', valores: provincias.map((_, i) => 1000000 + i * 400000) },
        { nome: 'Escolas', valores: provincias.map((_, i) => 200 + i * 90) },
        { nome: 'Area', valores: provincias.map((_, i) => 30000 + i * 5000) },
      ],
      bolhas: true,
    },
    esperado: 'bolha',
  },
  {
    nome: 'tres series sem declaracao nao viram bolha',
    dados: {
      eixoX: provincias,
      series: [
        { nome: 'A (%)', valores: provincias.map((_, i) => 50 + i) },
        { nome: 'B (%)', valores: provincias.map((_, i) => 40 + i) },
        { nome: 'C (%)', valores: provincias.map((_, i) => 60 + i) },
      ],
      unidade: '%',
    },
    proibidas: ['bolha'],
    esperado: 'heatmap',
  },
  {
    nome: 'transito entre os mesmos lugares: cordas',
    dados: {
      eixoX: [],
      series: [],
      fluxos: [
        { origem: 'Nampula', destino: 'Sofala', valor: 300 },
        { origem: 'Sofala', destino: 'Nampula', valor: 180 },
        { origem: 'Nampula', destino: 'Tete', valor: 120 },
        { origem: 'Tete', destino: 'Sofala', valor: 90 },
      ],
    },
    esperado: 'cordas',
  },
  {
    nome: 'percurso entre conjuntos diferentes continua sankey',
    dados: {
      eixoX: [],
      series: [],
      fluxos: [
        { origem: 'Nampula', destino: 'Centro de saude', valor: 120 },
        { origem: 'Nampula', destino: 'Posto', valor: 210 },
        { origem: 'Sofala', destino: 'Centro de saude', valor: 80 },
      ],
    },
    esperado: 'sankey',
    proibidas: ['cordas'],
  },

  // ---------------------------------------------------------------- dispersao
  {
    nome: 'duas medidas continuas emparelhadas: dispersao',
    dados: {
      eixoX: ['12.5', '18.2', '22.1', '9.4', '30.8', '27.3', '15.6', '19.9', '25.4', '11.2'],
      series: [{ nome: 'Escolas', valores: [12, 18, 25, 9, 32, 28, 15, 20, 26, 11] }],
    },
    esperado: 'dispersao',
  },
  {
    nome: 'poucos pontos numericos nao chegam para dispersao',
    dados: { eixoX: ['1', '2', '3'], series: [{ nome: 'v', valores: [10, 20, 30] }], unidade: 'un', composicao: true },
    esperado: 'pizza',
  },
]

let passou = 0
const falhas: string[] = []

for (const c of CASOS) {
  const escolha = escolherForma(c.dados)
  const permitidas = formasPermitidas(c.dados)
  const erros: string[] = []

  if (escolha.tipo !== c.esperado) erros.push(`esperava ${c.esperado}, veio ${escolha.tipo}`)
  if (!escolha.porque || escolha.porque.length < 15) erros.push('sem justificacao legivel')
  for (const proibida of c.proibidas || []) {
    if (permitidas.includes(proibida as never)) erros.push(`oferece "${proibida}", que mente sobre estes dados`)
  }

  if (erros.length === 0) {
    passou++
  } else {
    falhas.push(`  ${c.nome}: ${erros.join('; ')}`)
  }
}

// ------------------------------------------------------------------ unidades
const UNIDADES: [string | undefined, boolean][] = [
  [undefined, true],
  ['hectares', true],
  ['toneladas', true],
  ['escolas', true],
  ['habitantes', true],
  ['%', false],
  ['por 1000 habitantes', false],
  ['por 100 000', false],
  ['hab./km²', false],
  ['taxa de cobertura', false],
  ['índice de Gini', false],
  ['média de alunos', false],
  ['densidade populacional', false],
  ['pontos percentuais', false],
]
for (const [unidade, esperado] of UNIDADES) {
  const obtido = somarFazSentido(unidade)
  if (obtido === esperado) passou++
  else falhas.push(`  unidade "${unidade}": esperava aditivo=${esperado}, veio ${obtido}`)
}

// ------------------------------------------------------------------ perfil
const perfil = perfilarDados({
  eixoX: anos,
  series: [{ nome: 'a', valores: [1, 2, 3, 4, 5, 6, 7, 8] }],
  unidade: '%',
})
if (perfil.eixoTemporal && !perfil.aditivo && perfil.nCategorias === 8) passou++
else falhas.push(`  perfil basico errado: ${JSON.stringify(perfil)}`)

const total = CASOS.length + UNIDADES.length + 1
console.log(`\nForma do grafico: ${passou}/${total}`)
if (falhas.length) {
  console.log('\nFalhas:')
  falhas.forEach((f) => console.log(f))
  process.exit(1)
}
console.log('Tudo certo.\n')
