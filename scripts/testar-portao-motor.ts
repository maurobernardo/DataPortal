/**
 * Bateria contra o motor real: confirma que o portão bloqueia o que deve e, sobretudo, que NÃO
 * bloqueia o que hoje ainda dá resposta útil. Corre com ANALISE_PORTAO=activo.
 *
 * As perguntas foram escritas contra as colunas reais de cada dataset, não a partir do título.
 */

import { executarPipeline } from '../lib/analysis/pipeline'
import { AnaliseInviavelError } from '../lib/analysis/viabilidade'
import { gerarPerguntasViaveis } from '../lib/analysis/perguntas-viaveis'

type Caso = {
  nome: string
  datasets: number[]
  pergunta: string
  esperaBloqueio: boolean
}

const TODOS: Caso[] = [
  {
    nome: 'A1 variavel_ausente (aeroportos nao tem passageiros)',
    datasets: [5],
    pergunta: 'Quantos passageiros passaram por cada aeroporto nacional em 2023?',
    esperaBloqueio: true,
  },
  {
    nome: 'A2 granularidade (populacao so por provincia)',
    datasets: [30],
    pergunta: 'Qual e a populacao de cada distrito de Mocambique?',
    esperaBloqueio: true,
  },
  {
    nome: 'A3 serie_temporal (um so censo)',
    datasets: [29],
    pergunta: 'Como evoluiu a populacao de cada distrito entre 1997 e 2017?',
    esperaBloqueio: true,
  },
  {
    nome: 'A4 dominio_diferente (cereais nao tem tuberculose)',
    datasets: [63],
    pergunta: 'Quantos casos de tuberculose foram notificados por provincia?',
    esperaBloqueio: true,
  },
  {
    nome: 'B3 parcial (contagem da, taxa de aprovacao nao) NAO deve bloquear',
    datasets: [32],
    pergunta: 'Quantas escolas ha por distrito e qual e a taxa de aprovacao dos alunos?',
    esperaBloqueio: false,
  },
]

const filtro = process.argv[2]
const casos = filtro ? TODOS.filter((c) => c.nome.startsWith(filtro)) : TODOS

;(async () => {
  let falhas = 0

  for (const caso of casos) {
    const t0 = Date.now()
    process.stdout.write(`\n${'='.repeat(78)}\n${caso.nome}\n  "${caso.pergunta}"\n  datasets: ${caso.datasets.join(', ')}\n`)

    let bloqueou = false
    let detalhe = ''
    try {
      await executarPipeline(caso.pergunta, caso.datasets, () => {})
      detalhe = 'publicou uma analise'
    } catch (erro: any) {
      if (erro instanceof AnaliseInviavelError) {
        bloqueou = true
        const e = erro.evidencia
        detalhe = `BLOQUEOU [${e.tipo}]\n     exigido:   ${e.exigido}\n     disponivel: ${e.disponivel}\n     explicacao: ${e.explicacao}`
      } else {
        detalhe = `ERRO TECNICO: ${erro?.message}`
      }
    }

    const ok = bloqueou === caso.esperaBloqueio
    if (!ok) falhas++
    console.log(`  ${ok ? 'OK' : '>>> FALHA <<<'} (${Math.round((Date.now() - t0) / 1000)}s) ${detalhe}`)

    if (bloqueou) {
      const t1 = Date.now()
      const sugestoes = await gerarPerguntasViaveis(caso.datasets)
      console.log(`\n  Sugestoes (${sugestoes.length}) em ${Math.round((Date.now() - t1) / 1000)}s:`)
      for (const s of sugestoes) {
        console.log(`   - ${s.pergunta}`)
        console.log(`     porque: ${s.porque}`)
        console.log(`     metodo: ${s.metodo} | colunas: ${s.colunas_usadas.join(', ')}${s.nivel_geo ? ` | nivel: ${s.nivel_geo}` : ''}`)
      }
      if (sugestoes.length === 0) console.log('   (nenhuma sobreviveu a validacao)')
    }
  }

  console.log(`\n${'='.repeat(78)}\n${casos.length - falhas}/${casos.length} casos como esperado`)
  process.exit(falhas > 0 ? 1 : 0)
})()
