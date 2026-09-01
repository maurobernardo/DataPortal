/**
 * Corre TODAS as sugestões de uma selecção de datasets através do motor completo.
 *
 * A validação estrutural garante que as colunas e o método existem, o que impede a sugestão de
 * falhar por falta de dados. Não garante que a análise resultante preste, nem, o que seria pior,
 * impede que o portão de viabilidade recuse uma pergunta que o próprio motor acabou de propor.
 * Esse caso seria o motor a contradizer-se em frente ao utilizador, e é o que este script procura.
 *
 * Uso: DATABASE_URL=... ANALISE_PORTAO=activo npx tsx scripts/testar-sugestoes-ponta-a-ponta.ts 30
 */

import { gerarPerguntasViaveis } from '../lib/analysis/perguntas-viaveis'
import { executarPipeline } from '../lib/analysis/pipeline'
import { AnaliseInviavelError } from '../lib/analysis/viabilidade'

const datasetIds = (process.argv[2] || '30').split(',').map((n) => Number.parseInt(n, 10))
const limite = Number.parseInt(process.argv[3] || '3', 10)

;(async () => {
  const sugestoes = (await gerarPerguntasViaveis(datasetIds)).slice(0, limite)
  console.log(`${sugestoes.length} sugestoes a testar sobre os datasets ${datasetIds.join(',')}\n`)

  let bloqueadas = 0
  let falhadas = 0

  for (let i = 0; i < sugestoes.length; i++) {
    const s = sugestoes[i]
    const t0 = Date.now()
    process.stdout.write(`${i + 1}. "${s.pergunta}"\n`)
    try {
      const r = await executarPipeline(s.pergunta, s.dataset_ids, () => {})
      const nCalcs = Object.keys(r.contexto.calcs).length
      const nGraficos = r.contexto.graficos.length
      const titulo = r.narrativa_resolvida.titulo
      const avisos = r.contexto.avisos.length
      console.log(
        `   OK (${Math.round((Date.now() - t0) / 1000)}s) calcs=${nCalcs} graficos=${nGraficos} avisos=${avisos}`
      )
      console.log(`   titulo: ${titulo}`)
      if (nCalcs === 0) falhadas++
    } catch (erro: any) {
      if (erro instanceof AnaliseInviavelError) {
        bloqueadas++
        console.log(`   >>> CONTRADICAO: o portao bloqueou uma pergunta sugerida pelo proprio motor`)
        console.log(`   motivo: [${erro.evidencia.tipo}] ${erro.evidencia.explicacao}`)
      } else {
        falhadas++
        console.log(`   >>> ERRO: ${erro?.message}`)
      }
    }
    console.log('')
  }

  console.log(`Resumo: ${sugestoes.length - bloqueadas - falhadas}/${sugestoes.length} boas`)
  console.log(`  bloqueadas pelo portao (contradicao): ${bloqueadas}`)
  console.log(`  falhadas por erro/sem calculos: ${falhadas}`)
  process.exit(bloqueadas + falhadas > 0 ? 1 : 0)
})()
