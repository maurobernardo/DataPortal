import { executarPipeline } from '../lib/analysis/pipeline'
;(async () => {
  const r = await executarPipeline('Existe relação entre a percentagem de mulheres testadas para HIV e a prevalência do HIV?', [51], () => {})
  const n = r.narrativa_resolvida
  console.log('titulo:', n.titulo)
  console.log('\nresposta:', String(n.resposta_directa).slice(0, 420))
  const pcts = Object.values(r.contexto.calcs).filter((c: any) => c.formato === 'percentagem').length
  console.log(`\ncalcs marcados como percentagem: ${pcts} de ${Object.keys(r.contexto.calcs).length}`)
  const semSimbolo = /\b\d{1,2},\d\b(?!%)/.test(n.titulo)
  console.log('titulo com numero decimal sem %:', semSimbolo ? 'SIM <<< VERIFICAR' : 'nao')
  process.exit(0)
})()
