/**
 * Terceira ronda de anomalias de cruzamento.
 *
 * As duas primeiras cobriram niveis diferentes, pontos, formato longo, tres ficheiros e ausencia
 * de geografia. Esta vai atras do que sobra: dominios sem relacao nenhuma (onde uma correlacao
 * forte e quase de certeza espuria), ficheiros com totais nacionais que podem ser contados duas
 * vezes, unidades incomparaveis, e cobertura muito parcial de um dos lados.
 *
 * Uso: DATABASE_URL=... npx tsx scripts/testar-cruzamentos-3.ts [D1]
 */

import { executarPipeline } from '../lib/analysis/pipeline'
import { AnaliseInviavelError } from '../lib/analysis/viabilidade'

type Caso = { nome: string; datasets: number[]; pergunta: string; risco: string; procurar: RegExp }

const CASOS: Caso[] = [
  {
    nome: 'D1 dominios sem relacao plausivel',
    datasets: [58, 55],
    pergunta: 'As províncias com mais chegadas de turistas têm mais casos de tuberculose?',
    risco: 'correlacao espuria: se der forte, a analise tem de avisar que nao ha causalidade',
    // Aceita tambem a recusa: quando o turismo so existe a nivel nacional, nao ha correlacao
    // nenhuma para ressalvar, e explicar isso e a resposta certa. A assercao original so procurava
    // avisos de causalidade e dava falso alarme neste caso.
    procurar: /causa|espúri|confund|coincid|não implica|nacional|não dá para|não é possível/i,
  },
  {
    nome: 'D2 total nacional a contaminar o cruzamento',
    datasets: [55, 63],
    pergunta: 'Qual província tem mais casos de tuberculose por tonelada de cereais produzida?',
    risco: 'ambos tem linha "Nacional": se entrar como unidade, duplica o total do pais',
    procurar: /nacional/i,
  },
  {
    nome: 'D3 unidades incomparaveis',
    datasets: [67, 63],
    pergunta: 'Os distritos com mais hectares de culturas industriais produzem mais toneladas de cereais?',
    risco: 'hectares contra toneladas em niveis diferentes: nao pode somar nem dividir sem declarar',
    procurar: /hectare|tonelada|unidade|nível|provinc/i,
  },
  {
    nome: 'D4 cobertura muito parcial de um dos lados',
    datasets: [67, 29],
    pergunta: 'A área cultivada de sisal por distrito acompanha a população distrital?',
    risco: 'sisal quase so tem valores em falta: cruzar sobre 3 distritos nao sustenta conclusao',
    procurar: /distritos|falta|parcial|poucos|cobertura/i,
  },
]

const filtro = process.argv[2]
const casos = filtro ? CASOS.filter((c) => c.nome.startsWith(filtro)) : CASOS

;(async () => {
  const resumo: string[] = []
  for (let i = 0; i < casos.length; i++) {
    const c = casos[i]
    console.log(`\n${'='.repeat(78)}`)
    console.log(`${c.nome} | datasets ${c.datasets.join(' + ')}`)
    console.log(`pergunta: ${c.pergunta}`)
    console.log(`risco: ${c.risco}`)
    const t0 = Date.now()
    try {
      const r = await executarPipeline(c.pergunta, c.datasets, () => {})
      const av = r.contexto.avisos
      const falhados = av.filter((a) => /não pôde ser executado/i.test(a))
      const cruz = av.filter((a) => /ficheiros diferentes e foram cruzadas|^Junção /i.test(a))
      const repl = av.filter((a) => /repetidos em cada linha/i.test(a))
      const naoDiz = (r.narrativa_resolvida.o_que_nao_diz || []).map(String)
      const textoTodo = [r.narrativa_resolvida.titulo, r.narrativa_resolvida.resposta_directa, ...naoDiz].join(' ')
      const declarou = c.procurar.test(textoTodo)

      console.log(
        `\nRESULTADO (${Math.round((Date.now() - t0) / 1000)}s) calcs=${Object.keys(r.contexto.calcs).length} ` +
          `graficos=${r.contexto.graficos.length} falhados=${falhados.length} cruzamentos=${cruz.length} replicacao=${repl.length}`
      )
      console.log(`titulo: ${r.narrativa_resolvida.titulo}`)
      console.log(`resposta: ${String(r.narrativa_resolvida.resposta_directa).slice(0, 300)}`)
      for (const f of falhados) console.log(`   x ${f.slice(0, 500)}`)
      for (const x of [...cruz, ...repl]) console.log(`   > ${x.slice(0, 200)}`)
      console.log(`declarou o risco no texto: ${declarou ? 'SIM' : 'NAO <<< VERIFICAR'}`)
      for (const n of naoDiz.slice(0, 3)) console.log(`   . ${n.slice(0, 190)}`)
      resumo.push(`${c.nome}: falhados=${falhados.length} declarou=${declarou ? 'sim' : 'NAO'}`)
    } catch (e: any) {
      if (e instanceof AnaliseInviavelError) {
        console.log(`\n>>> BLOQUEADA: [${e.evidencia.tipo}] ${e.evidencia.explicacao}`)
        resumo.push(`${c.nome}: bloqueada`)
      } else {
        console.log(`\n>>> ERRO: ${e?.message}`)
        resumo.push(`${c.nome}: ERRO`)
      }
    }
  }
  console.log(`\n${'='.repeat(78)}\nRESUMO`)
  for (const l of resumo) console.log('  ' + l)
  process.exit(0)
})()
