/**
 * Bateria sobre a comparação entre corridas de uma análise viva.
 *
 * A regra mais valiosa é a que RECUSA comparar. Duas corridas com planos diferentes produzem
 * cálculos com identificadores diferentes, e forçá-los um contra o outro daria "descobertas" que
 * ninguém consegue desmentir porque nunca existiram. Metade dos casos aqui defende isso.
 *
 * Uso: npx tsx scripts/testar-comparar-corridas.ts
 */
import { compararCorridas, houveMudanca } from '../lib/analysis/comparar-corridas'

let passou = 0
const falhas: string[] = []
function verificar(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) passou++
  else falhas.push(`  ${nome}${detalhe ? ': ' + detalhe : ''}`)
}

const calcs = (o: Record<string, number | string>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { valor: v }]))

const serie = (passo: string, us: [string, string, number][]) => ({
  passo_id: passo,
  metrica: 'Escolas por província',
  unidades: us.map(([codigo, nome, valor]) => ({ codigo, nome, valor })),
})

// ------------------------------------------------------------------ recusa
const planoMudou = compararCorridas(
  { calcs: calcs({ s1_total: 100, s1_media: 9, s2_max: 30, s2_min: 2 }) },
  { calcs: calcs({ p9_total: 100, p9_media: 9, p8_max: 30, p8_min: 2 }) }
)
verificar('planos diferentes: recusa comparar', planoMudou.comparavel === false)
verificar('a recusa explica-se por palavras', (planoMudou.razao || '').length > 40)
verificar('a recusa nao inventa mudancas', planoMudou.numeros.length === 0 && planoMudou.unidades.length === 0)

verificar(
  'corrida sem calculos nao e comparavel',
  compararCorridas({ calcs: {} }, { calcs: calcs({ a: 1 }) }).comparavel === false
)

// ------------------------------------------------------------------ numeros
const c = compararCorridas(
  { calcs: calcs({ total: 1000, media: 50, estavel: 7, texto: 'Sofala' }) },
  { calcs: calcs({ total: 1200, media: 50, estavel: 7.01, texto: 'Nampula' }) }
)
verificar('corridas com o mesmo plano sao comparaveis', c.comparavel === true)
verificar('uma subida real e reportada', c.numeros.some((n) => n.id === 'total' && n.delta === 200))
verificar('a variacao percentual e calculada', c.numeros.find((n) => n.id === 'total')?.deltaPct === 20)
verificar('um numero igual nao aparece', !c.numeros.some((n) => n.id === 'media'))
verificar(
  'ruido de arredondamento nao aparece',
  !c.numeros.some((n) => n.id === 'estavel'),
  '7 para 7,01 sao 0,14%: abaixo do limiar, e enterraria a mudanca que interessa'
)
verificar('valores de texto sao ignorados', !c.numeros.some((n) => n.id === 'texto'))

const doZero = compararCorridas({ calcs: calcs({ x: 0 }) }, { calcs: calcs({ x: 40 }) })
verificar(
  'a partir de zero nao ha percentagem, mas ha mudanca',
  doZero.numeros[0]?.deltaPct === null && doZero.numeros[0]?.delta === 40
)

// ------------------------------------------------------------------ ordem
const ordem = compararCorridas(
  { calcs: calcs({ nacional: 100000, distrito: 10 }) },
  { calcs: calcs({ nacional: 101000, distrito: 20 }) }
)
verificar(
  'a maior variacao RELATIVA vem primeiro',
  ordem.numeros[0]?.id === 'distrito',
  'um distrito que duplicou e mais noticia do que o total nacional a subir 1%'
)

// ------------------------------------------------------------------ unidades
const comUnidades = compararCorridas(
  {
    calcs: calcs({ a: 1, b: 2 }),
    series: [serie('s1', [['01', 'Niassa', 100], ['02', 'Cabo Delgado', 200], ['03', 'Tete', 50]])],
  },
  {
    calcs: calcs({ a: 1, b: 2 }),
    series: [serie('s1', [['01', 'Niassa', 140], ['02', 'Cabo Delgado', 200], ['04', 'Sofala', 90]])],
  }
)
verificar('uma unidade que mudou e reportada', comUnidades.unidades.some((u) => u.nome === 'Niassa' && u.delta === 40))
verificar('uma unidade igual nao aparece', !comUnidades.unidades.some((u) => u.nome === 'Cabo Delgado'))
verificar('uma unidade nova e assinalada', comUnidades.unidadesNovas.includes('Sofala'))
verificar(
  'uma unidade que desapareceu e assinalada',
  comUnidades.unidadesPerdidas.includes('Tete'),
  'cobertura perdida e uma mudanca, e das que mais enganam se ficar calada'
)

// ------------------------------------------------------------------ sem novidade
const igual = compararCorridas(
  { calcs: calcs({ a: 10 }), series: [serie('s1', [['01', 'Niassa', 5]])] },
  { calcs: calcs({ a: 10 }), series: [serie('s1', [['01', 'Niassa', 5]])] }
)
verificar('duas corridas iguais sao comparaveis', igual.comparavel === true)
verificar('e nao ha nada a contar', houveMudanca(igual) === false)
verificar('quando ha mudanca, ha o que contar', houveMudanca(comUnidades) === true)
verificar('uma comparacao recusada nunca conta novidade', houveMudanca(planoMudou) === false)

const total = passou + falhas.length
console.log(`\nComparacao de corridas: ${passou}/${total}`)
if (falhas.length) {
  console.log('\nFalhas:')
  falhas.forEach((f) => console.log(f))
  process.exit(1)
}
console.log('Tudo certo.\n')
