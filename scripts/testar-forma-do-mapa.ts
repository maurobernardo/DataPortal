/**
 * Bateria sobre a escolha da forma do mapa.
 *
 * A regra mais importante e a que RECUSA: um coropletico de contagens pinta uma provincia grande
 * de escuro por ela ser grande, nao por estar melhor servida. Metade dos casos aqui existe para
 * garantir que isso nao volta a acontecer.
 *
 * Uso: npx tsx scripts/testar-forma-do-mapa.ts
 */
import { escolherMapa, formasDeMapaPermitidas, normalizarGeometria } from '../lib/analysis/forma-do-mapa'

type Caso = {
  nome: string
  dados: Parameters<typeof escolherMapa>[0]
  esperado: string
  proibidas?: string[]
}

const CASOS: Caso[] = [
  // ------------------------------------------------------- o erro do coropletico
  {
    nome: 'CONTAGEM de escolas por provincia NAO e coropletico',
    dados: { geometria: 'poligono', nFeicoes: 11, temValorPorUnidade: true, valorEAditivo: true, nUnidadesComValor: 11 },
    esperado: 'simbolos',
    proibidas: [],
  },
  {
    nome: 'TAXA de cobertura por provincia e coropletico',
    dados: { geometria: 'poligono', nFeicoes: 11, temValorPorUnidade: true, valorEAditivo: false, nUnidadesComValor: 11 },
    esperado: 'coropletico',
  },
  {
    nome: 'contagem por distrito continua a ser simbolos',
    dados: { geometria: 'poligono', nFeicoes: 128, temValorPorUnidade: true, valorEAditivo: true, nUnidadesComValor: 128 },
    esperado: 'simbolos',
  },
  {
    nome: 'categorias (hotspot/coldspot) pintam a area',
    dados: {
      geometria: 'poligono',
      nFeicoes: 11,
      temValorPorUnidade: true,
      valorEAditivo: true,
      nUnidadesComValor: 11,
      categorico: true,
    },
    esperado: 'coropletico',
  },
  {
    nome: 'poucas unidades nao formam escala de cor',
    dados: { geometria: 'poligono', nFeicoes: 3, temValorPorUnidade: true, valorEAditivo: false, nUnidadesComValor: 3 },
    esperado: 'simbolos',
  },

  // ------------------------------------------------------- mudanca
  {
    nome: 'variacao entre dois anos e mapa de mudanca, nao coropletico',
    dados: {
      geometria: 'poligono',
      nFeicoes: 11,
      temValorPorUnidade: true,
      valorEAditivo: true,
      nUnidadesComValor: 11,
      eVariacao: true,
    },
    esperado: 'mudanca',
  },
  {
    nome: 'variacao de uma taxa tambem e mapa de mudanca',
    dados: {
      geometria: 'poligono',
      nFeicoes: 11,
      temValorPorUnidade: true,
      valorEAditivo: false,
      nUnidadesComValor: 11,
      eVariacao: true,
    },
    esperado: 'mudanca',
  },
  {
    nome: 'sem a declaracao de variacao volta a decidir pela aditividade',
    dados: { geometria: 'poligono', nFeicoes: 11, temValorPorUnidade: true, valorEAditivo: true, nUnidadesComValor: 11 },
    esperado: 'simbolos',
    proibidas: ['mudanca'],
  },
  {
    nome: 'uma unidade unica continua a ser destaque, mesmo sendo variacao',
    dados: {
      geometria: 'poligono',
      nFeicoes: 128,
      temValorPorUnidade: true,
      eVariacao: true,
      unidadeUnica: true,
    },
    esperado: 'destaque',
  },
  {
    nome: 'variacao sobre pontos nao vira mapa de mudanca',
    dados: { geometria: 'ponto', nFeicoes: 48, eVariacao: true },
    esperado: 'pontos',
    proibidas: ['mudanca'],
  },

  // ------------------------------------------------------- densidade de pontos
  {
    nome: 'poucas barragens: pontos individuais',
    dados: { geometria: 'ponto', nFeicoes: 48 },
    esperado: 'pontos',
  },
  {
    nome: 'unidades sanitarias (1577): agrupamento',
    dados: { geometria: 'ponto', nFeicoes: 1577 },
    esperado: 'agrupamento',
  },
  {
    nome: 'escolas (9535): mapa de calor',
    dados: { geometria: 'ponto', nFeicoes: 9535 },
    esperado: 'calor',
  },
  {
    nome: 'aldeias (11349): mapa de calor',
    dados: { geometria: 'ponto', nFeicoes: 11349 },
    esperado: 'calor',
  },
  {
    nome: 'na fronteira dos 300 ainda sao pontos',
    dados: { geometria: 'ponto', nFeicoes: 300 },
    esperado: 'pontos',
  },
  {
    nome: 'logo acima dos 300 ja e agrupamento',
    dados: { geometria: 'ponto', nFeicoes: 301 },
    esperado: 'agrupamento',
  },

  // ------------------------------------------------------- linhas
  {
    nome: 'estradas com estado medido: rede tematica',
    dados: { geometria: 'linha', nFeicoes: 2400, temValorPorUnidade: true },
    esperado: 'rede',
  },
  {
    nome: 'linha ferrea sem atributo: rede na mesma',
    dados: { geometria: 'linha', nFeicoes: 12 },
    esperado: 'rede',
    proibidas: ['calor', 'agrupamento'],
  },

  // ------------------------------------------------------- unidade unica
  {
    nome: 'qual e o maior distrito: destaque',
    dados: { geometria: 'poligono', nFeicoes: 128, temValorPorUnidade: true, valorEAditivo: true, unidadeUnica: true },
    esperado: 'destaque',
  },

  // ------------------------------------------------------- sem medida
  {
    nome: 'poligonos sem nada medido mostram o territorio',
    dados: { geometria: 'poligono', nFeicoes: 11 },
    esperado: 'coropletico',
  },
]

let passou = 0
const falhas: string[] = []

for (const c of CASOS) {
  const escolha = escolherMapa(c.dados)
  const permitidas = formasDeMapaPermitidas(c.dados)
  const erros: string[] = []

  if (escolha.tipo !== c.esperado) erros.push(`esperava ${c.esperado}, veio ${escolha.tipo}`)
  if (!escolha.porque || escolha.porque.length < 15) erros.push('sem justificacao legivel')
  for (const p of c.proibidas || []) {
    if (permitidas.includes(p as never)) erros.push(`oferece "${p}", que nao serve estes dados`)
  }

  if (erros.length === 0) passou++
  else falhas.push(`  ${c.nome}: ${erros.join('; ')}`)
}

// ------------------------------------------------------------------ geometria
// Os valores reais do catalogo incluem gralha ("Poligino"), espaco a mais e plural.
const GEOMETRIAS: [string | null | undefined, string][] = [
  // Cadeias GeoJSON, que sao o que `tipoGeometria` traz de facto. O prefixo Multi e o caso
  // NORMAL num shapefile: uma provincia com ilhas e um MultiPolygon.
  ['Polygon', 'poligono'],
  ['MultiPolygon', 'poligono'],
  ['Point', 'ponto'],
  ['MultiPoint', 'ponto'],
  ['LineString', 'linha'],
  ['MultiLineString', 'linha'],
  ['GeometryCollection', 'mista'],
  ['Polígono', 'poligono'],
  ['Polígono ', 'poligono'],
  ['Poligino', 'poligono'],
  ['polygon', 'poligono'],
  ['Ponto', 'ponto'],
  ['Pontos', 'ponto'],
  ['MultiPonto', 'ponto'],
  ['Point', 'ponto'],
  ['Linha', 'linha'],
  ['LineString', 'linha'],
  ['Mista', 'mista'],
  [null, 'nenhuma'],
  ['', 'nenhuma'],
  ['qualquer coisa', 'nenhuma'],
]
for (const [entrada, esperado] of GEOMETRIAS) {
  const obtido = normalizarGeometria(entrada)
  if (obtido === esperado) passou++
  else falhas.push(`  geometria "${entrada}": esperava ${esperado}, veio ${obtido}`)
}

const total = CASOS.length + GEOMETRIAS.length
console.log(`\nForma do mapa: ${passou}/${total}`)
if (falhas.length) {
  console.log('\nFalhas:')
  falhas.forEach((f) => console.log(f))
  process.exit(1)
}
console.log('Tudo certo.\n')
