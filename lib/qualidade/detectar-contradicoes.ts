import { db } from '@/lib/db'
import {
  agregarPorUnidade,
  carregarTabela,
  colunaValores,
  detectarColunaGeografica,
  type Tabela,
} from '@/lib/analysis/dados'
import { paraNumero } from '@/lib/analysis/library/numeric'
import { compararValores, mesmaGeografia, normalizarTexto, TOLERANCIA_PADRAO } from '@/lib/relatorios/verificar-afirmacao'
import {
  guardarResultadosDoPar,
  ultimaVerificacaoPorPar,
  type RegistoContradicao,
} from './persistencia'
import { logger } from '@/lib/logger'

/**
 * Detecção automática de contradições entre dois datasets alfanuméricos do catálogo, sem nenhum
 * pedido de ninguém: uma tarefa periódica varre pares de datasets da mesma categoria e verifica se
 * as suas séries numéricas, para a mesma geografia e o mesmo período, batem certo.
 *
 * A peça que decide "isto é comparável" (`verificar-afirmacao.ts`) já existe e está testada — foi
 * feita para comparar a afirmação de um relatório contra um dataset do portal. Aqui reaproveita-se
 * inteira: só muda de onde vêm os dois lados da comparação (dois datasets, em vez de uma afirmação
 * e um dataset).
 *
 * De propósito, SEM IA nesta primeira versão: encontrar que duas colunas com nomes parecidos são a
 * mesma métrica é feito por comparação de texto normalizado, não por um modelo. Isto é o passo mais
 * arriscado de todo o mecanismo — dois datasets que medem coisas ligeiramente diferentes mas com
 * nomes parecidos ("população" vs "população activa") produziriam uma "contradição" falsa, que
 * custa mais confiança do que a funcionalidade vale. Manter este passo determinístico e
 * conservador (exige sobreposição forte de palavras do cabeçalho) é a escolha certa: perder um par
 * comparável de verdade custa pouco (fica por comparar); inventar uma contradição que não existe
 * custa a confiança no selo inteiro.
 */

const MAX_COLUNAS_POR_TABELA = 12
const MIN_LINHAS_COMPARAVEIS = 3

/** Sinónimos curtos e literais — nunca inferidos, só os que a equipa confirmou que significam a
 *  mesma coisa em datasets reais do portal. Continua conservador de propósito. */
const GRUPOS_SINONIMOS: string[][] = [
  ['populacao', 'população', 'habitantes', 'pop total', 'pop_total', 'numero de habitantes'],
  ['area', 'área', 'area km2', 'superficie', 'superfície'],
  ['casos', 'numero de casos', 'total de casos', 'nr casos'],
  ['producao', 'produção', 'volume de producao', 'volume produzido'],
]

function grupoSinonimo(texto: string): number | null {
  const n = normalizarTexto(texto)
  const i = GRUPOS_SINONIMOS.findIndex((g) => g.some((s) => normalizarTexto(s) === n))
  return i === -1 ? null : i
}

/** Nomes de coluna genéricos de mais para significarem "a mesma métrica" só por bater
 *  letra-a-letra — "value"/"valor"/"total" são o nome da coluna de valor em incontáveis datasets
 *  em formato longo, cada um medindo uma coisa completamente diferente (o que cada linha mede
 *  está noutra coluna, "colunaIndicador", que este detector ainda não cruza). Apanhado ao vivo:
 *  duas colunas chamadas "value" em datasets sobre assuntos sem nada em comum, comparadas como se
 *  fossem a mesma coisa, com valores em escalas completamente diferentes (milhões vs centenas).
 *  Continuam a poder corresponder pelos grupos de sinónimos ou pela sobreposição de palavras
 *  abaixo — só a igualdade exacta de um nome genérico SOZINHO é que deixa de bastar. */
const NOMES_GENERICOS_DEMAIS = new Set([
  'value', 'valor', 'total', 'totais', 'quantidade', 'qtd', 'montante', 'numero', 'número',
  'count', 'amount', 'dado', 'dados', 'indicador', 'registo', 'registos', 'medida', 'resultado',
])

/**
 * Duas colunas de datasets diferentes são "a mesma métrica": mesmo texto normalizado (excepto
 * nomes genéricos de mais, ver acima), mesmo grupo de sinónimo conhecido, ou sobreposição de pelo
 * menos 70% das palavras (evita exigir uma correspondência perfeita como "Produção de milho
 * (toneladas)" vs "Produção milho, toneladas", mas continua a recusar pares que só partilham uma
 * palavra genérica como "total").
 */
export function colunasSemelhantes(a: string, b: string): boolean {
  const na = normalizarTexto(a)
  const nb = normalizarTexto(b)
  if (!na || !nb) return false
  if (na === nb && !NOMES_GENERICOS_DEMAIS.has(na)) return true
  const ga = grupoSinonimo(a)
  const gb = grupoSinonimo(b)
  if (ga !== null && ga === gb) return true
  const setA = new Set(na.split(/[\s_(),/-]+/).filter((p) => p.length > 2 && !NOMES_GENERICOS_DEMAIS.has(p)))
  const setB = new Set(nb.split(/[\s_(),/-]+/).filter((p) => p.length > 2 && !NOMES_GENERICOS_DEMAIS.has(p)))
  if (setA.size === 0 || setB.size === 0) return false
  const comuns = Array.from(setA).filter((p) => setB.has(p)).length
  const uniao = new Set([...Array.from(setA), ...Array.from(setB)]).size
  return comuns / uniao >= 0.7
}

/** Nomes que NUNCA são uma métrica a comparar, mesmo lendo-se como número: identificadores de linha
 *  (sobram de exportações GeoJSON/shapefile — "layer_no", "fid", "objectid", "gid") e colunas de
 *  ano/período (uma dimensão que organiza os dados, não um valor medido). Comparar "year" entre dois
 *  datasets como se fosse uma métrica foi um erro apanhado ao vivo: dava "diferenças" sem sentido
 *  nenhum, porque um ano não é um facto que possa "divergir" de outro dataset. Correspondência
 *  exacta de propósito (nunca por substring — "Produção anual" não pode cair aqui só por conter
 *  "anual"). */
const NOMES_NUNCA_METRICA = new Set([
  'id', 'fid', 'gid', 'objectid', 'object_id', 'layer_no', 'layerno', 'index', 'indice',
  'no', 'num', 'numero', 'número', 'n', 'codigo', 'código', 'cod',
  'ano', 'ano_referencia', 'year', 'anos',
])

/** Uma coluna cujos valores são, no essencial, uma sequência 1..n (ou 0..n-1): quase sempre um
 *  índice de linha, nunca um facto medido, mesmo quando o nome da coluna não é óbvio. */
function pareceIndiceSequencial(valores: number[]): boolean {
  if (valores.length < MIN_LINHAS_COMPARAVEIS) return false
  const inteiros = valores.filter((v) => Number.isInteger(v))
  if (inteiros.length / valores.length < 0.95) return false
  const distintos = new Set(inteiros)
  if (distintos.size < inteiros.length * 0.95) return false
  const ord = Array.from(distintos).sort((a, b) => a - b)
  const amplitude = ord[ord.length - 1] - ord[0]
  // Amplitude perto do número de valores distintos = quase sem saltos = sequência, não dados reais
  // (uma métrica genuína, mesmo inteira, salta muito mais entre linhas do que 1 em 1).
  return amplitude <= distintos.size * 1.2
}

/** Uma coluna cujos valores são, no essencial, todos anos plausíveis (1990 até daqui a 2 anos):
 *  mesmo sem se chamar "ano" ou "year", é uma dimensão que organiza os dados, não um facto medido.
 *  Partilhada com detectar-anomalias.ts (a mesma pergunta — "isto é uma coluna de tempo?" — faz
 *  sentido nos dois sítios, e só deve existir respondida de uma maneira). */
export function pareceColunaDeAno(valores: string[]): boolean {
  const anoMax = new Date().getFullYear() + 2
  const naoVazios = valores.filter((v) => v.trim() !== '')
  if (naoVazios.length < MIN_LINHAS_COMPARAVEIS) return false
  const validos = naoVazios.filter((v) => {
    const n = paraNumero(v)
    return n !== null && Number.isInteger(n) && n >= 1990 && n <= anoMax
  })
  return validos.length / naoVazios.length >= 0.9
}

/** Colunas com aspecto de métrica numérica: pelo menos 70% dos valores não vazios lêem-se como
 *  número, há pelo menos alguns valores para se poder confiar no padrão (uma coluna com 2 linhas
 *  preenchidas por acaso numéricas não é evidência de nada), e a coluna não é um identificador de
 *  linha nem uma coluna de ano/período (pelo nome OU pela forma dos valores). Nunca a própria
 *  coluna de geografia. */
export function colunasNumericasCandidatas(tabela: Tabela, colunaGeografica: string): string[] {
  const candidatas: string[] = []
  for (const coluna of tabela.colunas.slice(0, 200)) {
    if (coluna === colunaGeografica) continue
    if (NOMES_NUNCA_METRICA.has(normalizarTexto(coluna))) continue
    const valores = colunaValores(tabela, coluna).filter((v) => v.trim() !== '')
    if (valores.length < MIN_LINHAS_COMPARAVEIS) continue
    if (pareceColunaDeAno(valores)) continue
    const numeros = valores.map(paraNumero).filter((n): n is number => n !== null)
    if (numeros.length / valores.length < 0.7) continue
    if (pareceIndiceSequencial(numeros)) continue
    candidatas.push(coluna)
    if (candidatas.length >= MAX_COLUNAS_POR_TABELA) break
  }
  return candidatas
}

type ParCandidato = { datasetAId: number; datasetBId: number }

/** Pares de datasets alfanuméricos da MESMA categoria — o sinal mais barato e mais fiável de que
 *  duas tabelas podem medir a mesma coisa (categorias diferentes quase nunca são comparáveis, e
 *  tentar todos os pares do catálogo seria O(n²) sobre datasets que nunca se vão cruzar). */
async function encontrarParesCandidatos(limite: number): Promise<ParCandidato[]> {
  const [linhas] = (await db.execute(
    `SELECT d1.id as a_id, d2.id as b_id
     FROM Dataset d1
     JOIN Dataset d2 ON d1.categoryId = d2.categoryId AND d1.id < d2.id
     WHERE d1.dataType = 'alfanumerico' AND d2.dataType = 'alfanumerico' AND d1.categoryId IS NOT NULL
     ORDER BY d1.categoryId, d1.id, d2.id
     LIMIT ?`,
    [limite]
  )) as [any[], unknown]
  return linhas.map((l) => ({ datasetAId: Number(l.a_id), datasetBId: Number(l.b_id) }))
}

export type ResultadoProcessamentoPar = {
  datasetAId: number
  datasetBId: number
  colunasComparadas: number
  registosGuardados: number
  erro?: string
}

/**
 * Compara dois datasets coluna a coluna e guarda o resultado. Nunca lança: um par que falhe (ex.:
 * ficheiro do dataset desaparecido) fica registado como erro e não impede os outros pares do lote.
 */
export async function processarPar(datasetAId: number, datasetBId: number): Promise<ResultadoProcessamentoPar> {
  try {
    const [tabelaA, tabelaB] = await Promise.all([carregarTabela(datasetAId), carregarTabela(datasetBId)])
    if ('erro' in tabelaA) return { datasetAId, datasetBId, colunasComparadas: 0, registosGuardados: 0, erro: tabelaA.erro }
    if ('erro' in tabelaB) return { datasetAId, datasetBId, colunasComparadas: 0, registosGuardados: 0, erro: tabelaB.erro }

    const [ligacaoA, ligacaoB] = await Promise.all([detectarColunaGeografica(tabelaA), detectarColunaGeografica(tabelaB)])
    if (!ligacaoA || !ligacaoB) {
      return { datasetAId, datasetBId, colunasComparadas: 0, registosGuardados: 0, erro: 'sem coluna geográfica reconhecível num dos dois' }
    }
    // Níveis administrativos diferentes (um por província, outro por distrito) não se comparam
    // por agregação forçada: recusa-se, tal como o resto do motor de verificação recusa em vez de
    // adivinhar.
    if (ligacaoA.nivel !== ligacaoB.nivel) {
      return { datasetAId, datasetBId, colunasComparadas: 0, registosGuardados: 0, erro: `níveis geográficos diferentes (${ligacaoA.nivel} vs ${ligacaoB.nivel})` }
    }

    const colunasA = colunasNumericasCandidatas(tabelaA, ligacaoA.coluna_usada)
    const colunasB = colunasNumericasCandidatas(tabelaB, ligacaoB.coluna_usada)

    let colunasComparadas = 0
    let registosGuardados = 0

    for (const colunaA of colunasA) {
      for (const colunaB of colunasB) {
        if (!colunasSemelhantes(colunaA, colunaB)) continue
        colunasComparadas++

        const [porUnidadeA, porUnidadeB] = await Promise.all([
          agregarPorUnidade(tabelaA, ligacaoA, colunaA, 'soma', ligacaoA.nivel),
          agregarPorUnidade(tabelaB, ligacaoB, colunaB, 'soma', ligacaoB.nivel),
        ])

        const registos: RegistoContradicao[] = []
        for (const uA of porUnidadeA) {
          const uB = porUnidadeB.find((x) => x.codigo === uA.codigo || mesmaGeografia(x.nome, uA.nome))
          if (!uB) continue
          const veredicto = compararValores(uA.valor, uB.valor, colunaA, TOLERANCIA_PADRAO)
          if (veredicto.estado === 'nao_comparavel') continue
          registos.push({
            datasetAId,
            datasetBId,
            colunaA,
            colunaB,
            geografia: uA.nome,
            periodo: null,
            valorA: uA.valor,
            valorB: uB.valor,
            estado: veredicto.estado,
            diferencaRelativaPct: veredicto.diferencaRelativaPct,
          })
        }

        await guardarResultadosDoPar(datasetAId, datasetBId, colunaA, colunaB, registos)
        registosGuardados += registos.length
      }
    }

    return { datasetAId, datasetBId, colunasComparadas, registosGuardados }
  } catch (erro: any) {
    logger.error('erro_processar_par_contradicao', { error: erro, datasetAId, datasetBId })
    return { datasetAId, datasetBId, colunasComparadas: 0, registosGuardados: 0, erro: 'falha inesperada' }
  }
}

/**
 * Processa um lote limitado de pares por chamada (o mesmo desenho do cron de análises vivas):
 * nunca tenta o catálogo inteiro numa só invocação, para nunca bater no limite de tempo de uma
 * função serverless a meio e perder o registo de onde ficou.
 */
export async function processarLote(quantosPares: number): Promise<ResultadoProcessamentoPar[]> {
  const candidatos = await encontrarParesCandidatos(500)
  if (candidatos.length === 0) return []

  const chaveDoPar = (c: ParCandidato) => `${c.datasetAId}:${c.datasetBId}`
  const verificados = await ultimaVerificacaoPorPar()
  // A tabela guarda por (par, coluna, coluna); aqui só interessa QUANDO um par foi visto pela
  // última vez, para ordenar candidatos nunca vistos antes dos já vistos, e entre os já vistos,
  // priorizar os mais antigos — por isso reduz-se à chave sem coluna, ficando com a mais antiga
  // das colunas desse par.
  const ultimaVezPorPar = new Map<string, number>()
  for (const [chave, quando] of Array.from(verificados.entries())) {
    const [a, b] = chave.split(':')
    const chaveSimples = `${a}:${b}`
    const actual = ultimaVezPorPar.get(chaveSimples)
    const tempo = quando.getTime()
    if (actual === undefined || tempo < actual) ultimaVezPorPar.set(chaveSimples, tempo)
  }

  const ordenados = [...candidatos].sort((x, y) => {
    const tx = ultimaVezPorPar.get(chaveDoPar(x)) ?? 0
    const ty = ultimaVezPorPar.get(chaveDoPar(y)) ?? 0
    return tx - ty
  })

  const escolhidos = ordenados.slice(0, quantosPares)
  const resultados: ResultadoProcessamentoPar[] = []
  for (const par of escolhidos) {
    resultados.push(await processarPar(par.datasetAId, par.datasetBId))
  }
  return resultados
}
