/**
 * Varrimento final antes de lançar: confirma que os caminhos COMUNS continuam a funcionar.
 *
 * As baterias anteriores foram atrás de anomalias em casos difíceis. Esta faz o contrário: repete
 * o que a maioria dos utilizadores faz, porque o executor mudou muito desde que essas partes foram
 * testadas (inferência de indicador, filtros por lado, colapso de pseudo-replicação, dois ficheiros
 * no sandbox) e cada uma dessas mudanças podia ter partido algo que já estava bom.
 *
 * Uso: DATABASE_URL=... ANALISE_PORTAO=activo npx tsx scripts/testar-regressao-final.ts
 */

import { executarPipeline } from '../lib/analysis/pipeline'
import { AnaliseInviavelError } from '../lib/analysis/viabilidade'
import { gerarPerguntasViaveis } from '../lib/analysis/perguntas-viaveis'

type Caso = {
  nome: string
  datasets: number[]
  pergunta: string
  espera: 'analise' | 'bloqueio'
  /** Cálculos mínimos para a análise valer alguma coisa. */
  minCalcs?: number
}

const CASOS: Caso[] = [
  {
    nome: 'R1 pergunta simples num só dataset (o caso mais comum)',
    datasets: [30],
    pergunta: 'Quais são as províncias mais e menos populosas de Moçambique?',
    espera: 'analise',
    minCalcs: 10,
  },
  {
    nome: 'R2 dataset de pontos com filtro por distrito',
    datasets: [12],
    pergunta: 'Quantas unidades sanitárias existem no distrito de Vilankulo e de que tipo são?',
    espera: 'analise',
    minCalcs: 5,
  },
  {
    nome: 'R3 formato longo, um só dataset',
    datasets: [63],
    pergunta: 'Qual província produziu mais milho e como evoluiu a produção nacional?',
    espera: 'analise',
    minCalcs: 10,
  },
  {
    nome: 'R4 portão: pergunta que os dados não respondem',
    datasets: [30],
    pergunta: 'Qual e a populacao de cada distrito de Mocambique?',
    espera: 'bloqueio',
  },
  {
    nome: 'R5 cruzamento representativo',
    datasets: [67, 68],
    pergunta: 'As províncias com maior área cultivada de cana-de-açúcar têm melhor acesso à eletricidade?',
    espera: 'analise',
    minCalcs: 10,
  },
]

;(async () => {
  const resumo: string[] = []
  let problemas = 0

  for (let i = 0; i < CASOS.length; i++) {
    const c = CASOS[i]
    console.log(`\n${'='.repeat(78)}\n${c.nome}\n  "${c.pergunta}"  [datasets ${c.datasets.join(', ')}]`)
    const t0 = Date.now()
    try {
      const r = await executarPipeline(c.pergunta, c.datasets, () => {})
      const s = Math.round((Date.now() - t0) / 1000)
      const nCalcs = Object.keys(r.contexto.calcs).length
      const falhados = r.contexto.avisos.filter((a) => /não pôde ser executado/i.test(a))

      if (c.espera === 'bloqueio') {
        problemas++
        console.log(`  >>> PROBLEMA: esperava bloqueio e publicou (${s}s)`)
        resumo.push(`${c.nome}: PROBLEMA (publicou em vez de bloquear)`)
        continue
      }

      const poucos = nCalcs < (c.minCalcs ?? 1)
      if (poucos) problemas++
      console.log(
        `  ${poucos ? '>>> PROBLEMA' : 'OK'} (${s}s) calcs=${nCalcs} graficos=${r.contexto.graficos.length} falhados=${falhados.length}`
      )
      console.log(`  titulo: ${r.narrativa_resolvida.titulo}`)
      for (const f of falhados) console.log(`     x ${f.slice(0, 220)}`)
      resumo.push(`${c.nome}: ${poucos ? 'PROBLEMA' : 'ok'} calcs=${nCalcs} falhados=${falhados.length}`)
    } catch (e: any) {
      const s = Math.round((Date.now() - t0) / 1000)
      if (e instanceof AnaliseInviavelError) {
        if (c.espera !== 'bloqueio') {
          problemas++
          console.log(`  >>> PROBLEMA: bloqueou uma pergunta que devia responder (${s}s)`)
          console.log(`      [${e.evidencia.tipo}] ${e.evidencia.explicacao}`)
          resumo.push(`${c.nome}: PROBLEMA (bloqueou indevidamente)`)
          continue
        }
        const sug = await gerarPerguntasViaveis(c.datasets, undefined, c.pergunta)
        const semSugestoes = sug.length === 0
        if (semSugestoes) problemas++
        console.log(`  ${semSugestoes ? '>>> PROBLEMA (sem alternativas)' : 'OK'} bloqueou (${s}s): ${e.evidencia.explicacao.slice(0, 140)}`)
        console.log(`  sugestões verificadas: ${sug.length}`)
        for (const x of sug.slice(0, 3)) console.log(`     - ${x.pergunta}`)
        resumo.push(`${c.nome}: ${semSugestoes ? 'PROBLEMA' : 'ok'} bloqueou, ${sug.length} sugestões`)
      } else {
        problemas++
        console.log(`  >>> ERRO TÉCNICO (${s}s): ${e?.message}`)
        resumo.push(`${c.nome}: ERRO`)
      }
    }
  }

  console.log(`\n${'='.repeat(78)}\nRESUMO FINAL`)
  for (const l of resumo) console.log('  ' + l)
  console.log(`\n${problemas === 0 ? 'SEM PROBLEMAS' : problemas + ' PROBLEMA(S) A RESOLVER'}`)
  process.exit(problemas > 0 ? 1 : 0)
})()
