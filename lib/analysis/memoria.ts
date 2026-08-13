import { db } from '@/lib/db'
import type { Plano } from './types'

/**
 * Memória entre análises (PLANO-INTELIGENCIA-PRO-MAX.md, Fase 4).
 *
 * O plano fala em "cache semântico por embedding", mas este portal não tem nenhum fornecedor de
 * embeddings integrado (nem chave, nem vendor) — introduzir um só para isto seria desproporcional
 * à Fase 4. Em vez disso, similaridade léxica sobre palavras-chave normalizadas em português: mais
 * simples, sem custo extra por chamada, sem nova dependência externa, e resolve o mesmo problema
 * prático (perguntas parecidas sobre os mesmos datasets reaproveitam um plano já testado) só que
 * por sobreposição de vocabulário em vez de proximidade vectorial.
 *
 * Não copia cegamente: o plano encontrado entra no prompt do Planeamento como exemplo few-shot,
 * o modelo continua a decidir se se aplica tal e qual à pergunta actual.
 */

const PARAGENS_PT = new Set([
  'a', 'as', 'o', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no',
  'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'sobre', 'entre', 'e', 'ou', 'que', 'qual',
  'quais', 'quantos', 'quantas', 'como', 'quando', 'onde', 'é', 'foi', 'foram', 'ser', 'estar',
  'tem', 'têm', 'ha', 'há', 'se', 'ao', 'aos', 'à', 'às', 'este', 'esta', 'esse', 'essa', 'isso',
  'isto', 'seu', 'sua', 'seus', 'suas', 'mais', 'menos', 'muito', 'muita', 'todo', 'toda', 'todos',
  'todas', 'me', 'lhe', 'nas', 'num', 'numa', 'pelo', 'pela', 'pelos', 'pelas',
])

function semAcentos(texto: string): string {
  return texto.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
}

/** Tokeniza e remove parágens: usado tanto para indexar como para comparar. */
export function palavrasChave(pergunta: string): string[] {
  const tokens = semAcentos(pergunta.toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !PARAGENS_PT.has(t))
  return Array.from(new Set(tokens)).sort()
}

function similaridadeJaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  let interseccao = 0
  setA.forEach((t) => { if (setB.has(t)) interseccao++ })
  const uniao = setA.size + setB.size - interseccao
  return uniao === 0 ? 0 : interseccao / uniao
}

/** Abaixo disto a sobreposição de vocabulário é demasiado fraca para ser um bom exemplo few-shot. */
const LIMIAR_SIMILARIDADE = 0.35

function mesmosDatasets(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((id) => setB.has(id))
}

export type PlanoSemelhante = {
  pergunta: string
  plano: Plano
  arquetipo: string | null
  similaridade: number
}

/**
 * Procura, entre análises já resolvidas com sucesso sobre exactamente os mesmos datasets, a
 * pergunta mais parecida por vocabulário. Só compara candidatos com a mesma selecção de datasets
 * (não datasets sobrepostos): um plano pensado para outra combinação de dados não é directamente
 * reaproveitável (colunas diferentes, ligação geográfica diferente).
 */
export async function procurarPlanoSemelhante(
  pergunta: string,
  datasetIds: number[]
): Promise<PlanoSemelhante | null> {
  const chaveActual = palavrasChave(pergunta)
  if (chaveActual.length === 0) return null

  // Filtragem por dataset feita em memória (não em SQL): o número de planos guardados por
  // combinação de datasets é pequeno, e comparar JSON como conjuntos em MariaDB/MySQL de forma
  // portátil exigiria mais complexidade do que vale a pena aqui.
  const [rows] = (await db.execute(
    `SELECT pergunta, palavras_chave, datasets_ids, arquetipo, plano
     FROM analise_planos_cache
     ORDER BY criado_em DESC
     LIMIT 300`
  )) as [any[], unknown]

  let melhor: PlanoSemelhante | null = null
  for (const r of rows) {
    const idsGuardados: number[] = typeof r.datasets_ids === 'string' ? JSON.parse(r.datasets_ids) : r.datasets_ids
    if (!mesmosDatasets(datasetIds, idsGuardados)) continue

    const chaveGuardada: string[] =
      typeof r.palavras_chave === 'string' ? JSON.parse(r.palavras_chave) : r.palavras_chave
    const sim = similaridadeJaccard(chaveActual, chaveGuardada)
    if (sim >= LIMIAR_SIMILARIDADE && (!melhor || sim > melhor.similaridade)) {
      melhor = {
        pergunta: r.pergunta,
        plano: typeof r.plano === 'string' ? JSON.parse(r.plano) : r.plano,
        arquetipo: r.arquetipo,
        similaridade: sim,
      }
    }
  }
  return melhor
}

/** Formata o plano encontrado como bloco few-shot para o prompt de Planeamento. */
export function formatarExemploFewShot(exemplo: PlanoSemelhante): string {
  const passos = exemplo.plano.passos
    .map((p) => `  - ${p.id} (${p.metodo}): ${p.descricao_humana}`)
    .join('\n')
  return (
    `\n\n---\nUma pergunta parecida já foi respondida com sucesso sobre exactamente estes mesmos ` +
    `datasets (similaridade léxica ${(exemplo.similaridade * 100).toFixed(0)}%):\n` +
    `"${exemplo.pergunta}"\n\n` +
    `Plano usado (arquétipo: ${exemplo.arquetipo ?? 'desconhecido'}):\n${passos}\n\n` +
    `Usa isto como ponto de partida se a estrutura se aplicar à pergunta actual — adapta métricas, ` +
    `filtros e nível geográfico ao que foi realmente pedido agora. Não copies passos que não fazem ` +
    `sentido para esta pergunta.`
  )
}

export type AnaliseAnteriorSemelhante = {
  id: string
  pergunta: string
  criadoEm: string
  numerosChave: { rotulo: string; valor: string }[]
  similaridade: number
}

/**
 * Para "desde a última vez que perguntaste algo parecido" na página de detalhe: procura, entre as
 * análises já resolvidas do próprio utilizador sobre exactamente os mesmos datasets, a pergunta
 * mais parecida por vocabulário. Mostra os números lado a lado (antes/agora); não calcula a
 * diferença aqui — os valores já vêm formatados com unidade própria (ex.: "111 por 1 000 km²"),
 * e subtrair strings formatadas é como se inventaria um número sem o R1 por trás.
 */
export async function procurarAnaliseAnteriorSemelhante(
  utilizadorId: number,
  datasetIds: number[],
  pergunta: string,
  excluirId: string
): Promise<AnaliseAnteriorSemelhante | null> {
  const chaveActual = palavrasChave(pergunta)
  if (chaveActual.length === 0) return null

  const [rows] = (await db.execute(
    `SELECT id, pergunta, datasets_ids, narrativa, criado_em
     FROM analises
     WHERE utilizador_id = ? AND estado = 'pronto' AND id != ?
     ORDER BY criado_em DESC
     LIMIT 100`,
    [utilizadorId, excluirId]
  )) as [any[], unknown]

  let melhor: AnaliseAnteriorSemelhante | null = null
  for (const r of rows) {
    const idsGuardados: number[] = typeof r.datasets_ids === 'string' ? JSON.parse(r.datasets_ids) : r.datasets_ids
    if (!mesmosDatasets(datasetIds, idsGuardados)) continue

    const sim = similaridadeJaccard(chaveActual, palavrasChave(r.pergunta))
    if (sim < LIMIAR_SIMILARIDADE || (melhor && sim <= melhor.similaridade)) continue

    const narrativa = typeof r.narrativa === 'string' ? JSON.parse(r.narrativa) : r.narrativa
    const numerosChave = narrativa?.resolvida?.numeros_chave || []
    if (numerosChave.length === 0) continue

    melhor = { id: r.id, pergunta: r.pergunta, criadoEm: r.criado_em, numerosChave, similaridade: sim }
  }
  return melhor
}

/** Guardado só depois de a análise passar pela Crítica sem objecção FATAL (plano confiável). */
export async function guardarPlanoResolvido(
  pergunta: string,
  datasetIds: number[],
  arquetipo: string | null,
  plano: Plano
): Promise<void> {
  const chave = palavrasChave(pergunta)
  if (chave.length === 0) return
  await db.execute(
    `INSERT INTO analise_planos_cache (pergunta, palavras_chave, datasets_ids, arquetipo, plano)
     VALUES (?, ?, ?, ?, ?)`,
    [pergunta.slice(0, 500), JSON.stringify(chave), JSON.stringify(datasetIds), arquetipo, JSON.stringify(plano)]
  )
}
