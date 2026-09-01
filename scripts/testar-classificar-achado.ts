import { classificarAchado } from '../lib/relatorios/classificar-achado'

let falhas = 0
function verificar(nome: string, condicao: boolean) {
  if (condicao) console.log(`OK   ${nome}`)
  else {
    console.error(`FALHOU ${nome}`)
    falhas++
  }
}

verificar(
  'défice: risco',
  classificarAchado('Existe um défice persistente entre o financiamento necessário e o alocado') === 'risco'
)
verificar(
  'queda: risco',
  classificarAchado('A área cultivada por agregado registou uma queda acentuada desde 2010') === 'risco'
)
verificar(
  'crescimento: oportunidade',
  classificarAchado('O crescimento real do sector agrário acelerou nos últimos cinco anos') === 'oportunidade'
)
verificar(
  'melhoria: oportunidade',
  classificarAchado('Houve uma melhoria significativa no acesso a serviços de extensão') === 'oportunidade'
)
verificar(
  'sem palavra-chave: neutro',
  classificarAchado('O relatório cobre onze inquéritos agrários realizados entre 2002 e 2020') === 'neutro'
)
verificar(
  'sinal misto: neutro',
  classificarAchado('Apesar do aumento da produtividade, o défice de financiamento agravou-se') === 'neutro'
)
verificar(
  'inglês (decline): risco',
  classificarAchado('Yields show a steady decline across the main growing regions') === 'risco'
)

if (falhas > 0) {
  console.error(`\n${falhas} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes passaram.')
