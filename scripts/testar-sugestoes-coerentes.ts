/**
 * Bateria sobre a coerencia das sugestoes com o proprio portao.
 *
 * Visto ao vivo e reportado pelo utilizador: o motor sugeriu "Como evoluiu a producao nacional de
 * milho entre 2015 e 2024?", a pergunta foi clicada, o portao bloqueou-a, e ela reapareceu na
 * lista do proprio ecra de bloqueio. Sao dois defeitos: sugerir anos que nao tem dados, e
 * reoferecer o que acabou de ser recusado.
 *
 * Uso: npx tsx scripts/testar-sugestoes-coerentes.ts
 */
import { ordenarPorProximidade, anosCitados } from '../lib/analysis/perguntas-viaveis'
import type { PerguntaViavel } from '../lib/analysis/types'

const p = (pergunta: string): PerguntaViavel =>
  ({ pergunta, porque: '', colunas_usadas: ['value'], metodo: 'resumo_estatistico', dataset_ids: [63] })

let falhas = 0
const conf = (nome: string, cond: boolean, detalhe: string) => {
  if (!cond) falhas++
  console.log(`${cond ? 'OK  ' : 'FALHA'} ${nome}\n      -> ${detalhe}`)
}

// --- anos citados
conf('extrai anos de um intervalo', JSON.stringify(anosCitados('entre 2015 e 2024')) === '[2015,2024]', JSON.stringify(anosCitados('entre 2015 e 2024')))
conf('ignora numeros que nao sao anos', JSON.stringify(anosCitados('as 100 mil toneladas em 2020')) === '[2020]', JSON.stringify(anosCitados('as 100 mil toneladas em 2020')))
conf('sem anos devolve vazio', anosCitados('producao de milho por provincia').length === 0, 'vazio')

// --- nao reoferecer a pergunta bloqueada
const original = 'Como evoluiu a produção nacional de milho entre 2015 e 2024?'
const lista = [
  p('Como evoluiu a produção nacional de milho entre 2015 e 2024?'),
  p('Que províncias concentram a maior parte da produção nacional de milho?'),
  p('Existe relação entre a área cultivada de milho e a produção de milho?'),
]
const r1 = ordenarPorProximidade(lista, original)
conf('remove a pergunta identica que foi bloqueada', !r1.some((x) => x.pergunta === original), `sobraram ${r1.length} de ${lista.length}`)
conf('mantem as alternativas diferentes', r1.length === 2, r1.map((x) => x.pergunta.slice(0, 40)).join(' | '))

// variacao quase identica (so muda pontuacao/acento)
const r2 = ordenarPorProximidade([p('Como evoluiu a producao nacional de milho entre 2015 e 2024')], original)
conf('remove variacao quase identica', r2.length === 0, `sobraram ${r2.length}`)

// pergunta diferente sobre o mesmo tema NAO pode ser removida
const r3 = ordenarPorProximidade([p('Que província produziu mais milho em 2023?')], original)
conf('mantem pergunta diferente sobre o mesmo tema', r3.length === 1, `sobraram ${r3.length}`)

// sem pergunta original nao filtra nada
const r4 = ordenarPorProximidade(lista, '')
conf('sem pergunta original devolve tudo', r4.length === 3, `sobraram ${r4.length}`)

console.log(`\n${falhas === 0 ? 'TODOS OS CASOS CORRECTOS' : falhas + ' FALHA(S)'}`)
if (falhas > 0) process.exit(1)
