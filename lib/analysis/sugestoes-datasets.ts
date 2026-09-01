import { db, createContactMessage } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getCliente, modeloPara } from './router'
import { palavrasChave } from './memoria'

/**
 * PLANO-SUGESTOES-DATASETS.md: transforma perguntas reais feitas ao AI Insights em sugestões de
 * datasets a criar. Nunca inventa: toda sugestão aponta para as perguntas reais que a motivam, e
 * nunca apresenta uma instituição-fonte como confirmada (skill `fontes`) — só como "a confirmar".
 *
 * Fase 2 (classificação por modelo) corre só sob pedido explícito do admin (nunca por carregamento
 * de página) e cacheia cada pergunta para sempre, mesmo padrão de rotulos_aprendidos.ts.
 */

let tabelaGarantida = false
async function garantirTabela() {
  if (tabelaGarantida) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS perguntas_classificadas (
      pergunta_hash VARCHAR(64) NOT NULL PRIMARY KEY,
      pergunta TEXT NOT NULL,
      tema VARCHAR(100) NOT NULL,
      dataset_ja_existe TINYINT(1) NOT NULL DEFAULT 0,
      entidade_nao_reconhecida VARCHAR(191) NULL,
      resumo_curto VARCHAR(255) NOT NULL,
      pergunta_criado_em DATETIME(3) NULL,
      criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  // Instalações antigas já têm a tabela sem esta coluna: ADD COLUMN IF NOT EXISTS é idempotente no
  // MariaDB, sem precisar de try/catch a engolir erros de coluna já existente.
  await db
    .execute(`ALTER TABLE perguntas_classificadas ADD COLUMN IF NOT EXISTS pergunta_criado_em DATETIME(3) NULL`)
    .catch(() => {})
  await db.execute(
    `CREATE TABLE IF NOT EXISTS sugestoes_datasets_estado (
      tema VARCHAR(100) NOT NULL PRIMARY KEY,
      estado VARCHAR(20) NOT NULL DEFAULT 'nova',
      titulo_proposto VARCHAR(191) NULL,
      marcado_por VARCHAR(191) NULL,
      marcado_em DATETIME(3) NULL,
      nivel_geografico_sugerido VARCHAR(100) NULL,
      resumo_externo TEXT NULL,
      fontes_externas JSON NULL,
      enriquecido_em DATETIME(3) NULL
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  await db
    .execute(`ALTER TABLE sugestoes_datasets_estado ADD COLUMN IF NOT EXISTS nivel_geografico_sugerido VARCHAR(100) NULL`)
    .catch(() => {})
  await db
    .execute(`ALTER TABLE sugestoes_datasets_estado ADD COLUMN IF NOT EXISTS resumo_externo TEXT NULL`)
    .catch(() => {})
  await db
    .execute(`ALTER TABLE sugestoes_datasets_estado ADD COLUMN IF NOT EXISTS fontes_externas JSON NULL`)
    .catch(() => {})
  await db
    .execute(`ALTER TABLE sugestoes_datasets_estado ADD COLUMN IF NOT EXISTS enriquecido_em DATETIME(3) NULL`)
    .catch(() => {})
  await db.execute(
    `CREATE TABLE IF NOT EXISTS sugestoes_tipos_categoria (
      categoriaId INT NOT NULL PRIMARY KEY,
      categoriaNome VARCHAR(191) NOT NULL,
      totalDatasets INT NOT NULL,
      tiposSugeridos JSON NOT NULL,
      geradoEm DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  tabelaGarantida = true
}

async function hashPergunta(texto: string): Promise<string> {
  const crypto = await import('crypto')
  return crypto.createHash('sha256').update(texto.trim().toLowerCase()).digest('hex')
}

type PerguntaBruta = { id: string; pergunta: string; criadoEm: Date }

async function todasAsPerguntas(): Promise<PerguntaBruta[]> {
  const [rows] = (await db.execute(
    `SELECT t.id, t.question as pergunta, t.createdAt as criadoEm FROM (
       SELECT CAST(id AS CHAR) as id, CONVERT(question USING utf8mb4) COLLATE utf8mb4_unicode_ci as question, createdAt FROM AIInsightQuery
       UNION ALL
       SELECT CAST(id AS CHAR) as id, CONVERT(pergunta USING utf8mb4) COLLATE utf8mb4_unicode_ci as question, criado_em as createdAt FROM analises WHERE pergunta IS NOT NULL AND pergunta != ''
     ) t
     ORDER BY t.createdAt DESC
     LIMIT 2000`
  )) as [any[], unknown]
  return rows.map((r) => ({ id: r.id, pergunta: r.pergunta, criadoEm: r.criadoEm }))
}

// ---------------------------------------------------------------------------
// Fase 1: vista bruta por palavra-chave, sem modelo nenhum.
// ---------------------------------------------------------------------------

export type GrupoPalavraChave = { palavra: string; total: number; exemplos: string[] }

export async function agruparPorPalavraChave(): Promise<GrupoPalavraChave[]> {
  const perguntas = await todasAsPerguntas()
  const contagem = new Map<string, { total: number; exemplos: string[] }>()
  for (const p of perguntas) {
    const chaves = palavrasChave(p.pergunta)
    for (const chave of Array.from(new Set(chaves))) {
      const actual = contagem.get(chave) || { total: 0, exemplos: [] }
      actual.total++
      if (actual.exemplos.length < 3) actual.exemplos.push(p.pergunta)
      contagem.set(chave, actual)
    }
  }
  return Array.from(contagem.entries())
    .map(([palavra, v]) => ({ palavra, total: v.total, exemplos: v.exemplos }))
    .filter((g) => g.total >= 2)
    .sort((a, b) => b.total - a.total)
    .slice(0, 60)
}

// ---------------------------------------------------------------------------
// Fase 2: classificação por modelo, cacheada para sempre por pergunta.
// ---------------------------------------------------------------------------

type Classificacao = {
  tema: string
  dataset_ja_existe: boolean
  entidade_nao_reconhecida: string | null
  resumo_curto: string
}

const SISTEMA_CLASSIFICACAO =
  'Classificas perguntas feitas por utilizadores a um assistente de análise de dados geoespaciais ' +
  'e estatísticos de Moçambique. Para cada pergunta, indica: "tema" (um domínio curto em minúsculas, ' +
  'ex.: "turismo", "agricultura", "saude", "transportes", "educacao", "energia", "agua_saneamento", ' +
  '"comercio", "clima", "populacao", "seguranca", "ambiente", "outro"); "dataset_ja_existe" (true se a ' +
  'pergunta parece já coberta por um dataset típico de um portal de dados abertos geral, false se ' +
  'parece pedir um tema de dados que normalmente não estaria coberto); "entidade_nao_reconhecida" ' +
  '(nome de lugar/instalação citado que pode não ter batido certo com nenhuma unidade administrativa ' +
  'ou dataset, ou null se não há nenhum caso desses óbvio); "resumo_curto" (até 12 palavras, em ' +
  'português de Moçambique, resumindo o que foi pedido). Nunca inventes cobertura de dataset que não ' +
  'tens forma de confirmar: na dúvida, dataset_ja_existe = false. Nunca uses o travessão "—" em ' +
  'nenhum texto: usa ":" ou ";". Responde só com um array JSON de objectos na mesma ordem das ' +
  'perguntas recebidas, um por pergunta, sem mais texto nenhum.'

async function classificarLote(perguntas: string[]): Promise<Classificacao[]> {
  const cliente = getCliente()
  const resposta = await cliente.messages.create({
    model: modeloPara('suficiencia'),
    max_tokens: 4096,
    system: SISTEMA_CLASSIFICACAO,
    messages: [{ role: 'user', content: perguntas.map((p, i) => `${i + 1}. ${p}`).join('\n') }],
  } as any)
  const texto = (resposta as any).content
    ?.filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('') || '[]'
  const bloco = texto.match(/\[[\s\S]*\]/)?.[0] || '[]'
  const lista = JSON.parse(bloco)
  return Array.isArray(lista) ? lista : []
}

/** Classifica todas as perguntas ainda não classificadas. Corre só sob pedido explícito (botão de
 *  admin), nunca por carregamento de página normal. Devolve quantas foram classificadas agora. */
export async function classificarPerguntasPendentes(): Promise<{ classificadasAgora: number; total: number }> {
  await garantirTabela()
  const perguntas = await todasAsPerguntas()
  const [jaClassificadas] = (await db.execute(`SELECT pergunta_hash FROM perguntas_classificadas`)) as [
    any[],
    unknown,
  ]
  const hashesConhecidos = new Set(jaClassificadas.map((r) => r.pergunta_hash))

  const pendentes: PerguntaBruta[] = []
  for (const p of perguntas) {
    const texto = p.pergunta?.trim()
    if (!texto) continue
    const hash = await hashPergunta(texto)
    if (!hashesConhecidos.has(hash)) pendentes.push(p)
  }

  const TAMANHO_LOTE = 25
  let classificadasAgora = 0
  for (let i = 0; i < pendentes.length; i += TAMANHO_LOTE) {
    const lote = pendentes.slice(i, i + TAMANHO_LOTE)
    try {
      const classificacoes = await classificarLote(lote.map((p) => p.pergunta))
      for (let j = 0; j < lote.length; j++) {
        const c = classificacoes[j]
        if (!c || !c.tema || !c.resumo_curto) continue
        const hash = await hashPergunta(lote[j].pergunta)
        await db
          .execute(
            `INSERT IGNORE INTO perguntas_classificadas
             (pergunta_hash, pergunta, tema, dataset_ja_existe, entidade_nao_reconhecida, resumo_curto, pergunta_criado_em)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              hash,
              lote[j].pergunta,
              String(c.tema).toLowerCase().trim().slice(0, 100),
              c.dataset_ja_existe ? 1 : 0,
              c.entidade_nao_reconhecida ? String(c.entidade_nao_reconhecida).slice(0, 191) : null,
              String(c.resumo_curto).slice(0, 255),
              lote[j].criadoEm,
            ]
          )
          .catch(() => {})
        classificadasAgora++
      }
    } catch (erro) {
      logger.error('erro_classificar_lote_sugestoes_datasets', { error: erro, tamanhoLote: lote.length })
    }
  }

  return { classificadasAgora, total: perguntas.length }
}

// ---------------------------------------------------------------------------
// Fase 3: cruzamento com o catálogo e sugestão final.
// ---------------------------------------------------------------------------

export type FonteExterna = { titulo: string; url: string }

export type SugestaoDataset = {
  tema: string
  totalPerguntas: number
  totalSemCobertura: number
  entidadesNaoReconhecidas: string[]
  perguntasExemplo: string[]
  jaCobertoNoCatalogo: boolean
  emAvaliacao: boolean
  tendenciaSemanal: number[]
  nivelGeograficoSugerido: string | null
  resumoExterno: string | null
  fontesExternas: FonteExterna[]
  enriquecidoEm: string | null
}

const LIMIAR_CONTAGEM = 3
const SEMANAS_TENDENCIA = 8

/** Conta perguntas por semana (últimas SEMANAS_TENDENCIA), mais antiga primeiro, para um sparkline. */
function tendenciaSemanal(datas: (Date | string | null)[]): number[] {
  const agora = Date.now()
  const semanaMs = 7 * 24 * 60 * 60 * 1000
  const baldes = new Array(SEMANAS_TENDENCIA).fill(0)
  for (const d of datas) {
    if (!d) continue
    const tempo = new Date(d).getTime()
    if (Number.isNaN(tempo)) continue
    const semanasAtras = Math.floor((agora - tempo) / semanaMs)
    const indice = SEMANAS_TENDENCIA - 1 - semanasAtras
    if (indice >= 0 && indice < SEMANAS_TENDENCIA) baldes[indice]++
  }
  return baldes
}

export async function gerarSugestoes(): Promise<{
  sugestoes: SugestaoDataset[]
  temasCobertos: { tema: string; total: number; jaCoberto: boolean }[]
  totalPerguntasClassificadas: number
}> {
  await garantirTabela()
  const [linhas] = (await db.execute(
    `SELECT tema, dataset_ja_existe, entidade_nao_reconhecida, resumo_curto, pergunta, pergunta_criado_em, criado_em
     FROM perguntas_classificadas ORDER BY criado_em DESC`
  )) as [any[], unknown]

  const [categorias] = (await db.execute(`SELECT name FROM Category`)) as [any[], unknown]
  const nomesCategorias = categorias.map((c: any) => palavrasChave(c.name))

  const [estados] = (await db.execute(
    `SELECT tema, estado, nivel_geografico_sugerido, resumo_externo, fontes_externas, enriquecido_em
     FROM sugestoes_datasets_estado`
  )) as [any[], unknown]
  const estadoPorTema = new Map(estados.map((e: any) => [e.tema, e]))

  const porTema = new Map<
    string,
    { total: number; semCobertura: number; entidades: Set<string>; perguntas: string[]; datas: (Date | string)[] }
  >()
  for (const l of linhas) {
    const actual =
      porTema.get(l.tema) || { total: 0, semCobertura: 0, entidades: new Set<string>(), perguntas: [], datas: [] }
    actual.total++
    if (!l.dataset_ja_existe) actual.semCobertura++
    if (l.entidade_nao_reconhecida) actual.entidades.add(l.entidade_nao_reconhecida)
    if (actual.perguntas.length < 5) actual.perguntas.push(l.pergunta)
    actual.datas.push(l.pergunta_criado_em || l.criado_em)
    porTema.set(l.tema, actual)
  }

  const temasCobertos: { tema: string; total: number; jaCoberto: boolean }[] = []
  const sugestoes: SugestaoDataset[] = []

  for (const [tema, dados] of Array.from(porTema.entries())) {
    const chavesTema = palavrasChave(tema)
    const jaCoberto = nomesCategorias.some((chavesCat) =>
      chavesCat.some((c) => chavesTema.some((t) => c.includes(t) || t.includes(c)))
    )
    temasCobertos.push({ tema, total: dados.total, jaCoberto })

    if (dados.semCobertura >= LIMIAR_CONTAGEM && !jaCoberto) {
      const estado = estadoPorTema.get(tema)
      let fontesExternas: FonteExterna[] = []
      if (estado?.fontes_externas) {
        try {
          fontesExternas = typeof estado.fontes_externas === 'string'
            ? JSON.parse(estado.fontes_externas)
            : estado.fontes_externas
        } catch {
          fontesExternas = []
        }
      }
      sugestoes.push({
        tema,
        totalPerguntas: dados.total,
        totalSemCobertura: dados.semCobertura,
        entidadesNaoReconhecidas: Array.from(dados.entidades),
        perguntasExemplo: dados.perguntas,
        jaCobertoNoCatalogo: false,
        emAvaliacao: estado?.estado === 'em_avaliacao',
        tendenciaSemanal: tendenciaSemanal(dados.datas),
        nivelGeograficoSugerido: estado?.nivel_geografico_sugerido || null,
        resumoExterno: estado?.resumo_externo || null,
        fontesExternas,
        enriquecidoEm: estado?.enriquecido_em ? new Date(estado.enriquecido_em).toISOString() : null,
      })
    }
  }

  sugestoes.sort((a, b) => b.totalSemCobertura - a.totalSemCobertura)
  temasCobertos.sort((a, b) => b.total - a.total)

  return { sugestoes, temasCobertos, totalPerguntasClassificadas: linhas.length }
}

// ---------------------------------------------------------------------------
// Fase 5: por categoria com pouca cobertura, não só "falta cobertura" mas QUE TIPO concreto de
// dataset vale a pena cadastrar — a parte que faltava para isto ser realmente accionável.
// ---------------------------------------------------------------------------

export type SugestaoTipoCategoria = {
  categoriaId: number
  categoria: string
  totalDatasets: number
  tiposSugeridos: string[]
  perguntasRelacionadas: number
  geradoEm: string | null
}

const LIMIAR_POUCA_COBERTURA = 3

const SISTEMA_TIPOS_CATEGORIA =
  'Sugeres tipos concretos de dataset (geoespacial ou alfanumérico) que um portal de dados abertos ' +
  'de Moçambique devia ter numa categoria temática, para reforçar uma cobertura ainda fraca. Recebes ' +
  'o nome da categoria, quantos datasets já lá existem, e (quando houver) perguntas reais que ' +
  'utilizadores já fizeram sobre este tema e que o portal não conseguiu responder bem. Sugere de 3 a ' +
  '5 tipos de dataset especificos e accionáveis (ex.: não "mais dados de saúde", mas "localização e ' +
  'capacidade das unidades sanitárias por distrito" ou "cobertura de vacinação infantil por ' +
  'província"), priorizando os que respondem às perguntas reais fornecidas quando existirem. Nunca ' +
  'inventes que uma instituição já publica isto — isso é sempre uma decisão humana posterior, não ' +
  'tua. Nunca uses o travessão "—" em nenhum texto: usa ":" ou ";". Responde só com um array JSON ' +
  'de strings, cada uma um tipo de dataset sugerido, sem mais texto nenhum.'

async function sugerirTiposParaCategoria(
  categoria: string,
  totalDatasets: number,
  perguntasContexto: string[]
): Promise<string[]> {
  const cliente = getCliente()
  const contexto = [
    `Categoria: ${categoria}`,
    `Datasets já existentes nesta categoria: ${totalDatasets}`,
    perguntasContexto.length > 0
      ? `Perguntas reais de utilizadores relacionadas com este tema, ainda mal respondidas:\n${perguntasContexto.map((p) => `- ${p}`).join('\n')}`
      : 'Sem perguntas de utilizadores directamente relacionadas registadas até agora.',
  ].join('\n\n')

  const resposta = await cliente.messages.create({
    model: modeloPara('suficiencia'),
    max_tokens: 1024,
    system: SISTEMA_TIPOS_CATEGORIA,
    messages: [{ role: 'user', content: contexto }],
  } as any)

  const texto = (resposta as any).content
    ?.filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('') || '[]'
  const bloco = texto.match(/\[[\s\S]*\]/)?.[0] || '[]'
  try {
    const lista = JSON.parse(bloco)
    return Array.isArray(lista) ? lista.filter((t) => typeof t === 'string').slice(0, 5) : []
  } catch (erro) {
    logger.error('erro_parse_tipos_categoria', { error: erro, categoria })
    return []
  }
}

/** Para cada categoria com poucos datasets, gera tipos concretos de dataset a cadastrar, cruzando
 *  com perguntas reais já classificadas sobre o mesmo tema quando existirem. Corre só sob pedido
 *  explícito (mesmo botão "Actualizar sugestões"), nunca automaticamente. */
export async function gerarSugestoesTiposPorCategoria(): Promise<{ categoriasAnalisadas: number }> {
  await garantirTabela()

  const [categorias] = (await db.execute(
    `SELECT c.id, c.name, COUNT(d.id) as total
     FROM Category c LEFT JOIN Dataset d ON d.categoryId = c.id
     GROUP BY c.id, c.name`
  )) as [{ id: number; name: string; total: number }[], unknown]

  const [perguntas] = (await db.execute(
    `SELECT tema, pergunta FROM perguntas_classificadas WHERE dataset_ja_existe = 0`
  )) as [{ tema: string; pergunta: string }[], unknown]

  const poucaCobertura = categorias.filter((c) => Number(c.total) < LIMIAR_POUCA_COBERTURA)
  let categoriasAnalisadas = 0

  for (const categoria of poucaCobertura) {
    try {
      const chavesCategoria = palavrasChave(categoria.name)
      const perguntasRelacionadas = perguntas
        .filter((p) => {
          const chavesTema = palavrasChave(p.tema)
          return chavesTema.some((t) => chavesCategoria.some((c) => c.includes(t) || t.includes(c)))
        })
        .map((p) => p.pergunta)
        .slice(0, 6)

      const tipos = await sugerirTiposParaCategoria(categoria.name, Number(categoria.total), perguntasRelacionadas)
      if (tipos.length === 0) continue

      await db.execute(
        `INSERT INTO sugestoes_tipos_categoria (categoriaId, categoriaNome, totalDatasets, tiposSugeridos, geradoEm)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE categoriaNome = VALUES(categoriaNome), totalDatasets = VALUES(totalDatasets),
           tiposSugeridos = VALUES(tiposSugeridos), geradoEm = VALUES(geradoEm)`,
        [categoria.id, categoria.name, categoria.total, JSON.stringify(tipos)]
      )
      categoriasAnalisadas++
    } catch (erro) {
      logger.error('erro_gerar_tipos_categoria', { error: erro, categoria: categoria.name })
    }
  }

  return { categoriasAnalisadas }
}

export async function listarSugestoesTiposPorCategoria(): Promise<SugestaoTipoCategoria[]> {
  await garantirTabela()

  const [perguntas] = (await db.execute(
    `SELECT tema, COUNT(*) as total FROM perguntas_classificadas WHERE dataset_ja_existe = 0 GROUP BY tema`
  )) as [{ tema: string; total: number }[], unknown]

  const [linhas] = (await db.execute(
    `SELECT categoriaId, categoriaNome, totalDatasets, tiposSugeridos, geradoEm FROM sugestoes_tipos_categoria`
  )) as [any[], unknown]

  return linhas
    .map((l) => {
      const chavesCategoria = palavrasChave(l.categoriaNome)
      const perguntasRelacionadas = perguntas
        .filter((p) => {
          const chavesTema = palavrasChave(p.tema)
          return chavesTema.some((t) => chavesCategoria.some((c) => c.includes(t) || t.includes(c)))
        })
        .reduce((soma, p) => soma + Number(p.total), 0)

      let tiposSugeridos: string[] = []
      try {
        tiposSugeridos = typeof l.tiposSugeridos === 'string' ? JSON.parse(l.tiposSugeridos) : l.tiposSugeridos
      } catch {
        tiposSugeridos = []
      }

      return {
        categoriaId: l.categoriaId,
        categoria: l.categoriaNome,
        totalDatasets: Number(l.totalDatasets),
        tiposSugeridos,
        perguntasRelacionadas,
        geradoEm: l.geradoEm ? new Date(l.geradoEm).toISOString() : null,
      }
    })
    .sort((a, b) => b.perguntasRelacionadas - a.perguntasRelacionadas || a.totalDatasets - b.totalDatasets)
}

// ---------------------------------------------------------------------------
// Fase 4: acção — liga a sugestão ao fluxo de pedidos já existente (Serviços → Contacto),
// em vez de inventar um fluxo de aprovação novo.
// ---------------------------------------------------------------------------

/** Marca um tema como "em avaliação": cria uma mensagem de contacto real (mesma tabela usada pelo
 *  formulário de Serviços) para que fique visível no painel de solicitações do admin, e regista o
 *  estado localmente para não deixar marcar o mesmo tema duas vezes. Nunca corre automaticamente —
 *  só quando um admin carrega no botão, depois de ver as perguntas reais por trás da sugestão. */
export async function marcarSugestaoEmAvaliacao(
  tema: string,
  sugestao: SugestaoDataset,
  admin: { name?: string | null; email: string }
): Promise<void> {
  await garantirTabela()

  const tituloProposto = `Sugestão de dataset: ${tema.replace(/_/g, ' ')}`
  const corpo = [
    `Tema identificado a partir de ${sugestao.totalPerguntas} pergunta(s) feita(s) ao AI Insights, ` +
      `${sugestao.totalSemCobertura} sem cobertura conhecida no catálogo actual.`,
    sugestao.entidadesNaoReconhecidas.length > 0
      ? `Entidades citadas sem correspondência clara: ${sugestao.entidadesNaoReconhecidas.join(', ')}.`
      : null,
    'Fonte institucional provável: a confirmar por uma pessoa antes de qualquer publicação.',
    '',
    'Perguntas reais que motivam esta sugestão:',
    ...sugestao.perguntasExemplo.map((p) => `- "${p}"`),
  ]
    .filter(Boolean)
    .join('\n')

  await createContactMessage({
    name: admin.name || admin.email,
    email: admin.email,
    subject: tituloProposto,
    message: corpo,
    purpose: 'sugestao_dataset',
  })

  await db.execute(
    `INSERT INTO sugestoes_datasets_estado (tema, estado, titulo_proposto, marcado_por, marcado_em)
     VALUES (?, 'em_avaliacao', ?, ?, NOW())
     ON DUPLICATE KEY UPDATE estado = 'em_avaliacao', titulo_proposto = VALUES(titulo_proposto),
       marcado_por = VALUES(marcado_por), marcado_em = VALUES(marcado_em)`,
    [tema, tituloProposto, admin.email]
  )
}

// ---------------------------------------------------------------------------
// Enriquecimento por pesquisa externa: sob pedido explícito por sugestão, nunca em lote nem
// automático. Usa o web search do próprio Claude para trazer fontes REAIS (nunca inventadas) sobre
// o tema em Moçambique — continua rotulado "a confirmar" (skill `fontes`): pesquisa externa reduz
// trabalho de validação, não substitui uma pessoa a confirmar antes de publicar.
// ---------------------------------------------------------------------------

const SISTEMA_ENRIQUECIMENTO =
  'Pesquisas na internet por fontes de dados reais sobre um tema em Moçambique, para ajudar a ' +
  'decidir se vale a pena criar um dataset novo no portal. Depois de pesquisar, responde só com um ' +
  'objecto JSON: {"nivel_geografico_sugerido": string (ex.: "distrito", "provincia", "posto ' +
  'administrativo"), "resumo_externo": string (até 40 palavras, português de Moçambique, resumindo ' +
  'o que existe de facto sobre o tema e se parece haver instituição moçambicana com dados sobre ' +
  'isto), "fontes": [{"titulo": string, "url": string}]}. Em "fontes", inclui só resultados REAIS ' +
  'que a pesquisa devolveu, nunca inventes uma URL ou título. Se a pesquisa não encontrar nada ' +
  'relevante, devolve "fontes": [] e diz isso mesmo no resumo, em vez de inventar. Nada disto é ' +
  'confirmação final, é só um ponto de partida para uma pessoa validar depois. Nunca uses o ' +
  'travessão "—" no resumo: usa ":" ou ";".'

/** Pesquisa fontes externas reais para um tema sugerido e guarda o resultado, sob pedido explícito
 *  de um admin por sugestão (nunca corre em lote nem automaticamente). */
export async function enriquecerComFontesExternas(
  tema: string,
  sugestao: Pick<SugestaoDataset, 'tema' | 'perguntasExemplo'>
): Promise<{ nivelGeograficoSugerido: string | null; resumoExterno: string; fontesExternas: FonteExterna[] }> {
  await garantirTabela()

  const cliente = getCliente()
  const resposta = await cliente.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 2048,
    system: SISTEMA_ENRIQUECIMENTO,
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 4 } as any],
    messages: [
      {
        role: 'user',
        content:
          `Tema: ${tema.replace(/_/g, ' ')}. Exemplos de perguntas reais feitas por utilizadores sobre ` +
          `este tema:\n${sugestao.perguntasExemplo.map((p) => `- ${p}`).join('\n')}`,
      },
    ],
  } as any)

  // A ferramenta de pesquisa pode falhar do lado do fornecedor (rede, limite, indisponibilidade)
  // sem que a chamada em si dê erro — o modelo simplesmente recebe um bloco de erro da ferramenta
  // e continua, muitas vezes explicando isso em prosa no resumo. Sem esta verificação, essa
  // explicação ficava gravada como se fosse um resultado válido, e o admin só saberia que a
  // pesquisa tinha falhado se lesse o texto com atenção.
  const falhaFerramenta = ((resposta as any).content || []).some(
    (b: any) => b.type === 'web_search_tool_result' && b.content?.type === 'web_search_tool_result_error'
  )
  if (falhaFerramenta) {
    throw new Error('A pesquisa externa falhou do lado do fornecedor. Tente novamente dentro de instantes.')
  }

  const texto = (resposta as any).content
    ?.filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('') || '{}'
  const bloco = texto.match(/\{[\s\S]*\}/)?.[0] || '{}'
  let dados: any = {}
  try {
    dados = JSON.parse(bloco)
  } catch (erro) {
    logger.error('erro_parse_enriquecimento_sugestao', { error: erro, tema })
  }

  const nivelGeograficoSugerido = typeof dados.nivel_geografico_sugerido === 'string' ? dados.nivel_geografico_sugerido : null
  const resumoExterno = typeof dados.resumo_externo === 'string' ? dados.resumo_externo : 'Sem resumo disponível.'
  const fontesExternas: FonteExterna[] = Array.isArray(dados.fontes)
    ? dados.fontes
        .filter((f: any) => f && typeof f.url === 'string' && typeof f.titulo === 'string')
        .slice(0, 6)
    : []

  // Segunda rede de segurança: mesmo sem um bloco de erro explícito da ferramenta, se o próprio
  // modelo descreveu uma falha técnica em vez de um resumo real, também não se grava como sucesso
  // — evita um resultado enganoso ficar preso na sugestão até alguém reparar e voltar a pesquisar.
  const pareceFalhaNarrada = /falha t[ée]cnica|n[ãa]o foi poss[ií]vel concluir a pesquisa/i.test(resumoExterno)
  if (pareceFalhaNarrada && fontesExternas.length === 0) {
    throw new Error('A pesquisa externa não conseguiu concluir desta vez. Tente novamente dentro de instantes.')
  }

  await db.execute(
    `INSERT INTO sugestoes_datasets_estado (tema, titulo_proposto, nivel_geografico_sugerido, resumo_externo, fontes_externas, enriquecido_em)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE nivel_geografico_sugerido = VALUES(nivel_geografico_sugerido),
       resumo_externo = VALUES(resumo_externo), fontes_externas = VALUES(fontes_externas), enriquecido_em = VALUES(enriquecido_em)`,
    [tema, `Sugestão de dataset: ${tema.replace(/_/g, ' ')}`, nivelGeograficoSugerido, resumoExterno, JSON.stringify(fontesExternas)]
  )

  return { nivelGeograficoSugerido, resumoExterno, fontesExternas }
}
