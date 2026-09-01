/**
 * Bateria sobre a detecção de pseudo-replicação.
 *
 * Um atributo da unidade administrativa (ex.: "acesso à electricidade da província") vem repetido
 * em cada linha do ficheiro. Correlacionar duas colunas dessas linha a linha usa 411 observações
 * quando as independentes são 11, e devolve "p = 0" onde a amostra real daria 0,02. Detectar isto
 * é distinguir uma coluna que varia dentro da unidade (observações a sério) de uma que não varia
 * (o mesmo valor copiado).
 *
 * Não toca no modelo nem na base de dados: monta tabelas com repetição conhecida e confirma a
 * decisão em cada forma que os dados reais tomam.
 *
 * Uso: npx tsx scripts/testar-pseudo-replicacao.ts
 */

import { atributoPorUnidade } from '../lib/analysis/executor'
import type { Tabela, ResultadoLigacao } from '../lib/analysis/dados'

function montar(colunas: string[], linhas: (string | number)[][], codigos: string[]) {
  const tabela: Tabela = {
    dataset_id: 1,
    titulo: 'teste',
    colunas,
    linhas: linhas.map((l) => l.map((v) => String(v))),
    n_linhas: linhas.length,
    truncado: false,
  } as Tabela
  const ligacao: ResultadoLigacao = {
    nivel: 'admin1',
    coluna_usada: 'prov',
    ligacoes: new Map(codigos.map((c, i) => [i, c])),
    taxa_correspondencia: 1,
    nao_correspondidos: [],
    metodo: 'nome_exacto',
  }
  return { tabela, ligacao }
}

type Caso = {
  nome: string
  colunas: string[]
  linhas: (string | number)[][]
  codigos: string[]
  coluna: string
  /** null = varia dentro da unidade (não colapsar); número = quantas unidades distintas. */
  esperado: number | null
}

const CASOS: Caso[] = [
  {
    nome: 'atributo da provincia repetido em todas as linhas: colapsa para 2',
    colunas: ['posto', 'acesso'],
    linhas: [['a', 30], ['b', 30], ['c', 30], ['d', 70], ['e', 70]],
    codigos: ['01', '01', '01', '02', '02'],
    coluna: 'acesso',
    esperado: 2,
  },
  {
    nome: 'coluna que varia dentro da provincia: nao colapsa',
    colunas: ['posto', 'populacao'],
    linhas: [['a', 100], ['b', 250], ['c', 90], ['d', 400], ['e', 380]],
    codigos: ['01', '01', '01', '02', '02'],
    coluna: 'populacao',
    esperado: null,
  },
  {
    nome: 'uma unica linha por unidade: ja esta ao nivel certo',
    colunas: ['prov', 'valor'],
    linhas: [['A', 10], ['B', 20], ['C', 30]],
    codigos: ['01', '02', '03'],
    coluna: 'valor',
    esperado: 3,
  },
  {
    nome: 'constante em todo o pais: continua a ser atributo por unidade',
    colunas: ['posto', 'taxa'],
    linhas: [['a', 5], ['b', 5], ['c', 5], ['d', 5]],
    codigos: ['01', '01', '02', '02'],
    coluna: 'taxa',
    esperado: 2,
  },
  {
    nome: 'varia so numa das unidades: basta isso para nao colapsar',
    colunas: ['posto', 'valor'],
    linhas: [['a', 30], ['b', 30], ['c', 70], ['d', 71]],
    codigos: ['01', '01', '02', '02'],
    coluna: 'valor',
    esperado: null,
  },
  {
    nome: 'valores em falta ignorados, resto constante: colapsa',
    colunas: ['posto', 'valor'],
    linhas: [['a', 30], ['b', ''], ['c', 30], ['d', 70], ['e', '']],
    codigos: ['01', '01', '01', '02', '02'],
    coluna: 'valor',
    esperado: 2,
  },
  {
    nome: 'coluna de texto: nao ha numeros para colapsar',
    colunas: ['posto', 'nome'],
    linhas: [['a', 'Norte'], ['b', 'Norte'], ['c', 'Sul']],
    codigos: ['01', '01', '02'],
    coluna: 'nome',
    esperado: null,
  },
  {
    nome: 'coluna inexistente: nao decide nada',
    colunas: ['posto', 'valor'],
    linhas: [['a', 1], ['b', 1]],
    codigos: ['01', '01'],
    coluna: 'inexistente',
    esperado: null,
  },
  {
    nome: 'linhas sem ligacao geografica ficam de fora da contagem',
    colunas: ['posto', 'valor'],
    linhas: [['a', 30], ['b', 30], ['c', 70], ['d', 999]],
    codigos: ['01', '01', '02'],
    coluna: 'valor',
    esperado: 2,
  },
  {
    nome: 'mesmo numero escrito de formas diferentes conta como igual',
    colunas: ['posto', 'valor'],
    linhas: [['a', '30'], ['b', '30.0'], ['c', 70]],
    codigos: ['01', '01', '02'],
    coluna: 'valor',
    esperado: 2,
  },
  {
    nome: 'muitas linhas por unidade (caso real: 400 postos, 11 provincias)',
    colunas: ['posto', 'acesso'],
    linhas: Array.from({ length: 400 }, (_, i) => [`p${i}`, (i % 11) * 7]),
    codigos: Array.from({ length: 400 }, (_, i) => String(i % 11).padStart(2, '0')),
    coluna: 'acesso',
    esperado: 11,
  },
]

let falhas = 0
for (const c of CASOS) {
  const { tabela, ligacao } = montar(c.colunas, c.linhas, c.codigos)
  const r = atributoPorUnidade(tabela, ligacao, c.coluna)
  const obtido = r ? r.size : null
  const ok = obtido === c.esperado
  if (!ok) falhas++
  const desc = obtido === null ? 'nao colapsa' : `colapsa para ${obtido} unidades`
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${c.nome}\n      -> ${desc}`)
}

console.log(`\n${CASOS.length - falhas}/${CASOS.length} casos correctos`)
if (falhas > 0) process.exit(1)
