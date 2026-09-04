import { carregarTabela, colunaValores, detectarColunaGeografica, ligarValoresAUnidades } from '@/lib/analysis/dados'
import { serieDoPortal } from '@/lib/relatorios/dados-portal'
import { colunasNumericasCandidatas, pareceColunaDeAno } from './detectar-contradicoes'
import {
  datasetsAlfanumericosPorAntiguidade,
  guardarAnomaliasDoDataset,
  type RegistoAnomalia,
} from './persistencia-anomalias'
import { logger } from '@/lib/logger'

/**
 * Detecção de anomalias DENTRO de um único dataset: um valor que destoa muito dos outros para a
 * mesma métrica (provável erro de digitação — um zero a mais, uma vírgula decimal trocada por
 * ponto) ou que salta de forma anormal de um período para o outro na mesma unidade geográfica.
 *
 * Determinística, sem IA: estatística robusta simples (mediana + desvio absoluto mediano, o
 * "modified z-score" de Iglewicz & Hoaglin), o mesmo tipo de técnica usada em controlo de
 * qualidade de dados há décadas. Nunca corrige nem remove nada — só assinala, para uma pessoa
 * decidir se é de facto um erro ou uma variação real e rara.
 */

const LIMIAR_Z_MODIFICADO = 3.5
const MIN_UNIDADES_PARA_OUTLIER = 6
const LIMIAR_SALTO_PCT = 75

/** Coluna de ano/período: nenhum sítio do projecto detecta isto automaticamente hoje (é sempre
 *  indicado por quem pede uma análise) — reaproveita a mesma heurística usada para EXCLUIR colunas
 *  de ano das métricas candidatas (detectar-contradicoes.ts), só que aqui serve o propósito
 *  inverso: encontrar qual é, para a passar a `serieDoPortal`. */
function detectarColunaTempo(colunas: string[], valoresPorColuna: Map<string, string[]>): string | null {
  for (const coluna of colunas) {
    if (pareceColunaDeAno(valoresPorColuna.get(coluna) || [])) return coluna
  }
  return null
}

const MAX_INDICADORES_DISTINTOS = 40

/** Nomes que, quando batem com uma coluna candidata, são um sinal muito mais forte do que
 *  qualquer contagem: um dataset real ("Indicadores de Desenvolvimento L01-L06") tinha DUAS
 *  colunas candidatas por cardinalidade — "geography_type" (2 valores: "Province"/"National") e
 *  "variable_name_pt" (40 indicadores reais, "População Total", "Taxa de Fecundidade"...) — e a
 *  escolha só por "menos valores distintos, mais repetidos" apanhava sempre a errada
 *  ("geography_type", que não é um indicador nenhum, é só o nível da linha). O nome da coluna
 *  desfaz o empate. */
const NOMES_COLUNA_INDICADOR = [
  'variable_name_pt', 'variable_name_en', 'variable_name', 'nome_variavel', 'nome_indicador',
  'indicator_name', 'indicador', 'variavel', 'variável',
]

/**
 * Coluna de indicador, em datasets de formato longo: uma única coluna "value" pode misturar
 * dezenas de métricas diferentes (população, produção, taxa de escolarização...), cada linha
 * marcada com QUAL delas é, numa coluna à parte (ex.: "variable_name_pt"). Sem separar por essa
 * coluna, a mediana e o desvio calculados sobre "value" misturam indicadores de escalas
 * completamente diferentes, e um valor perfeitamente normal para o SEU indicador aparece como
 * "3x a mediana" só porque a mediana incluía valores de outro indicador qualquer. Apanhado ao
 * vivo: um dataset destes marcava dúzias de "anomalias" que eram apenas indicadores diferentes.
 *
 * Duas fases: primeiro procura-se um nome de coluna conhecido (ver acima) — se existir e passar
 * no crivo básico de cardinalidade, ganha sempre, mesmo que outra coluna tenha uma cardinalidade
 * "mais bonita". Só sem nenhum nome reconhecido é que se cai para a heurística por forma dos
 * valores (poucos distintos, cada um repetido várias vezes).
 */
function detectarColunaIndicador(
  colunas: string[],
  valoresPorColuna: Map<string, string[]>
): { coluna: string; valores: string[] } | null {
  const candidatos: { coluna: string; valores: string[]; repeticaoMedia: number }[] = []
  for (const coluna of colunas) {
    const naoVazios = (valoresPorColuna.get(coluna) || []).filter((v) => v.trim() !== '')
    if (naoVazios.length < MIN_LINHAS_COMPARAVEIS_INDICADOR) continue
    const distintos = Array.from(new Set(naoVazios.map((v) => v.trim())))
    if (distintos.length < 2 || distintos.length > MAX_INDICADORES_DISTINTOS) continue
    const repeticaoMedia = naoVazios.length / distintos.length
    // Cada indicador tem de aparecer várias vezes (várias geografias e/ou períodos) — uma coluna
    // onde cada valor só aparece uma ou duas vezes é texto livre, não uma categoria.
    if (repeticaoMedia < 3) continue
    candidatos.push({ coluna, valores: distintos, repeticaoMedia })
  }
  if (candidatos.length === 0) return null

  const porNome = candidatos.find((c) =>
    NOMES_COLUNA_INDICADOR.some((n) => normalizarNomeColuna(c.coluna) === normalizarNomeColuna(n))
  )
  if (porNome) return { coluna: porNome.coluna, valores: porNome.valores }

  const melhor = candidatos.reduce((a, b) => (b.repeticaoMedia > a.repeticaoMedia ? b : a))
  return { coluna: melhor.coluna, valores: melhor.valores }
}

function normalizarNomeColuna(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

const MIN_LINHAS_COMPARAVEIS_INDICADOR = 6

function medianaEDesvioMediano(valores: number[]): { mediana: number; mad: number } {
  const ord = [...valores].sort((a, b) => a - b)
  const meio = (lista: number[]) =>
    lista.length % 2 === 1 ? lista[(lista.length - 1) / 2] : (lista[lista.length / 2 - 1] + lista[lista.length / 2]) / 2
  const mediana = meio(ord)
  const desvios = valores.map((v) => Math.abs(v - mediana)).sort((a, b) => a - b)
  return { mediana, mad: meio(desvios) }
}

function formatarNumero(n: number): string {
  return n.toLocaleString('pt-PT', { maximumFractionDigits: 2 })
}

/**
 * Analisa UMA série já filtrada (um único indicador, se o dataset for de formato longo; a coluna
 * inteira, caso contrário) e devolve as anomalias encontradas nela. `prefixoIndicador`, quando
 * presente, entra no detalhe para dizer a que indicador aquele número pertence — sem isso, um
 * dataset de formato longo mostraria "value destoa" sem dizer value de quê.
 */
function analisarSerie(
  serie: { geografia: string; periodo: number | null; valor: number }[],
  coluna: string,
  colunaTempo: string | undefined,
  prefixoIndicador: string | null
): RegistoAnomalia[] {
  const registos: RegistoAnomalia[] = []
  const prefixo = prefixoIndicador ? `Indicador "${prefixoIndicador}": ` : ''

  // Transversal: agrupa por período (ou um único grupo "sem período"), e dentro de cada grupo
  // compara as unidades geográficas entre si. Só faz sentido com unidades suficientes — a mediana
  // de 3 valores não diz nada de confiável sobre o quarto.
  const porPeriodo = new Map<string | null, typeof serie>()
  for (const v of serie) {
    const chave = v.periodo === null ? null : String(v.periodo)
    if (!porPeriodo.has(chave)) porPeriodo.set(chave, [])
    porPeriodo.get(chave)!.push(v)
  }
  for (const grupo of Array.from(porPeriodo.values())) {
    if (grupo.length < MIN_UNIDADES_PARA_OUTLIER) continue
    const { mediana, mad } = medianaEDesvioMediano(grupo.map((v) => v.valor))
    if (mad === 0) continue
    for (const v of grupo) {
      const zModificado = (0.6745 * (v.valor - mediana)) / mad
      if (Math.abs(zModificado) <= LIMIAR_Z_MODIFICADO) continue
      const vezes = mediana !== 0 ? Math.abs(v.valor / mediana) : null
      registos.push({
        coluna,
        geografia: v.geografia,
        periodo: v.periodo,
        valor: v.valor,
        tipo: 'outlier_transversal',
        detalhe:
          vezes !== null
            ? `${prefixo}${formatarNumero(v.valor)} é ${vezes >= 1 ? `${vezes.toFixed(1)}x` : `${(vezes * 100).toFixed(0)}%`} a mediana das outras geografias (${formatarNumero(mediana)})`
            : `${prefixo}${formatarNumero(v.valor)} destoa muito das outras geografias, cuja mediana é zero`,
      })
    }
  }

  // Temporal: só quando há coluna de ano — salto brusco de um período para o seguinte, na MESMA
  // geografia. Limiar fixo e conservador (75%), não estatístico: poucos pontos por série (2-5
  // anos, tipicamente) não chegam para uma mediana/desvio confiáveis.
  if (colunaTempo) {
    const porGeografia = new Map<string, typeof serie>()
    for (const v of serie) {
      if (v.periodo === null) continue
      if (!porGeografia.has(v.geografia)) porGeografia.set(v.geografia, [])
      porGeografia.get(v.geografia)!.push(v)
    }
    for (const [geografia, pontos] of Array.from(porGeografia.entries())) {
      const ordenados = [...pontos].sort((a, b) => (a.periodo as number) - (b.periodo as number))
      for (let i = 1; i < ordenados.length; i++) {
        const anterior = ordenados[i - 1]
        const actual = ordenados[i]
        if (anterior.valor === 0) continue
        const variacaoPct = ((actual.valor - anterior.valor) / Math.abs(anterior.valor)) * 100
        if (Math.abs(variacaoPct) < LIMIAR_SALTO_PCT) continue
        registos.push({
          coluna,
          geografia,
          periodo: actual.periodo,
          valor: actual.valor,
          tipo: 'salto_temporal',
          detalhe: `${prefixo}${variacaoPct > 0 ? 'subiu' : 'desceu'} ${Math.abs(variacaoPct).toFixed(0)}% face a ${anterior.periodo} (${formatarNumero(anterior.valor)} → ${formatarNumero(actual.valor)})`,
        })
      }
    }
  }

  return registos
}

export async function detectarAnomaliasDataset(datasetId: number): Promise<RegistoAnomalia[]> {
  const tabela = await carregarTabela(datasetId)
  if ('erro' in tabela) return []

  const ligacao = await detectarColunaGeografica(tabela)
  if (!ligacao) return []

  const colunas = colunasNumericasCandidatas(tabela, ligacao.coluna_usada)
  if (colunas.length === 0) return []

  const valoresPorColuna = new Map<string, string[]>()
  for (const c of tabela.colunas) valoresPorColuna.set(c, colunaValores(tabela, c))
  const outrasColunas = tabela.colunas.filter((c) => c !== ligacao.coluna_usada && !colunas.includes(c))
  const colunaTempo = detectarColunaTempo(outrasColunas, valoresPorColuna) || undefined
  // Formato longo: uma coluna categórica (fora da geografia e do tempo) que repete um pequeno
  // conjunto de valores muitas vezes é, quase sempre, o nome do indicador que cada linha mede —
  // sem separar por ela, misturam-se métricas de escalas diferentes na mesma mediana. Mas uma
  // coluna assim também pode ser só OUTRO nome de geografia (ex.: "Province" ao lado da coluna de
  // distrito realmente usada) — apanhado ao vivo: sem este filtro, "Province" foi escolhida como
  // "indicador", e cada província virou um falso indicador com uma só geografia lá dentro.
  // Testa-se cada candidata contra os TRÊS níveis administrativos, não só o nível já escolhido
  // para a geografia principal: "Province" não bate com nomes de distrito (o nível que ganhou),
  // mas continua a ser geografia a sério, só que de outro nível — testar só contra o nível
  // vencedor deixava passar exactamente este caso. Mesmo limiar (0,5) que `detectarColunaGeografica`
  // usa para considerar "é geografia".
  const candidatosBrutos = outrasColunas.filter((c) => c !== colunaTempo)
  const candidatosIndicador: string[] = []
  for (const c of candidatosBrutos) {
    const valores = valoresPorColuna.get(c) || []
    const testes = await Promise.all(
      (['admin1', 'admin2', 'admin3'] as const).map((nivel) => ligarValoresAUnidades(valores, c, nivel))
    )
    const ehGeografia = testes.some((t) => t.taxa_correspondencia >= 0.5)
    if (!ehGeografia) candidatosIndicador.push(c)
  }
  const indicador = detectarColunaIndicador(candidatosIndicador, valoresPorColuna)

  const registos: RegistoAnomalia[] = []

  for (const coluna of colunas) {
    if (indicador) {
      for (const valorIndicador of indicador.valores) {
        const serie = await serieDoPortal({
          datasetId,
          nivelGeo: ligacao.nivel,
          colunaMetrica: coluna,
          colunaTempo,
          colunaIndicador: indicador.coluna,
          valorIndicador,
        })
        if (serie.length === 0) continue
        registos.push(...analisarSerie(serie, coluna, colunaTempo, valorIndicador))
      }
      continue
    }

    const serie = await serieDoPortal({
      datasetId,
      nivelGeo: ligacao.nivel,
      colunaMetrica: coluna,
      colunaTempo,
    })
    if (serie.length === 0) continue
    registos.push(...analisarSerie(serie, coluna, colunaTempo, null))
  }

  return registos
}

export type ResultadoAnomaliaDataset = { datasetId: number; anomalias: number; erro?: string }

export async function processarDataset(datasetId: number): Promise<ResultadoAnomaliaDataset> {
  try {
    const registos = await detectarAnomaliasDataset(datasetId)
    await guardarAnomaliasDoDataset(datasetId, registos)
    return { datasetId, anomalias: registos.length }
  } catch (erro: any) {
    logger.error('erro_detectar_anomalias', { error: erro, datasetId })
    return { datasetId, anomalias: 0, erro: 'falha inesperada' }
  }
}

export async function processarLote(quantos: number): Promise<ResultadoAnomaliaDataset[]> {
  const ids = await datasetsAlfanumericosPorAntiguidade(quantos)
  const resultados: ResultadoAnomaliaDataset[] = []
  for (const id of ids) resultados.push(await processarDataset(id))
  return resultados
}
