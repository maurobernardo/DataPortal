/**
 * O motor não pode sugerir uma pergunta que ele próprio já recusou.
 *
 * O caso que motivou isto está gravado na base de dados: a análise `an_0d551614` foi recusada e a
 * primeira alternativa que ofereceu foi, palavra por palavra, a pergunta que três minutos depois
 * virou `an_ff109800` e foi recusada também. Nenhuma validação estrutural podia ter travado isso,
 * porque nada estava estruturalmente errado. O que falhou foi a execução.
 *
 * Metade dos casos aqui testa o lado oposto, que é o risco deste filtro: apagar sugestões boas por
 * parecença vaga deixaria o ecrã de recusa vazio, que é o beco que ele existe para evitar.
 *
 * Uso: npx tsx scripts/testar-memoria-de-recusas.ts
 */
import { mesmaPergunta, perguntasJaRecusadas } from '../lib/analysis/perguntas-viaveis'

const CASOS: { a: string; b: string; esperado: boolean; nota: string }[] = [
  {
    nota: 'o caso real, copiado literalmente da sugestao para a pergunta',
    a: 'As receitas internacionais do turismo em Moçambique são, em média, superiores à despesa turística internacional do país?',
    b: 'As receitas internacionais do turismo em Moçambique são, em média, superiores à despesa turística internacional do país?',
    esperado: true,
  },
  {
    nota: 'mesma pergunta com pontuacao e caixa diferentes',
    a: 'Quantas escolas há em cada província?',
    b: 'quantas escolas ha em cada provincia',
    esperado: true,
  },
  {
    nota: 'mesma pergunta com uma palavra de ligacao trocada',
    a: 'Como evoluiu a produção nacional de milho entre 2018 e 2024?',
    b: 'Como evoluiu a produção nacional de milho de 2018 a 2024?',
    esperado: true,
  },
  // ---------------------------------------------------- o que NAO se pode apagar
  {
    nota: 'mesmo assunto, pergunta diferente: escolas por provincia vs por distrito',
    a: 'Quantas escolas há em cada província?',
    b: 'Quantas escolas há em cada distrito?',
    esperado: false,
  },
  {
    nota: 'mesmo dominio, medida diferente',
    a: 'Que peso têm as receitas do turismo nas exportações totais de Moçambique?',
    b: 'Qual foi a taxa de crescimento anual das chegadas de turistas internacionais?',
    esperado: false,
  },
  {
    nota: 'contagem vs lista: sao pedidos diferentes e ambos legitimos',
    a: 'Quantas escolas temos na cidade da Beira?',
    b: 'Quais são as escolas da cidade da Beira?',
    esperado: false,
  },
  {
    nota: 'texto vazio nunca casa com nada',
    a: '',
    b: 'Quantas escolas há em cada província?',
    esperado: false,
  },
]

let passou = 0
const falhas: string[] = []
for (const c of CASOS) {
  const obtido = mesmaPergunta(c.a, c.b)
  if (obtido === c.esperado) passou++
  else falhas.push(`  ${c.nota}: esperava ${c.esperado}, veio ${obtido}`)
}

async function contraBaseDeDados() {
  // Datasets 54 e 58 sao os do turismo, os mesmos das duas recusas reais.
  const recusadas = await perguntasJaRecusadas([54, 58])
  console.log(`\nRecusas gravadas para os datasets do turismo: ${recusadas.length}`)
  for (const r of recusadas) console.log(`  - ${r.slice(0, 80)}`)
  const alvo =
    'As receitas internacionais do turismo em Moçambique são, em média, superiores à despesa turística internacional do país?'
  const apanhada = recusadas.some((r) => mesmaPergunta(alvo, r))
  console.log(`\nA sugestao que gerou o ciclo seria agora recusada: ${apanhada ? 'SIM' : 'NAO'}`)
  return apanhada
}

;(async () => {
  console.log(`\nComparacao de perguntas: ${passou}/${CASOS.length}`)
  if (falhas.length) {
    console.log('\nFalhas:')
    falhas.forEach((f) => console.log(f))
  }
  let ok = falhas.length === 0
  try {
    const apanhada = await contraBaseDeDados()
    if (!apanhada) ok = false
  } catch (e: any) {
    console.log('\n(base de dados indisponivel, so a comparacao foi testada)', e?.message)
  }
  process.exit(ok ? 0 : 1)
})()
