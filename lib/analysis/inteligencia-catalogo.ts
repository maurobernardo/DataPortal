import { db, findDatasetById } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getCliente, modeloPara } from './router'
import { getDatasetPreview } from '@/lib/dataset-preview'

/**
 * PLANO-INTELIGENCIA-PORTAL.md: três capacidades de IA sobre o catálogo, cada uma sob pedido
 * explícito de um admin (nunca automática/em lote) — mesmo padrão de custo controlado já usado em
 * `sugestoes-datasets.ts` e `rotulos-aprendidos.ts` nesta base de código.
 */

// ---------------------------------------------------------------------------
// Busca semântica: em vez de um índice de embeddings (este portal não tem fornecedor de
// embeddings integrado — ver memoria.ts), usa-se o próprio modelo para "ler" o catálogo completo
// e apontar quais datasets respondem à pergunta, mesmo sem sobreposição literal de palavras.
// Catálogo tem escala pequena (dezenas de datasets), por isso cabe inteiro numa chamada.
// ---------------------------------------------------------------------------

export type ResultadoBuscaSemantica = { datasetId: number; motivo: string }

const SISTEMA_BUSCA_SEMANTICA =
  'Recebes uma lista numerada de datasets de um portal de dados de Moçambique (título, categoria, ' +
  'palavras-chave, tipo) e uma pergunta em linguagem natural. Devolve os datasets realmente ' +
  'relevantes para a pergunta, mesmo que não partilhem nenhuma palavra literal com ela (ex.: uma ' +
  'pergunta sobre "acesso à água" pode ser respondida por um dataset de "saneamento" ou ' +
  '"infra-estrutura hídrica"). Nunca inventes um dataset que não esteja na lista. Responde só com ' +
  'um array JSON de objectos {"numero": N, "motivo": "até 12 palavras explicando a relevância"}, ' +
  'ordenado do mais para o menos relevante, no máximo 8 itens. Se nada for relevante, devolve []. ' +
  'Nunca uses o travessão "—" no texto: usa ":" ou ";".'

export async function buscaSemanticaCatalogo(pergunta: string): Promise<ResultadoBuscaSemantica[]> {
  const [rows] = (await db.execute(
    `SELECT d.id, d.title, d.keywords, d.dataType, c.name as categoria
     FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id
     ORDER BY d.id ASC`
  )) as [any[], unknown]

  if (rows.length === 0) return []

  const listaNumerada = rows
    .map((r, i) => `${i + 1}. ${r.title} | categoria: ${r.categoria || 'N/D'} | tipo: ${r.dataType} | palavras-chave: ${r.keywords || 'nenhuma'}`)
    .join('\n')

  const cliente = getCliente()
  const resposta = await cliente.messages.create({
    model: modeloPara('suficiencia'),
    max_tokens: 1024,
    system: SISTEMA_BUSCA_SEMANTICA,
    messages: [{ role: 'user', content: `Pergunta: ${pergunta}\n\nDatasets:\n${listaNumerada}` }],
  } as any)

  const texto = (resposta as any).content
    ?.filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('') || '[]'
  const bloco = texto.match(/\[[\s\S]*\]/)?.[0] || '[]'

  let lista: { numero: number; motivo: string }[] = []
  try {
    lista = JSON.parse(bloco)
  } catch (erro) {
    logger.error('erro_parse_busca_semantica', { error: erro })
    return []
  }

  return lista
    .filter((item) => Number.isInteger(item.numero) && item.numero >= 1 && item.numero <= rows.length)
    .map((item) => ({ datasetId: rows[item.numero - 1].id, motivo: item.motivo || '' }))
}

// ---------------------------------------------------------------------------
// Resumo automático: sintetiza os campos de metadados já existentes num parágrafo legível — não
// lê o conteúdo do ficheiro (isso é o `verificarQualidadeDataset` abaixo, só para CSV por agora).
// Nunca inventa nada fora dos campos fornecidos.
// ---------------------------------------------------------------------------

const SISTEMA_RESUMO =
  'Escreves um resumo detalhado (6-8 frases, dois parágrafos, português de Moçambique) de um ' +
  'dataset de um portal de dados abertos. Usa os metadados fornecidos (título, categoria, fonte, ' +
  'ano, formato, tipo, cobertura geográfica, unidade mínima, palavras-chave) e, quando existir, a ' +
  'amostra real do conteúdo do ficheiro (colunas/atributos e primeiras linhas ou feições). ' +
  'Primeiro parágrafo: o que o dataset contém de facto, incluindo as colunas/atributos principais ' +
  'vistos na amostra e a que se referem. Segundo parágrafo: origem, cobertura, período e para que ' +
  'tipo de pergunta ou decisão este dataset é útil. Nunca inventes números, datas ou factos que ' +
  'não estejam nos metadados nem na amostra: se um campo estiver em falta, simplesmente não o ' +
  'menciones; se a amostra não puder ser lida, escreve o resumo só com os metadados. Nunca uses o ' +
  'travessão "—" no texto: usa ":" ou ";". Responde só com o texto do resumo, sem título nem markdown.'

export async function gerarResumoDataset(id: number): Promise<{ resumo: string }> {
  const dataset = await findDatasetById(id)
  if (!dataset) throw new Error('Dataset não encontrado')

  const metadados = [
    `Título: ${dataset.title}`,
    `Categoria: ${dataset.category?.name || 'N/D'}`,
    `Tipo: ${dataset.dataType}`,
    `Fonte: ${dataset.source || 'N/D'}`,
    `Ano: ${dataset.year || 'N/D'}`,
    `Formato: ${dataset.format || 'N/D'}`,
    dataset.coverage ? `Cobertura geográfica: ${dataset.coverage}` : null,
    dataset.minimumUnit ? `Unidade administrativa mínima: ${dataset.minimumUnit}` : null,
    dataset.keywords ? `Palavras-chave: ${dataset.keywords}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  // Amostra real do ficheiro (mesma lógica de sugerirMetadadosDataset): sem isto, o resumo só
  // parafraseava os metadados já visíveis na página, em vez de dizer algo que o admin ainda não
  // sabia sobre o conteúdo em si.
  let amostra = ''
  try {
    const preview = await getDatasetPreview(dataset, { maxRows: 15, maxFeatures: 15 })
    if ('type' in preview && preview.type === 'table') {
      amostra = `\nColunas do ficheiro: ${preview.columns.join(', ')}\nPrimeiras linhas:\n${preview.rows
        .slice(0, 5)
        .map((r) => r.join(' | '))
        .join('\n')}`
    } else if ('type' in preview && preview.type === 'geo') {
      const propriedadesExemplo = (preview.geojson?.features || []).slice(0, 2).map((f: any) => f?.properties || {})
      amostra = `\nTotal de feições: ${preview.featureCount}\nAtributos de exemplo:\n${JSON.stringify(propriedadesExemplo, null, 1)}`
    }
  } catch {
    /* sem amostra: o resumo segue só com os metadados, o próprio prompt já prevê este caso */
  }

  const cliente = getCliente()
  const resposta = await cliente.messages.create({
    model: modeloPara('suficiencia'),
    max_tokens: 900,
    system: SISTEMA_RESUMO,
    messages: [{ role: 'user', content: metadados + amostra }],
  } as any)

  const resumo = (resposta as any).content
    ?.filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')
    .trim() || ''

  if (!resumo) throw new Error('O modelo não devolveu nenhum resumo')

  await db.execute('UPDATE Dataset SET resumoIA = ?, resumoIAGeradoEm = NOW() WHERE id = ?', [resumo, id])
  return { resumo }
}

// ---------------------------------------------------------------------------
// Verificação de qualidade: checks determinísticos (não é o modelo a "adivinhar" qualidade — são
// contagens e intervalos reais). Reaproveita `getDatasetPreview` — o mesmo leitor já usado na
// pré-visualização do detalhe do dataset — para inspeccionar o conteúdo real de CSV, Excel
// (.xlsx/.xls/.ods via exceljs), GeoJSON e Shapefile (.zip via shpjs), em vez de só CSV como antes.
// Só fica de fora o que nenhuma biblioteca instalada neste portal sabe ler (ex.: GeoTIFF).
// ---------------------------------------------------------------------------

export type ResultadoQualidade = {
  nivel: 'ok' | 'aviso' | 'critico'
  avisos: string[]
  estatisticas: Record<string, unknown> | null
}

export type DadosParaQualidade = {
  filePath: string | null
  dataType: string
  description?: string | null
  source?: string | null
  year?: number | null
  keywords?: string | null
}

/** Núcleo da verificação, independente de o dataset já existir na base de dados: usado tanto pelo
 *  botão "Verificar qualidade" ao editar (verificarQualidadeDataset, abaixo) como pelo mesmo botão
 *  logo ao cadastrar, antes de "Criar Dataset" ser sequer clicado (o admin não precisa de guardar
 *  primeiro e só depois entrar em editar para saber se o ficheiro tem problemas). */
export async function verificarQualidadeConteudo(dataset: DadosParaQualidade): Promise<ResultadoQualidade> {
  const avisos: string[] = []
  if (!dataset.description || dataset.description.trim().length < 20) {
    avisos.push('Descrição em falta ou muito curta (menos de 20 caracteres).')
  }
  if (!dataset.source) avisos.push('Fonte não indicada.')
  if (!dataset.year) avisos.push('Ano não indicado.')
  if (!dataset.keywords) avisos.push('Sem palavras-chave: reduz a capacidade de descoberta na busca.')
  if (dataset.year && (dataset.year < 1990 || dataset.year > new Date().getFullYear() + 1)) {
    avisos.push(`Ano fora do intervalo plausível (${dataset.year}).`)
  }

  let estatisticas: Record<string, unknown> | null = null

  if (!dataset.filePath) {
    avisos.push('Nenhum ficheiro associado ainda: só é possível verificar os metadados.')
    return { nivel: avisos.length > 0 ? 'aviso' : 'ok', avisos, estatisticas }
  }

  try {
    const preview = await getDatasetPreview(
      { filePath: dataset.filePath, dataType: dataset.dataType },
      { maxRows: 5000, maxFeatures: 5000 }
    )

    if ('error' in preview) {
      avisos.push(`Não foi possível ler o ficheiro para verificação de conteúdo: ${preview.error}`)
    } else if (preview.type === 'table') {
      const { columns, rows } = preview
      const nulosPorColuna: Record<string, number> = {}
      columns.forEach((col, i) => {
        nulosPorColuna[col] = rows.filter((l) => !l[i] || l[i].trim() === '').length
      })

      const assinaturas = new Set(rows.map((l) => l.join('|')))
      const duplicados = rows.length - assinaturas.size

      estatisticas = {
        colunas: columns.length,
        linhas: rows.length,
        nulosPorColuna,
        linhasDuplicadas: duplicados,
      }

      const colunasComMuitosNulos = Object.entries(nulosPorColuna).filter(
        ([, n]) => rows.length > 0 && n / rows.length > 0.3
      )
      if (colunasComMuitosNulos.length > 0) {
        avisos.push(
          `${colunasComMuitosNulos.length} coluna(s) com mais de 30% de valores em falta: ${colunasComMuitosNulos.map(([c]) => c).join(', ')}.`
        )
      }
      if (duplicados > 0) {
        avisos.push(`${duplicados} linha(s) duplicada(s) encontrada(s).`)
      }
      if (rows.length === 0) {
        avisos.push('O ficheiro não tem nenhuma linha de dados.')
      }
    } else if (preview.type === 'geo') {
      const features: any[] = Array.isArray(preview.geojson?.features) ? preview.geojson.features : []
      const semGeometria = features.filter((f) => !f?.geometry).length
      const semAtributos = features.filter((f) => !f?.properties || Object.keys(f.properties).length === 0).length

      estatisticas = {
        feicoes: preview.featureCount,
        feicoesSemGeometria: semGeometria,
        feicoesSemAtributos: semAtributos,
        extensaoCalculada: Boolean(preview.bbox),
      }

      if (preview.featureCount === 0) {
        avisos.push('O ficheiro não tem nenhuma feição geográfica.')
      }
      if (semGeometria > 0) {
        avisos.push(`${semGeometria} feição/feições sem geometria válida.`)
      }
      if (!preview.bbox) {
        avisos.push('Não foi possível calcular a extensão geográfica (coordenadas em falta ou fora do intervalo esperado).')
      }
      if (features.length > 0 && semAtributos / features.length > 0.3) {
        avisos.push(`${semAtributos} feição/feições sem nenhum atributo preenchido.`)
      }
    }
  } catch (erro) {
    logger.error('erro_verificar_qualidade_conteudo', { error: erro, filePath: dataset.filePath })
    avisos.push('Não foi possível ler o ficheiro para verificação de conteúdo (ficheiro em falta ou inacessível).')
  }

  const nivel: ResultadoQualidade['nivel'] =
    avisos.some((a) => a.includes('em falta') && a.includes('ficheiro')) || avisos.length >= 4
      ? 'critico'
      : avisos.length > 0
        ? 'aviso'
        : 'ok'

  return { nivel, avisos, estatisticas }
}

/** Verificação de um dataset já guardado (botão "Verificar qualidade" ao editar) — busca os
 *  metadados actuais na base de dados e delega no núcleo partilhado acima. */
export async function verificarQualidadeDataset(id: number): Promise<ResultadoQualidade> {
  const dataset = await findDatasetById(id)
  if (!dataset) throw new Error('Dataset não encontrado')
  return verificarQualidadeConteudo(dataset)
}

// ---------------------------------------------------------------------------
// Pré-preenchimento de metadados ao cadastrar: sob pedido explícito do admin (botão "Sugerir com
// IA" logo após o upload, nunca automático), lê uma amostra do próprio ficheiro (reaproveitando o
// mesmo `getDatasetPreview` da pré-visualização) e propõe um rascunho de descrição, categoria e
// palavras-chave — o admin confirma ou corrige tudo antes de guardar, nunca é gravado sozinho.
// ---------------------------------------------------------------------------

export type SugestaoMetadados = {
  descricao: string
  categoriaSugerida: string | null
  palavrasChave: string
  coberturaSugerida: string | null
  geometriaSugerida: string | null
  unidadeMinimaSugerida: string | null
}

const ROTULO_GEOMETRIA: Record<string, string> = {
  Point: 'Pontos',
  MultiPoint: 'Pontos',
  LineString: 'Linhas',
  MultiLineString: 'Linhas',
  Polygon: 'Polígonos',
  MultiPolygon: 'Polígonos',
}

/** Tipo de geometria (pontos/linhas/polígonos): vem directamente do ficheiro já lido pelo
 *  `getDatasetPreview` — não há razão para pedir à IA para adivinhar algo que já sabemos ao certo. */
function detectarGeometria(geojson: any): string | null {
  const features = Array.isArray(geojson?.features) ? geojson.features : []
  const tipos = new Set<string>()
  for (const f of features.slice(0, 50)) {
    const tipo = f?.geometry?.type
    if (tipo && ROTULO_GEOMETRIA[tipo]) tipos.add(ROTULO_GEOMETRIA[tipo])
  }
  if (tipos.size === 0) return null
  return Array.from(tipos).join(' e ')
}

function sistemaSugestaoMetadados(categoriasExistentes: string[], dataType: string): string {
  const camposGeo =
    dataType === 'geoespacial'
      ? ' "unidade_minima" (escala ou resolução espacial sugerida a partir da amostra — ex.: "distrital", ' +
        '"1:50.000" — ou null se não for possível determinar; nunca inventes um número que não consigas ' +
        'justificar pelo conteúdo).'
      : ''
  return (
    'Vais propor um rascunho de metadados para um dataset de um portal de dados abertos de ' +
    'Moçambique, a partir de uma amostra real do conteúdo do ficheiro. Português de Moçambique. ' +
    `Categorias já existentes no portal (escolhe uma se fizer sentido, senão devolve null): ${categoriasExistentes.join(', ') || '(nenhuma)'}. ` +
    'Responde só com um objecto JSON, sem markdown, com exactamente estas chaves: ' +
    '"descricao" (2-3 frases, só com base no que vês na amostra, nunca inventes números ou factos ' +
    'que não estejam lá), "categoria" (uma das categorias existentes, ou null se nenhuma servir), ' +
    '"palavras_chave" (4-8 palavras separadas por vírgula, em português), "cobertura" (área ' +
    'geográfica sugerida a partir dos dados — ex.: nome de província visível nas colunas/atributos ' +
    `— ou null se não for possível determinar).${camposGeo} Nunca uses o travessão "—" em nenhum ` +
    'dos textos gerados: usa ":" ou ";".'
  )
}

export async function sugerirMetadadosDataset(params: {
  filePath: string
  dataType: string
  titulo?: string
  categoriasExistentes: string[]
}): Promise<SugestaoMetadados> {
  const preview = await getDatasetPreview(
    { filePath: params.filePath, dataType: params.dataType },
    { maxRows: 30, maxFeatures: 50 }
  )

  let amostra = ''
  let geometriaSugerida: string | null = null
  if ('error' in preview) {
    amostra = `(Não foi possível ler o conteúdo do ficheiro: ${preview.error} — sugere só com base no nome do ficheiro/título.)`
  } else if (preview.type === 'table') {
    amostra = `Colunas: ${preview.columns.join(', ')}\nPrimeiras linhas:\n${preview.rows
      .slice(0, 8)
      .map((r) => r.join(' | '))
      .join('\n')}`
  } else if (preview.type === 'geo') {
    geometriaSugerida = detectarGeometria(preview.geojson)
    const propriedadesExemplo = (preview.geojson?.features || []).slice(0, 3).map((f: any) => f?.properties || {})
    amostra = `Total de feições: ${preview.featureCount}\nTipo de geometria detectado: ${geometriaSugerida || 'desconhecido'}\nAtributos de exemplo:\n${JSON.stringify(propriedadesExemplo, null, 1)}`
  }

  const cliente = getCliente()
  const resposta = await cliente.messages.create({
    model: modeloPara('compreensao'),
    max_tokens: 500,
    system: sistemaSugestaoMetadados(params.categoriasExistentes, params.dataType),
    messages: [
      {
        role: 'user',
        content: `Título provisório: ${params.titulo?.trim() || '(ainda sem título)'}\nCaminho do ficheiro: ${params.filePath}\n\n${amostra}`,
      },
    ],
  } as any)

  const texto = (resposta as any).content
    ?.filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('') || '{}'
  const bloco = texto.match(/\{[\s\S]*\}/)?.[0] || '{}'

  let dados: any = {}
  try {
    dados = JSON.parse(bloco)
  } catch (erro) {
    logger.error('erro_parse_sugestao_metadados', { error: erro, texto })
  }

  return {
    descricao: typeof dados.descricao === 'string' ? dados.descricao.trim() : '',
    categoriaSugerida: typeof dados.categoria === 'string' ? dados.categoria.trim() : null,
    palavrasChave: typeof dados.palavras_chave === 'string' ? dados.palavras_chave.trim() : '',
    coberturaSugerida: typeof dados.cobertura === 'string' ? dados.cobertura.trim() : null,
    geometriaSugerida,
    unidadeMinimaSugerida: typeof dados.unidade_minima === 'string' ? dados.unidade_minima.trim() : null,
  }
}

// ---------------------------------------------------------------------------
// Detecção de duplicados/sobreposição ao cadastrar: comparação determinística (sem custo de IA) —
// sobreposição de palavras do título e mesma categoria/fonte — para avisar o admin antes de
// publicar algo muito parecido com o que já existe. Nunca bloqueia, só avisa.
// ---------------------------------------------------------------------------

export type DatasetSemelhante = {
  id: number
  title: string
  categoryName: string | null
  source: string | null
  similaridade: number
}

const PALAVRAS_IGNORADAS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'por', 'a', 'o', 'as', 'os',
  'no', 'na', 'nos', 'nas', 'dataset', 'dados', '2020', '2021', '2022', '2023', '2024', '2025', '2026',
])

function palavrasSignificativas(texto: string): Set<string> {
  return new Set(
    texto
      .toLowerCase()
      .normalize('NFD')
      .replace(new RegExp('[\u0300-\u036f]', 'g'), '')
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length > 2 && !PALAVRAS_IGNORADAS.has(p))
  )
}

export async function detectarDatasetsSemelhantes(params: {
  titulo: string
  categoryId: number | null
  source: string | null
  dataType: string
  excluirId?: number
}): Promise<DatasetSemelhante[]> {
  const palavrasAlvo = palavrasSignificativas(params.titulo)
  if (palavrasAlvo.size === 0) return []

  const condicoes: string[] = ['d.dataType = ?']
  const valores: any[] = [params.dataType]
  if (params.excluirId) {
    condicoes.push('d.id != ?')
    valores.push(params.excluirId)
  }
  // Restringe a candidatos plausíveis (mesma categoria OU mesma fonte) em vez de varrer o catálogo
  // inteiro — mais rápido, e evita "semelhanças" forçadas entre datasets sem nada em comum.
  const condicoesPlausibilidade: string[] = []
  if (params.categoryId) {
    condicoesPlausibilidade.push('d.categoryId = ?')
    valores.push(params.categoryId)
  }
  if (params.source?.trim()) {
    condicoesPlausibilidade.push('d.source = ?')
    valores.push(params.source.trim())
  }
  if (condicoesPlausibilidade.length > 0) {
    condicoes.push(`(${condicoesPlausibilidade.join(' OR ')})`)
  }

  const [rows] = (await db.execute(
    `SELECT d.id, d.title, d.source, c.name as categoryName
     FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id
     WHERE ${condicoes.join(' AND ')}
     LIMIT 200`,
    valores
  )) as [any[], unknown]

  const candidatos: DatasetSemelhante[] = []
  for (const r of rows) {
    const palavrasCandidato = palavrasSignificativas(r.title)
    const interseccao = Array.from(palavrasAlvo).filter((p) => palavrasCandidato.has(p))
    const uniao = new Set(Array.from(palavrasAlvo).concat(Array.from(palavrasCandidato)))
    const similaridade = uniao.size > 0 ? interseccao.length / uniao.size : 0
    if (similaridade >= 0.4) {
      candidatos.push({ id: r.id, title: r.title, categoryName: r.categoryName, source: r.source, similaridade })
    }
  }

  return candidatos.sort((a, b) => b.similaridade - a.similaridade).slice(0, 5)
}

// ---------------------------------------------------------------------------
// Alerta de anomalia entre versões: quando o ficheiro de um dataset é substituído, compara somas
// por coluna numérica entre a versão anterior e a nova — sem custo de IA, é aritmética directa
// sobre o conteúdo dos dois ficheiros. Diferente da verificação de qualidade (que olha só para o
// ficheiro actual, isolado): aqui o que interessa é a variação face ao que já lá estava.
// ---------------------------------------------------------------------------

const LIMIAR_VARIACAO_ANOMALA = 0.4 // 40%

export type AnomaliaVersao = { coluna: string; totalAnterior: number; totalNovo: number; variacaoPercentual: number }

function somasPorColunaNumerica(columns: string[], rows: string[][]): Record<string, number> {
  const somas: Record<string, number> = {}
  columns.forEach((col, i) => {
    let soma = 0
    let algumNumerico = false
    for (const linha of rows) {
      const valor = Number(String(linha[i] ?? '').replace(',', '.'))
      if (Number.isFinite(valor) && linha[i]?.trim() !== '') {
        soma += valor
        algumNumerico = true
      }
    }
    if (algumNumerico) somas[col] = soma
  })
  return somas
}

export async function compararValoresEntreVersoes(
  versaoAnterior: { filePath: string; dataType: string },
  versaoNova: { filePath: string; dataType: string }
): Promise<AnomaliaVersao[]> {
  // Só faz sentido para dados tabulares (CSV/Excel) — não há "soma de coluna" em Shapefile/GeoJSON.
  if (versaoAnterior.dataType !== 'alfanumerico' || versaoNova.dataType !== 'alfanumerico') return []
  if (versaoAnterior.filePath === versaoNova.filePath) return []

  try {
    const [previewAnterior, previewNovo] = await Promise.all([
      getDatasetPreview(versaoAnterior, { maxRows: 20000, maxFeatures: 0 }),
      getDatasetPreview(versaoNova, { maxRows: 20000, maxFeatures: 0 }),
    ])

    if (!('type' in previewAnterior) || previewAnterior.type !== 'table') return []
    if (!('type' in previewNovo) || previewNovo.type !== 'table') return []

    const somasAnteriores = somasPorColunaNumerica(previewAnterior.columns, previewAnterior.rows)
    const somasNovas = somasPorColunaNumerica(previewNovo.columns, previewNovo.rows)

    const anomalias: AnomaliaVersao[] = []
    for (const coluna of Object.keys(somasAnteriores)) {
      if (!(coluna in somasNovas)) continue
      const totalAnterior = somasAnteriores[coluna]
      const totalNovo = somasNovas[coluna]
      if (totalAnterior === 0) continue // divisão por zero: sem base para calcular variação percentual
      const variacaoPercentual = (totalNovo - totalAnterior) / Math.abs(totalAnterior)
      if (Math.abs(variacaoPercentual) >= LIMIAR_VARIACAO_ANOMALA) {
        anomalias.push({ coluna, totalAnterior, totalNovo, variacaoPercentual })
      }
    }
    return anomalias
  } catch (erro) {
    logger.error('erro_comparar_versoes_dataset', { error: erro })
    return []
  }
}
