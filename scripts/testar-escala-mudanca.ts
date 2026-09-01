/**
 * Bateria sobre a escala divergente dos mapas de mudança.
 *
 * A propriedade que interessa é a SIMETRIA. Se uma descida de 5% e uma subida de 5% não caírem em
 * classes espelhadas, o mapa dá mais peso visual a um lado do que ao outro sem nada nos dados o
 * justificar, e ninguém repara porque o mapa continua bonito.
 *
 * Uso: npx tsx scripts/testar-escala-mudanca.ts
 */
import { CLASSES_MUDANCA, classeDeMudanca, limitesMudanca, percentil } from '../lib/analysis/simbologia'

let passou = 0
const falhas: string[] = []

function verificar(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) passou++
  else falhas.push(`  ${nome}${detalhe ? ': ' + detalhe : ''}`)
}

const VARIACOES = [-40, -22, -5, -0.4, 0, 1.2, 8, 19, 35]
const limites = limitesMudanca(VARIACOES)

verificar('cinco classes, logo quatro limites', limites.length === 4)
verificar(
  'os limites sao simetricos a volta do zero',
  Math.abs(limites[0] + limites[3]) < 1e-9 && Math.abs(limites[1] + limites[2]) < 1e-9,
  JSON.stringify(limites)
)
verificar('o zero cai sempre na classe do meio', classeDeMudanca(0, limites) === 2)
verificar(
  'valores simetricos caem em classes espelhadas',
  classeDeMudanca(-19, limites) + classeDeMudanca(19, limites) === 4,
  'e a garantia de que o mapa nao favorece um lado'
)
verificar('o maior desvio negativo fica na classe mais baixa', classeDeMudanca(-40, limites) === 0)
verificar('o maior desvio positivo fica na classe mais alta', classeDeMudanca(35, limites) === 4)
verificar(
  'ruido de arredondamento conta como sem mudanca',
  classeDeMudanca(-0.4, limites) === 2 && classeDeMudanca(1.2, limites) === 2,
  'sem a faixa nula, um pais inteiro de arredondamentos parecia estar em movimento'
)
verificar(
  'uma subida a serio nao e confundida com ausencia de mudanca',
  classeDeMudanca(8, limites) > 2
)

// ------------------------------------------------------- o outlier que apagava as descidas
/*
 * O caso real, tirado de um mapa de producao de milho por provincia. Uma provincia cresceu 1048% e
 * varias desceram. Com a amplitude tirada do MAIOR desvio, a faixa central ficava em mais ou menos
 * 105%, e como uma variacao percentual nunca desce abaixo de -100%, TODAS as descidas do pais eram
 * pintadas como "sem mudanca". Uma provincia que perdesse 99% da producao aparecia estavel.
 */
const COM_OUTLIER = [1048, 210, 160, 120, 75, 40, -18, -55, -80, -100]
const limOutlier = limitesMudanca(COM_OUTLIER)
verificar(
  'a faixa nula nao engole o intervalo inteiro das descidas',
  Math.abs(limOutlier[1]) < 100,
  `faixa nula em ${limOutlier[1].toFixed(1)}: acima de 100 nenhuma descida percentual e representavel`
)
verificar(
  'uma queda de 100% e reportada como descida, nao como estabilidade',
  classeDeMudanca(-100, limOutlier) < 2,
  `caiu na classe ${classeDeMudanca(-100, limOutlier)}`
)
verificar('uma queda de 80% tambem e descida', classeDeMudanca(-80, limOutlier) < 2)
verificar('uma queda de 55% tambem e descida', classeDeMudanca(-55, limOutlier) < 2)
verificar('o outlier fica na classe mais alta sem arrastar a escala', classeDeMudanca(1048, limOutlier) === 4)
verificar(
  'uma subida moderada nao e confundida com ausencia de mudanca',
  classeDeMudanca(75, limOutlier) > 2,
  'com a escala presa ao maximo, 75% caia na mesma classe que zero'
)
verificar('a simetria mantem-se com outlier', Math.abs(limOutlier[0] + limOutlier[3]) < 1e-9)

verificar('percentil 90 de 1 a 10', Math.abs(percentil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9) - 9.1) < 1e-9)
verificar('percentil de um so valor', percentil([7], 0.9) === 7)
verificar('percentil de lista vazia nao rebenta', percentil([], 0.5) === 0)

// ---------------------------------------------------------------- casos limite
verificar('sem valores nao rebenta', limitesMudanca([]).length === 4)
verificar(
  'quando nada mudou, tudo cai na classe do meio',
  classeDeMudanca(0, limitesMudanca([0, 0, 0])) === 2
)
const soSubidas = limitesMudanca([2, 5, 9])
verificar(
  'so com subidas a escala continua simetrica',
  Math.abs(soSubidas[0] + soSubidas[3]) < 1e-9,
  'o lado negativo fica vazio, e e assim que se ve que ninguem desceu'
)
verificar('nenhuma subida cai no lado negativo', classeDeMudanca(2, soSubidas) >= 2)
verificar(
  'valores nao finitos sao ignorados em vez de contaminarem a escala',
  Number.isFinite(limitesMudanca([NaN, 10, -10, Infinity])[3])
)

// ---------------------------------------------------------------- rotulos
verificar('ha um rotulo por classe', CLASSES_MUDANCA.length === 5)
verificar(
  'o centro chama-se sem mudanca, e nao baixo',
  CLASSES_MUDANCA[2].rotulo === 'Sem mudança'
)
verificar(
  'os rotulos dizem a direccao por palavras, nao so por cor',
  CLASSES_MUDANCA.every((c) => /desceu|subiu|sem mudan/i.test(c.rotulo)),
  'uma escala divergente e ambigua a preto e branco: o sinal tem de estar escrito'
)

const total = passou + falhas.length
console.log(`\nEscala de mudanca: ${passou}/${total}`)
if (falhas.length) {
  console.log('\nFalhas:')
  falhas.forEach((f) => console.log(f))
  process.exit(1)
}
console.log('Tudo certo.\n')
