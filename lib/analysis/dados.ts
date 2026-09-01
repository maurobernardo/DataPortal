/**
 * Acesso a dados para o motor de análise.
 *
 * Diferença face a lib/dataset-preview.ts: aquele existe para pré-visualização na interface e
 * limita deliberadamente linhas e feições. Este carrega o dataset completo, porque um número que
 * chega ao utilizador não pode ser calculado sobre uma amostra sem que isso seja declarado.
 */
import { db, findDatasetById } from '@/lib/db'
import { getDatasetPreview } from '@/lib/dataset-preview'
import { paraNumero } from './library/numeric'

export type Tabela = {
  dataset_id: number
  titulo: string
  colunas: string[]
  linhas: string[][]
  /** Presente apenas em datasets geoespaciais: uma geometria por linha, na mesma ordem. */
  geometrias?: any[]
  n_linhas: number
  /** true quando a leitura foi truncada: obriga a declarar a limitação (R8). */
  truncado: boolean
}

const LIMITE_LINHAS = 100_000

/** Carrega um dataset completo como tabela. Para geoespaciais, usa os atributos das feições. */
export async function carregarTabela(datasetId: number): Promise<Tabela | { erro: string }> {
  const dataset = await findDatasetById(datasetId)
  if (!dataset) return { erro: `Dataset ${datasetId} não encontrado` }

  const preview = await getDatasetPreview(dataset, {
    maxRows: LIMITE_LINHAS,
    maxFeatures: LIMITE_LINHAS,
  })

  if ('error' in preview) return { erro: preview.error }

  if (preview.type === 'table') {
    return {
      dataset_id: datasetId,
      titulo: dataset.title,
      colunas: preview.columns,
      linhas: preview.rows,
      n_linhas: preview.rows.length,
      truncado: preview.rows.length >= LIMITE_LINHAS,
    }
  }

  if (preview.type === 'geo') {
    const features: any[] = preview.geojson?.features || []
    if (features.length === 0) return { erro: 'Dataset geoespacial sem feições' }

    // A união das chaves de todas as feições, e não só da primeira: shapefiles reais têm
    // feições com conjuntos de atributos ligeiramente diferentes.
    const colunas = new Set<string>()
    for (const f of features) {
      for (const k of Object.keys(f?.properties || {})) colunas.add(k)
    }
    const listaColunas = Array.from(colunas)

    return {
      dataset_id: datasetId,
      titulo: dataset.title,
      colunas: listaColunas,
      linhas: features.map((f) =>
        listaColunas.map((c) => {
          const v = f?.properties?.[c]
          return v == null ? '' : String(v)
        })
      ),
      geometrias: features.map((f) => f?.geometry),
      n_linhas: features.length,
      truncado: (preview.featureCount ?? features.length) > features.length,
    }
  }

  return { erro: 'Formato sem leitura tabular' }
}

export function colunaValores(tabela: Tabela, coluna: string): string[] {
  const i = tabela.colunas.indexOf(coluna)
  if (i === -1) return []
  return tabela.linhas.map((l) => l[i] ?? '')
}

export function colunaNumerica(tabela: Tabela, coluna: string): number[] {
  return colunaValores(tabela, coluna)
    .map(paraNumero)
    .filter((n): n is number => n !== null)
}

// ==================== LIGAÇÃO A UNIDADES ADMINISTRATIVAS ====================

export type NivelAdmin = 'admin1' | 'admin2' | 'admin3'

export type UnidadeAdmin = {
  codigo: string
  codigo_pai: string | null
  nome: string
  nivel: NivelAdmin
  area_km2: number | null
  /** Só carregado ao nível de província (fonte: Data4Moz L02, Censo 2017); distrito e posto
   *  administrativo ficam sem população até existir uma fonte com essa granularidade. */
  populacao: number | null
  centroide: [number, number]
}

let cacheUnidades: Map<NivelAdmin, UnidadeAdmin[]> | null = null

export async function carregarUnidades(nivel: NivelAdmin): Promise<UnidadeAdmin[]> {
  if (!cacheUnidades) cacheUnidades = new Map()
  const emCache = cacheUnidades.get(nivel)
  if (emCache) return emCache

  const [rows] = (await db.execute(
    `SELECT codigo, codigo_pai, nome, nivel, area_km2, populacao,
            ST_X(centroide) AS cx, ST_Y(centroide) AS cy
     FROM geo_unidades WHERE nivel = ? ORDER BY codigo`,
    [nivel]
  )) as [any[], unknown]

  const unidades: UnidadeAdmin[] = rows.map((r) => ({
    codigo: String(r.codigo),
    codigo_pai: r.codigo_pai ? String(r.codigo_pai) : null,
    nome: String(r.nome),
    nivel,
    area_km2: r.area_km2 != null ? Number(r.area_km2) : null,
    populacao: r.populacao != null ? Number(r.populacao) : null,
    centroide: [Number(r.cx), Number(r.cy)],
  }))

  cacheUnidades.set(nivel, unidades)
  return unidades
}

function normalizar(s: string): string {
  const semAcentos = s
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
    .trim()

  // "Maputo Cidade" é uma província de nível 1 por direito próprio, distinta de "Maputo"
  // (a província que a rodeia). A regra genérica de remover o sufixo "cidade"/"provincia"
  // colapsava as duas ao mesmo nome "maputo" (bug real, verificado: um dataset com "Maputo
  // Província" e "Maputo Cidade" atribuía as DUAS populações ao código da Cidade de Maputo,
  // perdendo a província inteira). Trata-se como excepção antes da regra genérica, que é
  // correcta para todos os outros pares provincia/distrito/posto do país.
  // "City" além de "Cidade": datasets internacionais escrevem os qualificadores em inglês
  // (verificado ao vivo, na base de electrificação RTM, que traz "Maputo City"). Sem isto a
  // similaridade com "maputocidade" ficava em 0,67, abaixo do limiar de 0,92, e a capital caía
  // fora de todos os cruzamentos sem que nada falhasse: a análise comparava 10 províncias em vez
  // de 11 e ninguém reparava.
  if (/^maputo\s+(cidade|city)$/.test(semAcentos)) return 'maputocidade'

  return (
    semAcentos
      // Qualificadores administrativos aparecem como prefixo ("Distrito de Lichinga") e como
      // sufixo ("Maputo Provincia"): removem-se os dois para que ambas as formas cheguem à
      // mesma chave. As formas inglesas entram pela mesma razão do caso acima.
      .replace(
        /^(distrito|district|posto administrativo|posto|cidade|city|provincia|province|municipio)\s+(de\s+|da\s+|do\s+|of\s+)?/i,
        ''
      )
      .replace(/\s+(provincia|province|cidade|city|distrito|district|posto)$/i, '')
      .replace(/[^a-z0-9?]/g, '')
      // Uma corrida de "?" representa um único carácter perdido na descodificação ("Zamb??zia"
      // por "Zambézia"): colapsá-la alinha o comprimento com o nome correcto, sem o que a
      // distância de edição penalizaria o caracter extra e o nome ficaria por corresponder.
      .replace(/\?+/g, '?')
      .trim()
  )
}

/**
 * Levenshtein normalizada com "?" como carácter universal.
 *
 * O "?" aparece quando o .dbf foi lido com a codificação errada e os acentos se perderam
 * (verificado nos dados: "Zamb??zia" em vez de "Zambézia"). Tratá-lo como coincidência em vez de
 * divergência recupera estes casos sem baixar o limiar global de 0,92, que é o que protege
 * contra correspondências erradas entre topónimos genuinamente diferentes.
 */
function similaridade(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0
  const custo = (x: string, y: string) => (x === y || x === '?' || y === '?' ? 0 : 1)
  const m = a.length
  const n = b.length
  let anterior = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const actual = [i]
    for (let j = 1; j <= n; j++) {
      actual[j] = Math.min(
        anterior[j] + 1,
        actual[j - 1] + 1,
        anterior[j - 1] + custo(a[i - 1], b[j - 1])
      )
    }
    anterior = actual
  }
  return 1 - anterior[n] / Math.max(m, n)
}

/**
 * Resolve um nome de unidade administrativa (qualquer nível) para o seu código — usado para
 * restringir uma agregação geográfica a "só dentro de X" (ex.: "distritos de Inhambane"), em vez
 * de agregar sempre ao país inteiro. Tenta admin1 primeiro (o caso mais comum de filtro — "dentro
 * da província Y"), depois admin2, depois admin3.
 */
export async function resolverUnidadePorNome(
  nomeConsulta: string
): Promise<{ codigo: string; nivel: NivelAdmin; nome: string } | null> {
  const alvo = normalizar(nomeConsulta)
  for (const nivel of ['admin1', 'admin2', 'admin3'] as NivelAdmin[]) {
    const unidades = await carregarUnidades(nivel)
    const exacta = unidades.find((u) => normalizar(u.nome) === alvo)
    if (exacta) return { codigo: exacta.codigo, nivel, nome: exacta.nome }
  }
  // Um "s" final é a variação mais comum de todas em nomes de lugar moçambicanos ("Vilankulos"
  // é como a cidade é conhecida no turismo e no discurso comum; o registo administrativo é
  // "Vilankulo") — mas custa 1/comprimento na distância de edição, e para nomes curtos isso chega
  // a ficar abaixo do limiar de 0,92 por uma margem mínima (confirmado ao vivo: "vilankulos" vs
  // "vilankulo" dá exactamente 0,90). Em vez de baixar o limiar global (o que aceitaria pares
  // genuinamente diferentes só por acaso ficarem parecidos), tenta-se também a versão sem o "s"
  // final de cada lado — só ajuda este caso específico e muito comum, não afrouxa o resto.
  const semSFinal = (s: string) => (s.endsWith('s') && s.length > 3 ? s.slice(0, -1) : s)
  for (const nivel of ['admin1', 'admin2', 'admin3'] as NivelAdmin[]) {
    const unidades = await carregarUnidades(nivel)
    let melhor: { codigo: string; nome: string; sim: number } | null = null
    for (const u of unidades) {
      const nomeNormalizado = normalizar(u.nome)
      const sim = Math.max(
        similaridade(alvo, nomeNormalizado),
        similaridade(semSFinal(alvo), semSFinal(nomeNormalizado))
      )
      if (sim >= 0.92 && (!melhor || sim > melhor.sim)) melhor = { codigo: u.codigo, nome: u.nome, sim }
    }
    if (melhor) return { codigo: melhor.codigo, nivel, nome: melhor.nome }
  }
  return null
}

/** Restringe um mapa índice-linha→código a só os códigos descendentes de "codigoPai" (prefixo
 *  hierárquico do pcode) — é isto que torna "distritos DENTRO de Inhambane" diferente de
 *  "distritos do país inteiro" sem precisar de recarregar nem religar nada. */
export function restringirLigacoesAUnidade(
  ligacoes: Map<number, string>,
  codigoPai: string
): Map<number, string> {
  const filtradas = new Map<number, string>()
  Array.from(ligacoes).forEach(([indice, codigo]) => {
    if (codigo.startsWith(codigoPai)) filtradas.set(indice, codigo)
  })
  return filtradas
}

export type ResultadoLigacao = {
  nivel: NivelAdmin
  coluna_usada: string
  /** Índice da linha da tabela -> código da unidade administrativa. */
  ligacoes: Map<number, string>
  taxa_correspondencia: number
  /** Valores que não corresponderam a nenhuma unidade: entram em "O que isto não diz" (R8). */
  nao_correspondidos: string[]
  metodo: 'codigo' | 'nome_exacto' | 'nome_difuso'
}

/**
 * Liga as linhas de uma tabela a unidades administrativas, tentando por esta ordem:
 * código (pcode), nome exacto normalizado, nome difuso acima de 0,92 de similaridade.
 *
 * O limiar de 0,92 vem do spec (Parte 3.3) e é deliberadamente alto: uma correspondência errada
 * de topónimo produz um mapa credível mas falso, que é o pior resultado possível.
 */
export async function ligarAUnidades(
  tabela: Tabela,
  coluna: string,
  nivel: NivelAdmin
): Promise<ResultadoLigacao> {
  return ligarValoresAUnidades(colunaValores(tabela, coluna), coluna, nivel)
}

/**
 * Núcleo da ligação, sobre valores já extraídos: permite ligar colunas virtuais compostas.
 *
 * `permitirDifuso` existe porque a correspondência difusa nunca deve ser aplicada a códigos
 * numéricos: "0101" e "0102" são distritos diferentes mas 75% semelhantes, e uma correspondência
 * difusa atribuiria dados ao distrito errado produzindo um mapa credível e falso.
 */
export async function ligarValoresAUnidades(
  valores: string[],
  nomeColuna: string,
  nivel: NivelAdmin,
  opcoes: { permitirDifuso?: boolean } = {}
): Promise<ResultadoLigacao> {
  const permitirDifuso = opcoes.permitirDifuso !== false
  const unidades = await carregarUnidades(nivel)
  const coluna = nomeColuna

  const porCodigo = new Map(unidades.map((u) => [u.codigo, u.codigo]))
  const porNome = new Map(unidades.map((u) => [normalizar(u.nome), u.codigo]))

  const ligacoes = new Map<number, string>()
  const naoCorrespondidos = new Set<string>()
  let metodo: ResultadoLigacao['metodo'] = 'codigo'

  // Resolve-se cada valor DISTINTO uma só vez. Sem isto, a correspondência difusa correria
  // uma vez por linha: num dataset de milhares de pontos com 11 nomes de província repetidos,
  // seria milhares de comparações de Levenshtein para obter as mesmas 11 respostas.
  const nomesNormalizadosUnidades = unidades.map((u) => ({ codigo: u.codigo, norm: normalizar(u.nome) }))
  const resolvidos = new Map<string, string | null>()

  const resolver = (valor: string): string | null => {
    const emCache = resolvidos.get(valor)
    if (emCache !== undefined) return emCache

    let resultado: string | null = null

    if (porCodigo.has(valor)) {
      resultado = valor
    } else {
      // Códigos numéricos perdem zeros à esquerda ao passar por Excel: "1" contra "01".
      const comZeros = valor.padStart(unidades[0]?.codigo.length ?? 2, '0')
      if (porCodigo.has(comZeros)) {
        resultado = comZeros
      } else {
        const norm = normalizar(valor)
        if (porNome.has(norm)) {
          resultado = porNome.get(norm)!
          if (metodo === 'codigo') metodo = 'nome_exacto'
        } else if (permitirDifuso && !/^\d+$/.test(valor)) {
          let melhor = { codigo: '', sim: 0 }
          for (const u of nomesNormalizadosUnidades) {
            const s = similaridade(norm, u.norm)
            if (s > melhor.sim) melhor = { codigo: u.codigo, sim: s }
          }
          if (melhor.sim >= 0.92) {
            resultado = melhor.codigo
            metodo = 'nome_difuso'
          }
        }
      }
    }

    resolvidos.set(valor, resultado)
    return resultado
  }

  valores.forEach((valorBruto, i) => {
    const valor = String(valorBruto ?? '').trim()
    if (!valor) return
    const codigo = resolver(valor)
    if (codigo) ligacoes.set(i, codigo)
    else naoCorrespondidos.add(valor)
  })

  const comValor = valores.filter((v) => String(v ?? '').trim()).length
  return {
    nivel,
    coluna_usada: coluna,
    ligacoes,
    taxa_correspondencia: comValor > 0 ? ligacoes.size / comValor : 0,
    nao_correspondidos: Array.from(naoCorrespondidos).slice(0, 30),
    metodo,
  }
}

/**
 * Detecta automaticamente qual coluna liga a unidades administrativas e a que nível.
 * Testa todas as colunas de texto contra os três níveis e devolve a melhor correspondência.
 */
export async function detectarColunaGeografica(
  tabela: Tabela
): Promise<ResultadoLigacao | null> {
  let melhor: ResultadoLigacao | null = null

  const considerar = (r: ResultadoLigacao | null) => {
    if (!r || r.taxa_correspondencia < 0.5) return
    if (
      !melhor ||
      r.taxa_correspondencia > melhor.taxa_correspondencia + 0.05 ||
      (Math.abs(r.taxa_correspondencia - melhor.taxa_correspondencia) <= 0.05 &&
        nivelMaisFino(r.nivel, melhor.nivel))
    ) {
      melhor = r
    }
  }

  // Códigos hierárquicos guardados em colunas separadas (verificado no dataset Escolas:
  // ProvCodigo + DistritoCo + PostoCodig). Sem os concatenar, a análise ficaria presa na
  // província mesmo havendo posto administrativo nos dados, o que viola R4.
  // Um dataset real com códigos geográficos separados por coluna nunca tem mais do que uns
  // poucos (província+distrito+posto, no máximo 3-4) — mas o filtro acima ("valores curtos,
  // 1-3 dígitos") também apanha QUALQUER coluna numérica pequena, e datasets largos (ex.: uma
  // tabela de população com uma coluna por faixa etária, 300+ colunas) podem ter dezenas delas.
  // O laço abaixo é O(n³) em colunasCodigo (tenta todo o par e todo o trio), cada iteração com um
  // await real — com "n" na casa das dezenas isto passa de milissegundos a HORAS (confirmado:
  // travou uma análise real mais de 10 minutos com 372 colunas). Nenhum caso legítimo desta
  // heurística precisa de mais do que um punhado de colunas candidatas; acima disso, é sinal de
  // que a coluna curta é uma medida (idade, ano, faixa), não um código geográfico, e tentar à
  // mesma só desperdiça tempo sem nunca ter sido o objectivo desta heurística.
  const LIMITE_COLUNAS_CODIGO = 8
  const colunasCodigoTodas = tabela.colunas.filter((c) => {
    const amostra = colunaValores(tabela, c).slice(0, 100).filter(Boolean)
    return amostra.length > 0 && amostra.every((v) => /^\d{1,3}$/.test(String(v).trim()))
  })
  const colunasCodigo = colunasCodigoTodas.length <= LIMITE_COLUNAS_CODIGO ? colunasCodigoTodas : []

  for (let i = 0; i < colunasCodigo.length; i++) {
    for (let j = 0; j < colunasCodigo.length; j++) {
      if (i === j) continue
      const a = colunaValores(tabela, colunasCodigo[i])
      const b = colunaValores(tabela, colunasCodigo[j])
      const par = a.map((v, k) =>
        v && b[k] ? String(v).padStart(2, '0') + String(b[k]).padStart(2, '0') : ''
      )
      considerar(await ligarValoresAUnidades(par, `${colunasCodigo[i]}+${colunasCodigo[j]}`, 'admin2', { permitirDifuso: false }))

      for (let l = 0; l < colunasCodigo.length; l++) {
        if (l === i || l === j) continue
        const c = colunaValores(tabela, colunasCodigo[l])
        const trio = par.map((v, k) => (v && c[k] ? v + String(c[k]).padStart(2, '0') : ''))
        considerar(
          await ligarValoresAUnidades(
            trio,
            `${colunasCodigo[i]}+${colunasCodigo[j]}+${colunasCodigo[l]}`,
            'admin3',
            { permitirDifuso: false }
          )
        )
      }
    }
  }

  for (const coluna of tabela.colunas) {
    // Ignora colunas claramente numéricas de medida: não são topónimos nem pcodes.
    const amostra = colunaValores(tabela, coluna).slice(0, 50).filter(Boolean)
    if (amostra.length === 0) continue
    const proporcaoNumerica = amostra.filter((v) => paraNumero(v) !== null).length / amostra.length
    const pareceCodigo = amostra.every((v) => /^\d{2,6}$/.test(String(v).trim()))
    if (proporcaoNumerica > 0.9 && !pareceCodigo) continue

    // Prefere sempre o nível mais fino com boa correspondência (R4).
    for (const nivel of ['admin3', 'admin2', 'admin1'] as NivelAdmin[]) {
      considerar(await ligarAUnidades(tabela, coluna, nivel))
    }
  }

  return melhor
}

function nivelMaisFino(a: NivelAdmin, b: NivelAdmin): boolean {
  const ordem: Record<NivelAdmin, number> = { admin1: 1, admin2: 2, admin3: 3 }
  return ordem[a] > ordem[b]
}

/**
 * Agrega uma métrica por unidade administrativa, no nível pedido, subindo na hierarquia quando
 * o nível pedido é mais grosso do que aquele a que os dados estão ligados.
 */
export async function agregarPorUnidade(
  tabela: Tabela,
  ligacao: ResultadoLigacao,
  colunaMetrica: string,
  agregacao: 'soma' | 'media' | 'contagem',
  nivelAlvo?: NivelAdmin
): Promise<{ codigo: string; nome: string; valor: number; n: number }[]> {
  const nivel = nivelAlvo || ligacao.nivel
  const unidades = await carregarUnidades(nivel)
  const nomePorCodigo = new Map(unidades.map((u) => [u.codigo, u.nome]))

  // Para subir de nível, trunca-se o pcode: os códigos são hierárquicos por construção
  // (província 2 dígitos, distrito 4, posto 6), o que foi verificado no carregamento.
  const digitos: Record<NivelAdmin, number> = { admin1: 2, admin2: 4, admin3: 6 }
  const cortar = (codigo: string) => codigo.slice(0, digitos[nivel])

  const valores = colunaValores(tabela, colunaMetrica)
  const acumulado = new Map<string, { soma: number; n: number }>()

  Array.from(ligacao.ligacoes).forEach(([indiceLinha, codigoOrigem]) => {
    const codigo = cortar(codigoOrigem)
    if (!nomePorCodigo.has(codigo)) return
    const v = paraNumero(valores[indiceLinha])
    const actual = acumulado.get(codigo) || { soma: 0, n: 0 }
    if (agregacao === 'contagem') {
      actual.n += 1
    } else if (v !== null) {
      actual.soma += v
      actual.n += 1
    }
    acumulado.set(codigo, actual)
  })

  return Array.from(acumulado)
    .map(([codigo, { soma, n }]) => ({
      codigo,
      nome: nomePorCodigo.get(codigo) || codigo,
      valor: agregacao === 'contagem' ? n : agregacao === 'media' ? (n ? soma / n : 0) : soma,
      n,
    }))
    .sort((a, b) => b.valor - a.valor)
}
