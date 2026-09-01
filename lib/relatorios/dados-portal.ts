import { agregarPorUnidade, carregarTabela, colunaValores, detectarColunaGeografica, type NivelAdmin, type ResultadoLigacao, type Tabela } from '@/lib/analysis/dados'
import type { ValorPortal } from './verificar-afirmacao'

/**
 * Carrega, de um dataset do portal, os valores contra os quais se verifica uma afirmação de
 * relatório.
 *
 * Este é o lado de INFRA-ESTRUTURA da verificação, não o lado testado a sério: `verificar-
 * afirmacao.ts` decide com que rigor comparar dois números, e essa lógica é pura e tem 27 testes.
 * Isto aqui só busca os números. Um erro de ligação geográfica ou de filtro entra pela mesma
 * disciplina de recusa que o resto do motor de análise já usa (`detectarColunaGeografica` exige
 * taxa de correspondência mínima de 0,5), e um dataset que não ligue bem simplesmente não produz
 * valores, o que faz `verificarAfirmacao` recusar por "sem dados", que é o resultado certo.
 */

function unidade(params: ParametrosSerieDoPortal): string {
  if (params.unidadeMetrica) return params.unidadeMetrica
  return params.colunaMetrica ? 'unidades não especificadas' : 'contagem'
}

function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export type ParametrosSerieDoPortal = {
  datasetId: number
  nivelGeo: NivelAdmin
  /** Coluna com o valor a agregar; ausente = contar registos. */
  colunaMetrica?: string
  /** Para datasets em formato longo: a coluna que nomeia o indicador (ex.: "variable_name_pt"). */
  colunaIndicador?: string
  /** O valor exacto (ou aproximado) do indicador a isolar (ex.: "Produção de milho (toneladas)"). */
  valorIndicador?: string
  /** Coluna do ano/período, quando existir: sem ela, a série sai com `periodo: null`. */
  colunaTempo?: string
  /** A unidade de medida, tal como o relatório a escreveria (ex.: "toneladas", "%"). Sem ela,
   *  fica um rótulo genérico e `verificarAfirmacao` vai recusar por unidade incompatível assim que
   *  for comparada com qualquer coisa concreta: é o comportamento certo quando a unidade não foi
   *  informada, não um valor por omissão a fingir precisão que não existe. */
  unidadeMetrica?: string
  /** Some os valores de todas as unidades por período, com `geografia: 'nacional'`, além da série
   *  por unidade: é o que permite verificar afirmações sobre o país inteiro. */
  incluirNacional?: boolean
}

function restringirLigacao(
  ligacao: ResultadoLigacao,
  manter: (indice: number) => boolean
): ResultadoLigacao {
  const filtradas = new Map<number, string>()
  Array.from(ligacao.ligacoes).forEach(([indice, codigo]) => {
    if (manter(indice)) filtradas.set(indice, codigo)
  })
  return { ...ligacao, ligacoes: filtradas }
}

export async function serieDoPortal(params: ParametrosSerieDoPortal): Promise<ValorPortal[]> {
  const tabela = (await carregarTabela(params.datasetId)) as Tabela | { erro: string }
  if ('erro' in tabela) return []

  const deteccao = await detectarColunaGeografica(tabela)
  if (!deteccao) return []
  let ligacaoBase = deteccao

  if (params.colunaIndicador && params.valorIndicador && tabela.colunas.includes(params.colunaIndicador)) {
    const valores = colunaValores(tabela, params.colunaIndicador)
    const alvo = normalizar(params.valorIndicador)
    ligacaoBase = restringirLigacao(ligacaoBase, (i) => normalizar(valores[i] || '') === alvo)
  }

  const colunaMetrica = params.colunaMetrica || tabela.colunas[0]
  const agregacao = params.colunaMetrica ? 'soma' : 'contagem'

  const periodos: (string | null)[] =
    params.colunaTempo && tabela.colunas.includes(params.colunaTempo)
      ? Array.from(
          new Set(
            Array.from(ligacaoBase.ligacoes.keys()).map((i) => (colunaValores(tabela, params.colunaTempo!)[i] || '').trim())
          )
        ).filter(Boolean)
      : [null]

  const valores: ValorPortal[] = []
  const temposBrutos = params.colunaTempo ? colunaValores(tabela, params.colunaTempo) : null

  for (const periodo of periodos) {
    const ligacaoDoPeriodo =
      periodo === null || !temposBrutos
        ? ligacaoBase
        : restringirLigacao(ligacaoBase, (i) => (temposBrutos[i] || '').trim() === periodo)

    const porUnidade = await agregarPorUnidade(tabela, ligacaoDoPeriodo, colunaMetrica, agregacao, params.nivelGeo)
    const periodoNumerico = periodo !== null && Number.isFinite(Number(periodo)) ? Number(periodo) : null

    for (const u of porUnidade) {
      valores.push({ geografia: u.nome, periodo: periodoNumerico, valor: u.valor, unidade: unidade(params) })
    }
    if (params.incluirNacional && porUnidade.length > 0) {
      const total = porUnidade.reduce((s, u) => s + u.valor, 0)
      valores.push({ geografia: 'nacional', periodo: periodoNumerico, valor: total, unidade: unidade(params) })
    }
  }

  return valores
}
