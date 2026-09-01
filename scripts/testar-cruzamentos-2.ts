/**
 * Segunda ronda de anomalias de cruzamento, sobre classes que a primeira não cobriu.
 *
 * Cada caso tem um "verificar": a conclusão do motor é confrontada com um cálculo directo sobre os
 * dados brutos. Sem isso, um número plausível passa por correcto (aconteceu nesta sessão: um valor
 * foi dado como errado por não bater com o máximo anual, quando era a soma plurianual e estava
 * certo).
 *
 * Uso: DATABASE_URL=... npx tsx scripts/testar-cruzamentos-2.ts [C1]
 */

import { executarPipeline } from '../lib/analysis/pipeline'
import { AnaliseInviavelError } from '../lib/analysis/viabilidade'
import { carregarTabela } from '../lib/analysis/dados'

type Caso = {
  nome: string
  datasets: number[]
  pergunta: string
  risco: string
  verificar?: () => Promise<string>
}

async function somaPorGeografia(id: number, filtroIndicador: RegExp): Promise<string> {
  const t: any = await carregarTabela(id)
  if ('erro' in t) return `nao foi possivel ler o dataset ${id}`
  const iVar = t.colunas.indexOf('variable_name_pt')
  const iGeo = t.colunas.indexOf('geography_name')
  const iVal = t.colunas.indexOf('value')
  const soma: Record<string, number> = {}
  for (const l of t.linhas) {
    if (iVar >= 0 && !filtroIndicador.test(String(l[iVar]))) continue
    const v = Number(l[iVal])
    if (!Number.isFinite(v)) continue
    soma[String(l[iGeo])] = (soma[String(l[iGeo])] || 0) + v
  }
  const ord = Object.entries(soma)
    .filter(([g]) => g.toLowerCase() !== 'nacional')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  return ord.map(([g, v]) => `${g}=${Math.round(v).toLocaleString('pt-PT')}`).join(' | ')
}

const CASOS: Caso[] = [
  {
    nome: 'C1 tres datasets em simultaneo',
    datasets: [67, 68, 29],
    pergunta:
      'Cruzando área cultivada de culturas industriais, acesso à eletricidade e população, que distritos estão em pior situação?',
    risco: 'tres ficheiros com niveis diferentes: o motor so junta dois de cada vez',
  },
  {
    nome: 'C2 desalinhamento temporal',
    datasets: [29, 63],
    pergunta: 'A população de cada província relaciona-se com a produção de milho?',
    risco:
      'populacao e de um censo de 2017 e o milho cobre 2015-2025: somar dez anos contra um ano tem de ser declarado',
    verificar: () => somaPorGeografia(63, /^produção de milho/i),
  },
  {
    nome: 'C3 pontos + pontos',
    datasets: [12, 32],
    pergunta: 'Os distritos com mais escolas são também os que têm mais unidades sanitárias?',
    risco: 'dois ficheiros de pontos: ambos precisam de juncao espacial antes de contar',
  },
  {
    nome: 'C4 dataset sem geografia',
    datasets: [50, 68],
    pergunta: 'Os indicadores de população relacionam-se com o acesso à eletricidade por província?',
    risco: 'um dos ficheiros e um dicionario de dados sem geografia: tem de recusar com clareza',
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
    if (c.verificar) console.log(`VERDADE (dados brutos): ${await c.verificar()}`)

    const t0 = Date.now()
    try {
      const r = await executarPipeline(c.pergunta, c.datasets, () => {})
      const av = r.contexto.avisos
      const falhados = av.filter((a) => /não pôde ser executado/i.test(a))
      const cruz = av.filter((a) => /ficheiros diferentes e foram cruzadas|^Junção /i.test(a))
      console.log(
        `\nRESULTADO (${Math.round((Date.now() - t0) / 1000)}s) calcs=${Object.keys(r.contexto.calcs).length} ` +
          `graficos=${r.contexto.graficos.length} falhados=${falhados.length} cruzamentos=${cruz.length}`
      )
      console.log(`titulo: ${r.narrativa_resolvida.titulo}`)
      console.log(`resposta: ${String(r.narrativa_resolvida.resposta_directa).slice(0, 300)}`)
      for (const f of falhados) console.log(`   x ${f.slice(0, 200)}`)
      for (const x of cruz) console.log(`   > ${x.slice(0, 200)}`)
      const naoDiz = (r.narrativa_resolvida.o_que_nao_diz || []).slice(0, 3)
      if (naoDiz.length) {
        console.log('o que nao diz:')
        for (const n of naoDiz) console.log(`   . ${String(n).slice(0, 200)}`)
      }
    } catch (e: any) {
      if (e instanceof AnaliseInviavelError) {
        console.log(`\n>>> BLOQUEADA: [${e.evidencia.tipo}] ${e.evidencia.explicacao}`)
      } else {
        console.log(`\n>>> ERRO: ${e?.message}`)
      }
    }
  }
  process.exit(0)
})()
