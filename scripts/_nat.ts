import { executarPipeline } from '../lib/analysis/pipeline'
const P = 'Existe relação entre a percentagem de mulheres testadas para HIV e a prevalência do HIV?'
;(async () => {
  const r = await executarPipeline(P, [51], () => {})
  const n = r.narrativa_resolvida
  const tecnico = /\b(p\s*[=<>]|r\s*=|R²|Pearson|Spearman|Mann-Kendall|estatisticamente significativ|coeficiente de correla)/i
  const campos: [string, string][] = [
    ['titulo', n.titulo], ['subtitulo', n.subtitulo], ['resposta', n.resposta_directa],
    ['o_que_mostram', String(n.o_que_mostram).slice(0, 400)],
  ]
  for (const [k, v] of campos) console.log(`${k}: ${v}\n`)
  const restos = campos.filter(([, v]) => tecnico.test(v)).map(([k]) => k)
  console.log('campos ainda com jargao:', restos.length ? restos.join(', ') : 'nenhum')
  process.exit(0)
})()
