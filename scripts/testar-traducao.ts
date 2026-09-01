/**
 * Bateria sobre o guardião da tradução.
 *
 * Um modelo a traduzir texto cheio de números tem duas formas plausíveis de o estragar em silêncio:
 * trocar a convenção decimal (que noutro contexto seria uma tradução correcta) e arredondar de
 * passagem. As duas produzem um relatório impecável e falso. Este guardião existe para o recusar.
 *
 * Uso: npx tsx scripts/testar-traducao.ts
 */
import { numerosDoTexto, numerosPerdidos } from '../lib/analysis/traducao'

let passou = 0
const falhas: string[] = []
function verificar(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) passou++
  else falhas.push(`  ${nome}${detalhe ? ': ' + detalhe : ''}`)
}

// ------------------------------------------------------------------ leitura
verificar('apanha inteiros e decimais', JSON.stringify(numerosDoTexto('105 escolas e 72,4%')) === '["105","72,4"]')
verificar('apanha separador de milhares', numerosDoTexto('foram 1.580 casos').includes('1.580'))
verificar('nao arrasta a pontuacao final', numerosDoTexto('subiu 12,5.').includes('12,5'))
verificar('texto sem numeros da lista vazia', numerosDoTexto('nenhum numero aqui').length === 0)

// ------------------------------------------------------------------ o que tem de passar
verificar(
  'uma traducao fiel passa',
  numerosPerdidos('A Beira tem 105 escolas, 72,4% do total.', 'Beira has 105 schools, 72,4% of the total.').length === 0
)
verificar(
  'reordenar a frase nao e perder numeros',
  numerosPerdidos('Subiu 12 pontos em 2023.', 'In 2023 it rose by 12 points.').length === 0
)

// ------------------------------------------------------------------ o que tem de ser recusado
verificar(
  'trocar a virgula decimal pelo ponto e RECUSADO',
  numerosPerdidos('cobertura de 72,4%', 'coverage of 72.4%').includes('72,4'),
  'em portugues e setenta e dois virgula quatro; convertido, um leitor ingles le outra coisa'
)
verificar(
  'trocar o separador de milhares e RECUSADO',
  numerosPerdidos('foram 1.580 casos', 'there were 1,580 cases').includes('1.580')
)
verificar(
  'arredondar de passagem e RECUSADO',
  numerosPerdidos('media de 12,7 por distrito', 'average of 13 per district').includes('12,7')
)
verificar(
  'perder um numero por completo e RECUSADO',
  numerosPerdidos('105 escolas em 11 provincias', '105 schools across the provinces').includes('11')
)

// ------------------------------------------------------------------ multiconjunto
verificar(
  'um numero repetido que perdeu uma ocorrencia e apanhado',
  numerosPerdidos('12 e 12 e 12', '12 and 12').length === 1,
  'com um Set isto passaria despercebido'
)
verificar(
  'as tres ocorrencias mantidas passam',
  numerosPerdidos('12 e 12 e 12', '12 and 12 and 12').length === 0
)

// ------------------------------------------------------------------ casos limite
verificar('original sem numeros nunca perde nada', numerosPerdidos('sem numeros', 'no numbers').length === 0)
verificar(
  'numeros a mais na traducao nao sao um erro',
  numerosPerdidos('105 escolas', '105 schools out of 128 districts').length === 0,
  'o guardiao protege o que existia; acrescentos sao problema de outra regra'
)

const total = passou + falhas.length
console.log(`\nGuardiao da traducao: ${passou}/${total}`)
if (falhas.length) {
  console.log('\nFalhas:')
  falhas.forEach((f) => console.log(f))
  process.exit(1)
}
console.log('Tudo certo.\n')
