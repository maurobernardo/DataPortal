/**
 * Bateria sobre o realce de páginas e anos num texto de resumo.
 *
 * Uso: npx tsx scripts/testar-realce.ts
 */
import { realcarTexto } from '../lib/relatorios/realce'

let passou = 0
const falhas: string[] = []
function verificar(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) passou++
  else falhas.push(`  ${nome}${detalhe ? ': ' + detalhe : ''}`)
}

function tipos(texto: string): string[] {
  return realcarTexto(texto).map((s) => s.tipo)
}
function juntar(texto: string): string {
  return realcarTexto(texto)
    .map((s) => s.texto)
    .join('')
}

verificar('uma citação simples "(p. 6)" é isolada', tipos('achado (p. 6).').includes('pagina'))
verificar('várias páginas "(p. 5, 7)" ficam num só segmento', realcarTexto('visto (p. 5, 7) aqui').some((s) => s.tipo === 'pagina' && s.texto === '(p. 5, 7)'))
verificar('"p. 42" sem parêntesis também conta', tipos('está em p. 42 do documento').includes('pagina'))
verificar('um ano isolado é marcado', tipos('em 2023 houve um estudo').includes('numero'))
verificar('vários anos no mesmo texto são todos marcados', tipos('entre 2018 e 2024').filter((t) => t === 'numero').length === 2)
verificar('uma percentagem é marcada', tipos('uma redução de 18% na captura').includes('numero'))
verificar('uma área com unidade é marcada', tipos('uma área de 5 236 km² de costa').includes('numero'))
verificar(
  'um número SEM unidade nem forma de ano não é marcado',
  tipos('foram feitos 3 workshops institucionais').every((t) => t === 'texto'),
  'marcar todo numero solto sublinharia o texto inteiro, que e o oposto de destacar'
)
verificar(
  'um ano DENTRO de uma citação de página não conta a dobrar',
  realcarTexto('ver a tabela (p. 2018)').filter((s) => s.tipo === 'numero').length === 0,
  'a pagina engoliu o numero primeiro, por isso "2018" ali dentro faz parte da citacao, nao e um ano'
)
verificar('nada para realçar devolve só texto simples', tipos('frase comum sem nada') .every((t) => t === 'texto'))
verificar('texto vazio não rebenta', realcarTexto('').length === 0)
verificar(
  'juntar os segmentos reconstrói o texto original sem perder nem duplicar nada',
  juntar('O achado (p. 6) é de 2023, confirmado em 2024 (p. 16, 20).') ===
    'O achado (p. 6) é de 2023, confirmado em 2024 (p. 16, 20).'
)
verificar('um numero de 4 digitos fora do intervalo plausivel de ano nao e marcado', tipos('código 9999 do sistema').every((t) => t === 'texto'))

const total = passou + falhas.length
console.log(`\nRealce de texto: ${passou}/${total}`)
if (falhas.length) {
  console.log('\nFalhas:')
  falhas.forEach((f) => console.log(f))
  process.exit(1)
}
console.log('Tudo certo.\n')
