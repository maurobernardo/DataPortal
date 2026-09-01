import { executarPipeline } from '../lib/analysis/pipeline'
import { AnaliseInviavelError } from '../lib/analysis/viabilidade'
import { gerarPerguntasViaveis } from '../lib/analysis/perguntas-viaveis'
const P = 'Como evoluiu a produção de milho, arroz, mapira e mexoeira em cada província entre 2015 e 2024?'
;(async () => {
  try {
    const r = await executarPipeline(P, [63], () => {})
    console.log('PUBLICOU (esperava bloqueio) calcs=' + Object.keys(r.contexto.calcs).length)
    console.log('titulo:', r.narrativa_resolvida.titulo)
  } catch (e: any) {
    if (e instanceof AnaliseInviavelError) {
      console.log('BLOQUEOU [' + e.evidencia.tipo + ']')
      console.log('  exigido:    ' + e.evidencia.exigido)
      console.log('  disponivel: ' + e.evidencia.disponivel)
      console.log('  explicacao: ' + e.evidencia.explicacao)
      const s = await gerarPerguntasViaveis([63], undefined, P)
      console.log(`\n  ${s.length} sugestoes:`)
      for (const x of s) console.log('   - ' + x.pergunta)
    } else console.log('ERRO: ' + e?.message)
  }
  process.exit(0)
})()
