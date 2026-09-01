/**
 * Bateria de cruzamentos entre datasets.
 *
 * Cruzar dois ficheiros é a análise mais valiosa do portal e a que tem mais formas de correr mal:
 * níveis geográficos diferentes, pontos contra polígonos, e sobretudo o formato longo (uma coluna
 * "value" que guarda dezenas de indicadores distintos, onde juntar sem filtrar mistura produção de
 * milho com casos de tuberculose). Cada caso aqui exercita uma dessas situações.
 *
 * Uso: DATABASE_URL=... npx tsx scripts/testar-cruzamentos.ts [numero-do-caso]
 */

import { executarPipeline } from '../lib/analysis/pipeline'
import { AnaliseInviavelError } from '../lib/analysis/viabilidade'

type Caso = { nome: string; datasets: number[]; pergunta: string; risco: string }

const CASOS: Caso[] = [
  {
    nome: 'T1 pontos + alfanumerico',
    datasets: [12, 68],
    pergunta:
      'Os distritos com mais unidades sanitárias são também os que têm melhor acesso à eletricidade?',
    risco: 'dataset de pontos (lat/long) tem de ser localizado por distrito antes de cruzar',
  },
  {
    nome: 'T2 geo + geo, mesmo nivel',
    datasets: [67, 29],
    pergunta: 'Os distritos com maior área cultivada de tabaco são também os mais populosos?',
    risco: 'dois ficheiros distritais: nao deve haver perda de granularidade',
  },
  {
    nome: 'T3 formato longo + formato largo',
    datasets: [63, 68],
    pergunta:
      'As províncias que mais produzem milho são também as que têm melhor acesso à eletricidade?',
    risco: 'o valor do milho vive numa coluna "value" partilhada com outros cereais: tem de filtrar',
  },
  {
    nome: 'T4 formato longo + formato longo',
    datasets: [63, 55],
    pergunta:
      'As províncias com maior produção de milho são também as que registam mais casos de tuberculose?',
    risco: 'ambos usam "value" para indicadores diferentes: risco alto de somar coisas distintas',
  },
  {
    nome: 'T5 niveis diferentes (provincia + distrito)',
    datasets: [30, 67],
    pergunta: 'As províncias mais populosas são as que têm maior área cultivada de cana-de-açúcar?',
    risco: 'um so tem provincia: o cruzamento tem de subir a provincia, nunca descer a distrito',
  },
]

const filtro = process.argv[2]
const casos = filtro ? CASOS.filter((c) => c.nome.startsWith(filtro)) : CASOS

;(async () => {
  for (let i = 0; i < casos.length; i++) {
    const c = casos[i]
    console.log(`\n${'='.repeat(78)}`)
    console.log(`${c.nome} | datasets ${c.datasets.join(' + ')}`)
    console.log(`pergunta: ${c.pergunta}`)
    console.log(`risco: ${c.risco}`)
    const t0 = Date.now()
    try {
      const r = await executarPipeline(c.pergunta, c.datasets, () => {})
      const avisos = r.contexto.avisos
      const falhados = avisos.filter((a) => /não pôde ser executado/i.test(a))
      const cruzImplicito = avisos.filter((a) => /ficheiros diferentes e foram cruzadas/i.test(a))
      const juncoes = avisos.filter((a) => /^Junção /i.test(a))

      console.log(
        `\nRESULTADO (${Math.round((Date.now() - t0) / 1000)}s): calcs=${Object.keys(r.contexto.calcs).length} ` +
          `graficos=${r.contexto.graficos.length} series=${r.contexto.series.length}`
      )
      console.log(`titulo: ${r.narrativa_resolvida.titulo}`)
      console.log(`resposta: ${String(r.narrativa_resolvida.resposta_directa).slice(0, 320)}`)
      console.log(`passos falhados: ${falhados.length}`)
      for (const f of falhados) console.log(`   x ${f.slice(0, 260)}`)
      console.log(`juncoes explicitas: ${juncoes.length} | cruzamentos implicitos: ${cruzImplicito.length}`)
      for (const j of [...juncoes, ...cruzImplicito]) console.log(`   > ${j.slice(0, 260)}`)
      const outros = avisos.filter(
        (a) => !falhados.includes(a) && !cruzImplicito.includes(a) && !juncoes.includes(a)
      )
      if (outros.length) {
        console.log(`outros avisos: ${outros.length}`)
        for (const o of outros.slice(0, 4)) console.log(`   . ${o.slice(0, 200)}`)
      }
    } catch (e: any) {
      if (e instanceof AnaliseInviavelError) {
        console.log(`\n>>> BLOQUEADA pelo portao: [${e.evidencia.tipo}] ${e.evidencia.explicacao}`)
      } else {
        console.log(`\n>>> ERRO: ${e?.message}`)
      }
    }
  }
  process.exit(0)
})()
