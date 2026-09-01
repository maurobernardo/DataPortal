import { executarPipeline } from '../lib/analysis/pipeline'
import { AnaliseInviavelError } from '../lib/analysis/viabilidade'
import { gerarPerguntasViaveis } from '../lib/analysis/perguntas-viaveis'
const P1 = 'Como evoluiu a produção de milho, arroz, mapira e mexoeira em cada província entre 2015 e 2024?'
async function correr(p: string, etiqueta: string): Promise<string[]> {
  console.log(`\n=== ${etiqueta}: "${p}"`)
  try {
    const r = await executarPipeline(p, [63], () => {})
    console.log('  PUBLICOU | ' + r.narrativa_resolvida.titulo.slice(0, 130))
    return []
  } catch (e: any) {
    if (!(e instanceof AnaliseInviavelError)) { console.log('  ERRO: ' + e?.message?.slice(0,150)); return [] }
    console.log('  BLOQUEOU [' + e.evidencia.tipo + ']')
    const s = await gerarPerguntasViaveis([63], undefined, p)
    console.log(`  ${s.length} sugestoes:`)
    for (const x of s) console.log('    - ' + x.pergunta)
    const repetida = s.some((x) => x.pergunta.trim().toLowerCase() === p.trim().toLowerCase())
    console.log(`  reoferece a pergunta bloqueada? ${repetida ? 'SIM <<< DEFEITO' : 'nao'}`)
    return s.map((x) => x.pergunta)
  }
}
;(async () => {
  const sug1 = await correr(P1, 'PASSO 1 pergunta original')
  if (sug1.length > 0) {
    const sug2 = await correr(sug1[0], 'PASSO 2 clicou na 1a sugestao')
    if (sug2.length > 0) console.log(`\n  a 1a sugestao do passo 2 e: "${sug2[0]}"`)
  }
  process.exit(0)
})()
