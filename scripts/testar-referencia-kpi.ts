/**
 * Bateria sobre a referência de um KPI.
 *
 * A regra que mais importa aqui é a que RECUSA. Comparar um total nacional com a distribuição das
 * províncias que o compõem daria sempre "o mais alto do país", sobre um número que não é de
 * província nenhuma: metade destes casos existe para garantir que isso não acontece.
 *
 * Uso: npx tsx scripts/testar-referencia-kpi.ts
 */
import {
  comoNumero,
  mediana,
  posicaoNaDistribuicao,
  referenciaDoKpi,
  variacaoDaSerie,
} from '../lib/analysis/referencia-kpi'

let passou = 0
const falhas: string[] = []

function verificar(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) passou++
  else falhas.push(`  ${nome}${detalhe ? ': ' + detalhe : ''}`)
}

// As onze províncias, com uma distribuição plausível de contagens de escolas.
const PROVINCIAS = [820, 1310, 640, 1580, 990, 410, 1120, 760, 1450, 530, 925].map((valor) => ({ valor }))
const TOTAL_NACIONAL = PROVINCIAS.reduce((s, p) => s + p.valor, 0)

// ------------------------------------------------------------------ recusas
verificar(
  'um TOTAL nacional nao recebe posicao entre as provincias',
  posicaoNaDistribuicao(TOTAL_NACIONAL, PROVINCIAS) === null,
  'seria sempre "o mais alto do pais", sobre um numero que nao e de nenhuma provincia'
)
verificar(
  'um valor abaixo do minimo tambem e recusado',
  posicaoNaDistribuicao(10, PROVINCIAS) === null
)
verificar(
  'poucas unidades nao formam distribuicao',
  posicaoNaDistribuicao(50, [{ valor: 10 }, { valor: 50 }, { valor: 90 }]) === null
)
verificar(
  'todas as unidades iguais: posicao nao significa nada',
  posicaoNaDistribuicao(7, [{ valor: 7 }, { valor: 7 }, { valor: 7 }, { valor: 7 }, { valor: 7 }, { valor: 7 }]) === null
)
verificar('um valor de texto nao recebe referencia', posicaoNaDistribuicao('Sofala', PROVINCIAS) === null)
verificar('sem serie nao ha posicao', posicaoNaDistribuicao(900, null) === null)
verificar('um so ponto nao e variacao', variacaoDaSerie([42]) === null)
verificar('serie so com buracos nao e variacao', variacaoDaSerie([null, null]) === null)

// ------------------------------------------------------------------ posicao
const posMax = posicaoNaDistribuicao(1580, PROVINCIAS)
verificar('o maximo do pais fica a 100%', posMax?.tipo === 'posicao' && Math.round(posMax.posicaoPct) === 100)
const posMin = posicaoNaDistribuicao(410, PROVINCIAS)
verificar('o minimo do pais fica a 0%', posMin?.tipo === 'posicao' && Math.round(posMin.posicaoPct) === 0)
const posMedia = posicaoNaDistribuicao(925, PROVINCIAS)
verificar(
  'a mediana e reconhecida como nao estando acima de si propria',
  posMedia?.tipo === 'posicao' && posMedia.mediana === 925 && posMedia.acimaDaMediana === false
)
verificar(
  'um valor alto e marcado como acima da mediana',
  (posicaoNaDistribuicao(1450, PROVINCIAS) as any)?.acimaDaMediana === true
)
verificar(
  'o arredondamento do ecra nao deita fora o maximo',
  posicaoNaDistribuicao(1583, PROVINCIAS) !== null,
  'meio por cento de folga absorve o valor arredondado no cartao'
)
verificar('a contagem de unidades e reportada', (posicaoNaDistribuicao(990, PROVINCIAS) as any)?.nUnidades === 11)

// ------------------------------------------------------------------ variacao
const sobe = variacaoDaSerie([100, 110, 125])
verificar(
  'variacao usa os dois ultimos pontos',
  sobe?.tipo === 'variacao' && sobe.anterior === 110 && sobe.actual === 125 && sobe.subiu === true
)
verificar('variacao percentual correcta', sobe?.tipo === 'variacao' && Math.round(sobe.deltaPct!) === 14)
const desce = variacaoDaSerie([100, 80])
verificar('descida e marcada como descida', desce?.tipo === 'variacao' && desce.subiu === false && desce.delta === -20)
const comBuraco = variacaoDaSerie([100, 120, null])
verificar(
  'um buraco no fim salta para o ultimo ano com dados',
  comBuraco?.tipo === 'variacao' && comBuraco.actual === 120 && comBuraco.anterior === 100
)
const deZero = variacaoDaSerie([0, 50])
verificar(
  'a partir de zero nao ha percentagem que exista',
  deZero?.tipo === 'variacao' && deZero.deltaPct === null && deZero.delta === 50
)

// ------------------------------------------------------------------ escolha
verificar(
  'a variacao ganha a posicao quando as duas existem',
  referenciaDoKpi({ valor: 925, serieTemporal: [900, 925], unidadesDaSerie: PROVINCIAS })?.tipo === 'variacao'
)
verificar(
  'sem serie temporal cai para a posicao',
  referenciaDoKpi({ valor: 925, serieTemporal: null, unidadesDaSerie: PROVINCIAS })?.tipo === 'posicao'
)
verificar(
  'sem nenhuma das duas nao inventa referencia',
  referenciaDoKpi({ valor: 925, serieTemporal: null, unidadesDaSerie: null }) === null
)

// ------------------------------------------------------------------ leitura de numeros
verificar('numero simples', comoNumero(1234) === 1234)
verificar('percentagem em texto', comoNumero('72,4%') === 72.4)
verificar('separador de milhares', comoNumero('1.580') === 1580)
verificar('texto puro nao e numero', comoNumero('Sofala') === null)
verificar('mediana de par e a media dos dois do meio', mediana([1, 2, 3, 4]) === 2.5)

const total = passou + falhas.length
console.log(`\nReferencia do KPI: ${passou}/${total}`)
if (falhas.length) {
  console.log('\nFalhas:')
  falhas.forEach((f) => console.log(f))
  process.exit(1)
}
console.log('Tudo certo.\n')
