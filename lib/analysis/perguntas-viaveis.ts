import { createHash } from 'crypto'
import { db, findDatasetsByIds } from '@/lib/db'
import { catalogoParaPrompt, existeMetodo } from './library'
import { chamarEstagio } from './router'
import { criarContexto, type ContextoExecucao } from './executor'
import { obterPerfilDataset, formatarPerfilParaPrompt } from './perfil'
import { coberturaChegaPara, limparTextoVisivel } from './viabilidade'
import { PROMPT_PERGUNTAS_VIAVEIS, SCHEMA_PERGUNTAS_VIAVEIS } from './prompts'
import { logger } from '@/lib/logger'
import type { PerguntaViavel } from './types'

/**
 * Perguntas que uma selecção de datasets responde bem.
 *
 * Serve dois sítios com o mesmo mecanismo: o ecrã que aparece quando o motor recusa uma pergunta
 * (dar saída ao utilizador em vez de o deixar num beco) e, mais tarde, a sugestão proactiva assim
 * que ele escolhe os datasets.
 *
 * O que torna estas sugestões confiáveis não é o modelo ser bom a inventá-las: é o modelo ser
 * obrigado a declarar COMO cada uma se responde (colunas, método, nível geográfico) e o código
 * verificar essa declaração contra a estrutura real antes de a mostrar. Uma sugestão que o
 * utilizador clica e que depois falha seria pior do que não sugerir nada, porque quebra a única
 * promessa que este ecrã faz.
 */

const MAX_PERGUNTAS = 6
const MIN_PERGUNTAS_UTEIS = 2

/**
 * Colunas que nunca podem ser objecto de análise, em nenhuma posição.
 *
 * São artefactos: identificadores opacos e medidas da própria geometria do ficheiro (perímetro,
 * área do polígono). Não medem nada do país, mas são numéricas, por isso passam por qualquer
 * validação estatística e produzem correlações que parecem resultados. Verificado ao vivo: saiu
 * uma sugestão a correlacionar o perímetro do polígono provincial com o número de crianças com
 * menos de um ano, que é ruído com aspecto de achado.
 */
const PADRAO_COLUNA_ARTEFACTO =
  /^(fid\d*|objectid\w*|osm_id|osm_type|record_id|layer_no|shape_\w*|geometry|the_geom)$/i

/**
 * Colunas de apoio: códigos de ligação, proveniência e notas. Podem entrar numa pergunta como
 * chave, mas uma pergunta feita SÓ delas é sobre a contabilidade do ficheiro, não sobre o país.
 */
const PADRAO_COLUNA_APOIO = /(_pcode|codigo|_cod|_code)$|^(source|fonte|dq_tier|notes|layer_name|variable_id|classifica\w*)$/i

function colunaArtefacto(coluna: string): boolean {
  return PADRAO_COLUNA_ARTEFACTO.test(coluna.trim())
}

function apenasColunasDeApoio(colunas: string[]): boolean {
  return colunas.every((c) => PADRAO_COLUNA_APOIO.test(c.trim()) || colunaArtefacto(c))
}

let tabelaGarantida = false

async function garantirTabela() {
  if (tabelaGarantida) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS dataset_perguntas_viaveis (
      chave VARCHAR(64) NOT NULL,
      validade VARCHAR(255) NOT NULL,
      perguntas LONGTEXT NOT NULL,
      criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (chave)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  tabelaGarantida = true
}

/** Chave estável por combinação de datasets, independente da ordem em que foram seleccionados. */
function chaveCombinacao(datasetIds: number[]): string {
  return createHash('sha1').update(Array.from(new Set(datasetIds)).sort((a, b) => a - b).join('-')).digest('hex')
}

/**
 * Token de validade: muda quando qualquer dataset da combinação for actualizado, invalidando o
 * cache sem precisar de o apagar à mão. Mesmo princípio de `dataset_perfis`.
 */
async function tokenValidade(datasetIds: number[]): Promise<string> {
  const datasets = await findDatasetsByIds(datasetIds)
  return datasets
    .map((d: any) => `${d.id}:${String(d.updatedAt || '')}`)
    .sort()
    .join('|')
    .slice(0, 255)
}

function normalizarNome(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
    .trim()
}

const PALAVRAS_VAZIAS = new Set([
  'para', 'como', 'qual', 'quais', 'quanto', 'quantos', 'quantas', 'onde', 'entre', 'cada',
  'existe', 'existem', 'sobre', 'pelos', 'pelas', 'dos', 'das', 'com', 'sem', 'que', 'the',
  'esta', 'este', 'estes', 'estas', 'seus', 'suas', 'mais', 'menos', 'muito', 'pouco',
  'dados', 'dataset', 'total', 'valor', 'valores', 'numero', 'segundo', 'nivel',
])

function termosRelevantes(texto: string): Set<string> {
  return new Set(
    normalizarNome(texto)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4 && !PALAVRAS_VAZIAS.has(t))
  )
}

/**
 * Aproxima as sugestões do que a pessoa realmente queria saber.
 *
 * O conjunto é gerado a partir dos datasets, sem saber a pergunta (é o que permite guardá-lo em
 * cache e reutilizá-lo no ecrã de selecção). Sem esta ordenação, alguém que perguntou por
 * população via como primeira alternativa uma pergunta sobre outra coisa qualquer do mesmo
 * ficheiro, e a lista parecia não ter percebido nada do que foi pedido.
 *
 * A pontuação é por palavras partilhadas, feita em código: é instantânea, não custa nada e não
 * arrisca reordenar mal por causa de mais uma chamada ao modelo. Nenhuma sugestão é removida por
 * ter pontuação zero: elas foram todas verificadas contra os dados, e ficar sem alternativas é
 * pior do que ver uma alternativa menos próxima no fim da lista.
 */
export function ordenarPorProximidade(perguntas: PerguntaViavel[], perguntaOriginal: string): PerguntaViavel[] {
  const alvo = termosRelevantes(perguntaOriginal)
  if (alvo.size === 0) return perguntas

  const pontuar = (p: PerguntaViavel) => {
    const termos = termosRelevantes(`${p.pergunta} ${p.porque}`)
    let comuns = 0
    for (const t of Array.from(alvo)) if (termos.has(t)) comuns++
    return comuns / alvo.size
  }

  // Nunca reoferecer a pergunta que acabou de ser recusada. Visto ao vivo: o utilizador clicou
  // numa sugestão, ela foi bloqueada, e reapareceu na lista do próprio ecrã de bloqueio. Além de
  // parecer avaria, convida-o a repetir o mesmo caminho.
  const quaseIgual = (p: PerguntaViavel) => {
    const termos = termosRelevantes(p.pergunta)
    if (termos.size === 0) return false
    let comuns = 0
    for (const t of Array.from(termos)) if (alvo.has(t)) comuns++
    const cobertura = comuns / Math.max(termos.size, alvo.size)
    return cobertura >= 0.8 || normalizarNome(p.pergunta) === normalizarNome(perguntaOriginal)
  }

  return perguntas
    .filter((p) => !quaseIgual(p))
    .map((p) => ({ p, s: pontuar(p) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p)
}

/**
 * Anos que aparecem escritos numa pergunta ("entre 2015 e 2024" -> 2015, 2024).
 */
export function anosCitados(texto: string): number[] {
  return Array.from(new Set((texto.match(/\b(19|20)\d{2}\b/g) || []).map(Number)))
}

/**
 * Anos que têm mesmo valores preenchidos, por tabela.
 *
 * Um ano pode estar na coluna e não ter dado nenhum: no ficheiro de cereais, 2015 a 2018 estão lá
 * e estão vazios para o milho. Uma sugestão que prometa "entre 2015 e 2024" nesse ficheiro é
 * recusada assim que o utilizador a clica, e ele fica a olhar para uma alternativa que o motor lhe
 * ofereceu e a seguir recusou.
 */
export function anosComDados(ctx: ContextoExecucao): Set<number> {
  const anos = new Set<number>()
  for (const tabela of Array.from(ctx.tabelas.values())) {
    const iTempo = tabela.colunas.findIndex((c) => /(^|_|\s)(ano|year|periodo)($|_|\s)/i.test(c))
    if (iTempo === -1) continue
    const iValor = tabela.colunas.findIndex((c) => /^(value|valor|quantidade|total)$/i.test(c.trim()))
    for (const linha of tabela.linhas) {
      if (iValor !== -1 && String(linha[iValor] ?? '').trim() === '') continue
      const ano = Number(String(linha[iTempo] ?? '').trim())
      if (Number.isFinite(ano) && ano > 1900) anos.add(ano)
    }
  }
  return anos
}

/**
 * Tira do texto da pergunta os nomes de coluna que o modelo lá deixou entre parênteses.
 *
 * Verificado ao vivo: saíram perguntas como "a população entre os 65 e os 69 anos (T_65___69)".
 * O nome da coluna não diz nada a quem lê e faz a sugestão parecer escrita para a máquina; a
 * pergunta continua igualmente precisa sem ele. Só remove parêntesis cujo conteúdo é exactamente
 * uma coluna real, por isso "(sorgo)" ou "(mapira/milheto)" ficam intactos.
 */
function removerNomesDeColuna(texto: string, colunas: Set<string>): string {
  return texto
    .replace(/\s*\(([^()]{1,60})\)/g, (todo, dentro) =>
      colunas.has(normalizarNome(dentro)) ? '' : todo
    )
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Deixa passar apenas as propostas que os dados sustentam mesmo.
 *
 * Descarta em silêncio (não corrige nem avisa o utilizador): uma sugestão que não se verifica não
 * tem valor nenhum para quem está a ler, e explicar porque foi descartada seria expor detalhe
 * interno sem utilidade. O que interessa é que o que sobra seja verdadeiro.
 */
function validarPropostas(
  propostas: PerguntaViavel[],
  ctx: ContextoExecucao,
  datasetIds: number[]
): { validas: PerguntaViavel[]; descartadas: { pergunta: string; razao: string }[] } {
  const colunasPorDataset = new Map<number, Set<string>>()
  for (const [id, tabela] of Array.from(ctx.tabelas.entries())) {
    colunasPorDataset.set(id, new Set(tabela.colunas.map(normalizarNome)))
  }
  const todasColunas = new Set<string>()
  for (const conjunto of Array.from(colunasPorDataset.values())) {
    for (const c of Array.from(conjunto)) todasColunas.add(c)
  }
  const anosDisponiveis = anosComDados(ctx)
  const niveisDisponiveis = new Set(
    Array.from(ctx.ligacoes.values())
      .filter((l): l is NonNullable<typeof l> => !!l)
      .map((l) => l.nivel)
  )

  const validas: PerguntaViavel[] = []
  const descartadas: { pergunta: string; razao: string }[] = []
  const jaVistas = new Set<string>()

  for (const proposta of propostas) {
    const pergunta = String(proposta.pergunta || '').trim()
    if (!pergunta) continue

    // Duas formulações da mesma pergunta ocupariam dois lugares e pareceriam desleixo.
    const assinatura = normalizarNome(pergunta)
    if (jaVistas.has(assinatura)) {
      descartadas.push({ pergunta, razao: 'duplicada' })
      continue
    }

    if (!existeMetodo(proposta.metodo)) {
      descartadas.push({ pergunta, razao: `método inexistente: ${proposta.metodo}` })
      continue
    }

    const colunas = Array.isArray(proposta.colunas_usadas) ? proposta.colunas_usadas : []
    if (colunas.length === 0) {
      descartadas.push({ pergunta, razao: 'nenhuma coluna declarada' })
      continue
    }
    const colunaEmFalta = colunas.find((c) => !todasColunas.has(normalizarNome(String(c))))
    if (colunaEmFalta) {
      descartadas.push({ pergunta, razao: `coluna inexistente: ${colunaEmFalta}` })
      continue
    }

    const artefacto = colunas.map(String).find(colunaArtefacto)
    if (artefacto) {
      descartadas.push({ pergunta, razao: `usa coluna-artefacto (não mede nada do mundo real): ${artefacto}` })
      continue
    }
    if (apenasColunasDeApoio(colunas.map(String))) {
      descartadas.push({ pergunta, razao: 'só usa colunas de apoio (códigos/proveniência)' })
      continue
    }

    // Uma sugestão que promete um ano sem dados é recusada assim que for clicada. Oferecer isso é
    // pior do que não sugerir nada: o utilizador segue a indicação do motor e leva com a recusa do
    // mesmo motor a seguir.
    if (anosDisponiveis.size > 0) {
      const semDados = anosCitados(`${pergunta} ${proposta.porque || ''}`).filter(
        (a) => !anosDisponiveis.has(a)
      )
      if (semDados.length > 0) {
        descartadas.push({ pergunta, razao: `cita ano(s) sem dados: ${semDados.join(', ')}` })
        continue
      }
    }

    // Ultima porta, e a que faltava: submete a proposta ao MESMO criterio de cobertura que o
    // portao lhe aplicaria depois de o utilizador a clicar. Sem isto, as sugestoes validavam a
    // existencia dos ingredientes e o portao media a densidade dos dados, e o motor acabava a
    // oferecer analises que ele proprio recusava a seguir.
    if (!coberturaChegaPara(pergunta, ctx)) {
      descartadas.push({ pergunta, razao: 'a cobertura temporal não sustenta a trajectória que promete' })
      continue
    }

    // Nível geográfico só é aceite se a ligação a esse nível foi mesmo detectada por
    // correspondência de valores. Sem isto, uma sugestão distrital podia sair sobre um dataset
    // que só liga a províncias, e falharia exactamente pela razão que este ecrã acabou de dar.
    if (proposta.nivel_geo && !niveisDisponiveis.has(proposta.nivel_geo as any)) {
      descartadas.push({ pergunta, razao: `nível geográfico não detectado: ${proposta.nivel_geo}` })
      continue
    }

    const ids = (Array.isArray(proposta.dataset_ids) ? proposta.dataset_ids : []).filter((id) =>
      datasetIds.includes(Number(id))
    )

    jaVistas.add(assinatura)
    validas.push({
      pergunta: limparTextoVisivel(removerNomesDeColuna(pergunta, todasColunas)),
      porque: limparTextoVisivel(String(proposta.porque || '').trim()),
      colunas_usadas: colunas.map(String),
      metodo: proposta.metodo,
      nivel_geo: proposta.nivel_geo,
      dataset_ids: ids.length ? ids : datasetIds,
    })
  }

  return { validas: validas.slice(0, MAX_PERGUNTAS), descartadas }
}

/* ------------------------------------------------------------ memória das recusas */

/**
 * Perguntas que este motor já recusou, e que por isso nunca mais devem ser oferecidas.
 *
 * É o guardião empírico, e existe porque todos os outros são estruturais e não chegaram. Verificado
 * ao vivo: a análise `an_0d551614` foi recusada e sugeriu, em primeiro lugar, "As receitas
 * internacionais do turismo em Moçambique são, em média, superiores à despesa turística
 * internacional do país?". Três minutos depois essa pergunta virou `an_ff109800`, também recusada.
 * Nenhuma validação estrutural podia ter travado isto: as colunas existiam, os anos existiam, a
 * cobertura chegava, o nível geográfico estava certo. O que falhou foi a EXECUÇÃO, e a execução não
 * se prevê a partir do cabeçalho do ficheiro.
 *
 * Executar cada sugestão para a testar seria a verificação perfeita e custaria uma análise inteira
 * por sugestão, seis por ecrã. A recusa já registada é a mesma prova, obtida à conta de alguém que
 * já lá bateu: o que este filtro garante é que ninguém lá bate uma segunda vez.
 */
export async function perguntasJaRecusadas(datasetIds: number[]): Promise<string[]> {
  try {
    const [rows] = (await db.execute(
      `SELECT pergunta, datasets_ids FROM analises
       WHERE estado = 'inviavel' AND criado_em > DATE_SUB(NOW(), INTERVAL 180 DAY)
       ORDER BY criado_em DESC LIMIT 500`
    )) as [any[], unknown]
    const alvo = new Set(datasetIds.map(Number))
    const recusadas: string[] = []
    for (const linha of rows) {
      let ids: number[] = []
      try {
        const bruto = JSON.parse(String(linha.datasets_ids || '[]'))
        ids = Array.isArray(bruto) ? bruto.map(Number) : []
      } catch {
        continue
      }
      // Basta um dataset em comum. Uma recusa nasce quase sempre do ficheiro que não tem o que a
      // pergunta pede, e esse ficheiro continua a não ter noutra combinação qualquer.
      if (ids.some((id) => alvo.has(id))) recusadas.push(String(linha.pergunta || ''))
    }
    return recusadas
  } catch (erro) {
    // Nunca deixar o histórico derrubar as sugestões: sem filtro é pior, sem sugestões é muito pior.
    logger.error('erro_ler_perguntas_recusadas', { error: erro, datasetIds })
    return []
  }
}

/**
 * As palavras que dão identidade a uma pergunta.
 *
 * Tira a pontuação, os acentos e o vocabulário de ligação. A primeira versão comparava o texto
 * quase em bruto e falhava no caso mais banal de todos: "Quantas escolas há em cada província?" e
 * "quantas escolas ha em cada provincia" ficavam com tokens diferentes por causa do ponto de
 * interrogação colado à última palavra. Duas formulações da mesma pergunta têm de dar o mesmo
 * conjunto, ou o filtro só apanha cópias literais.
 */
function assinaturaDePergunta(texto: string): Set<string> {
  return new Set(
    normalizarNome(texto)
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !PALAVRAS_VAZIAS.has(t))
  )
}

/**
 * Duas perguntas são a mesma pergunta.
 *
 * O limiar é alto de propósito (90% das palavras com carga em comum). Um filtro frouxo aqui apaga
 * sugestões boas por parecença vaga, e ficar sem alternativas é exactamente o beco que o ecrã de
 * recusa existe para evitar. Medido contra os pares que têm de ficar SEPARADOS: "quantas escolas
 * por província" e "por distrito" dão 0,5; "quantas escolas há na Beira" e "quais são as escolas
 * da Beira" dão 0,75. Ambos com folga confortável abaixo do limiar, que é o que permite manter a
 * contagem e a lista como perguntas distintas.
 */
export function mesmaPergunta(a: string, b: string): boolean {
  const sa = assinaturaDePergunta(a)
  const sb = assinaturaDePergunta(b)
  if (sa.size === 0 || sb.size === 0) return false
  let comuns = 0
  for (const t of Array.from(sa)) if (sb.has(t)) comuns++
  return comuns / Math.max(sa.size, sb.size) >= 0.9
}

/** Tira da lista tudo o que o motor já recusou. Aplica-se também ao que vem da cache. */
async function semAsQueJaFalharam(
  perguntas: PerguntaViavel[],
  datasetIds: number[]
): Promise<PerguntaViavel[]> {
  if (perguntas.length === 0) return perguntas
  const recusadas = await perguntasJaRecusadas(datasetIds)
  if (recusadas.length === 0) return perguntas
  const mantidas = perguntas.filter((p) => !recusadas.some((r) => mesmaPergunta(p.pergunta, r)))
  if (mantidas.length !== perguntas.length) {
    logger.info('sugestoes_filtradas_por_recusa', {
      datasetIds,
      antes: perguntas.length,
      depois: mantidas.length,
    })
  }
  return mantidas
}

async function lerCache(chave: string, validade: string): Promise<PerguntaViavel[] | null> {
  const [rows] = (await db.execute(
    'SELECT perguntas FROM dataset_perguntas_viaveis WHERE chave = ? AND validade = ? LIMIT 1',
    [chave, validade]
  )) as [any[], unknown]
  if (!rows[0]) return null
  try {
    const dados = JSON.parse(rows[0].perguntas)
    return Array.isArray(dados) ? dados : null
  } catch {
    return null
  }
}

async function escreverCache(chave: string, validade: string, perguntas: PerguntaViavel[]) {
  await db.execute(
    `INSERT INTO dataset_perguntas_viaveis (chave, validade, perguntas)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE validade = VALUES(validade), perguntas = VALUES(perguntas), criado_em = NOW()`,
    [chave, validade, JSON.stringify(perguntas)]
  )
}

/**
 * Descrição estrutural dos datasets para o gerador: factos verificados, não metadados soltos.
 *
 * Inclui de propósito as ligações geográficas realmente detectadas, com taxa de correspondência,
 * porque é isso que separa "esta pergunta distrital é respondível" de "esta pergunta distrital
 * parece razoável".
 */
async function contextoEstrutural(datasetIds: number[], ctx: ContextoExecucao): Promise<string> {
  const datasets = await findDatasetsByIds(datasetIds)
  const perfis = await Promise.all(datasets.map((d: any) => obterPerfilDataset(d.id)))

  const blocos = datasets.map((d: any, i: number) => {
    const tabela = ctx.tabelas.get(d.id)
    const ligacao = ctx.ligacoes.get(d.id)
    const perfil = perfis[i]

    const linhas = [
      `## Dataset ${d.id}: ${d.title}`,
      `Tipo: ${d.dataType} | Ano do dataset: ${d.year ?? 'não declarado'}`,
      d.description ? `Descrição: ${d.description}` : '',
    ].filter(Boolean)

    if (tabela) {
      linhas.push(`Linhas: ${tabela.n_linhas}`)
      linhas.push(`Colunas (nomes exactos): ${tabela.colunas.join(' | ')}`)
    }
    if (perfil) linhas.push(formatarPerfilParaPrompt(perfil))

    if (ligacao) {
      linhas.push(
        `Ligação geográfica verificada: nível ${ligacao.nivel} pela coluna "${ligacao.coluna_usada}" ` +
          `(${(ligacao.taxa_correspondencia * 100).toFixed(1)}% de correspondência). Só podes usar ` +
          `nivel_geo="${ligacao.nivel}" para este dataset.`
      )
    } else {
      linhas.push('Sem ligação geográfica: não proponhas perguntas com nivel_geo para este dataset.')
    }

    return linhas.join('\n')
  })

  return `# DATASETS\n\n${blocos.join('\n\n')}\n${cruzamentoPossivel(datasetIds, ctx)}\n\n# CATÁLOGO DE MÉTODOS\n${catalogoParaPrompt()}`
}

/**
 * Diz ao gerador, em concreto, se os datasets se podem cruzar e a que nível.
 *
 * Verificado ao vivo: com um dataset distrital de culturas industriais e outro de electrificação
 * por posto, saíram seis sugestões e nenhuma cruzava os dois, apesar de ambos terem província. A
 * instrução no prompt trazia a ressalva "só se existir uma chave de ligação real", e sem saber se
 * ela existia o modelo escolhia sempre o caminho seguro de não cruzar. Cruzar dois datasets é
 * normalmente a razão pela qual alguém escolhe dois, por isso a resposta a essa dúvida é calculada
 * aqui e entregue já feita, em vez de deixada ao critério de quem não tem como a verificar.
 */
function cruzamentoPossivel(datasetIds: number[], ctx: ContextoExecucao): string {
  if (datasetIds.length < 2) return ''

  const ordem: Record<string, number> = { admin1: 1, admin2: 2, admin3: 3 }
  const comLigacao = datasetIds
    .map((id) => ({ id, ligacao: ctx.ligacoes.get(id) }))
    .filter((x) => !!x.ligacao) as { id: number; ligacao: NonNullable<ReturnType<typeof ctx.ligacoes.get>> }[]

  if (comLigacao.length < 2) {
    return (
      '\n\n# CRUZAMENTO\nNão há dois datasets com ligação geográfica verificada: não proponhas ' +
      'perguntas que combinem datasets diferentes.'
    )
  }

  // O cruzamento só é honesto no nível mais GROSSO de todos: juntar um dataset distrital com um
  // provincial só se faz subindo o distrital a província, nunca descendo o provincial.
  const nivelComum = comLigacao.reduce(
    (maisGrosso, x) => (ordem[x.ligacao.nivel] < ordem[maisGrosso] ? x.ligacao.nivel : maisGrosso),
    comLigacao[0].ligacao.nivel as string
  )

  return (
    `\n\n# CRUZAMENTO\nOs datasets ${comLigacao.map((x) => x.id).join(' e ')} PODEM ser cruzados ao ` +
    `nível ${nivelComum}, que é o nível comum mais fino entre eles. Pelo menos DUAS das tuas ` +
    `perguntas têm de cruzar os dois datasets, porque é isso que alguém ganha ao escolher os dois ` +
    `em vez de um só. Nessas perguntas põe os ids de ambos em dataset_ids e nivel_geo="${nivelComum}".`
  )
}

/**
 * Nunca lança: isto acompanha sempre outra coisa (um bloqueio a explicar, um ecrã de selecção já
 * desenhado). Falhar aqui deve custar as sugestões, nunca a funcionalidade que as hospeda.
 */
export async function gerarPerguntasViaveis(
  datasetIds: number[],
  ctxExistente?: ContextoExecucao,
  perguntaOriginal?: string
): Promise<PerguntaViavel[]> {
  if (datasetIds.length === 0) return []

  // O filtro das recusas corre DEPOIS de tudo o resto, e sobre a cache também: uma sugestão pode
  // ter sido válida quando foi gerada e ter falhado na prática entretanto, e a cache não sabe disso.
  const aproximar = async (lista: PerguntaViavel[]) => {
    const limpa = await semAsQueJaFalharam(lista, datasetIds)
    return perguntaOriginal ? ordenarPorProximidade(limpa, perguntaOriginal) : limpa
  }

  try {
    await garantirTabela()
    const chave = chaveCombinacao(datasetIds)
    const validade = await tokenValidade(datasetIds)

    const emCache = await lerCache(chave, validade)
    if (emCache) return aproximar(emCache)

    // Reaproveita o contexto do pipeline quando existe (tabelas e ligações já carregadas, custo
    // zero); só o caminho proactivo, fora de uma análise, paga a leitura.
    const ctx = ctxExistente ?? (await criarContexto(datasetIds))
    if (ctx.tabelas.size === 0) return []

    const resposta = await chamarEstagio<{ perguntas: PerguntaViavel[] }>({
      estagio: 'perguntas_viaveis',
      sistema: PROMPT_PERGUNTAS_VIAVEIS,
      contextoEstavel: await contextoEstrutural(datasetIds, ctx),
      utilizador:
        `Propõe ${MAX_PERGUNTAS} perguntas que estes dados respondem bem, das mais úteis para ` +
        `quem trabalha com dados públicos em Moçambique. Copia os nomes das colunas exactamente ` +
        `como aparecem acima.`,
      schema: SCHEMA_PERGUNTAS_VIAVEIS,
      // 4000 truncava a resposta em datasets com muitas colunas (verificado ao vivo no dataset
      // de aeroportos): a etapa falhava por completo e o utilizador ficava sem alternativas
      // nenhumas, que é justamente o pior momento para não ter nada a oferecer.
      maxTokens: 12000,
    })

    const { validas, descartadas } = validarPropostas(
      resposta.dados?.perguntas ?? [],
      ctx,
      datasetIds
    )

    // Registar o que foi descartado é o sinal que diz se o prompt precisa de afinação: uma taxa
    // alta de descarte significa que o modelo está a inventar nomes de coluna, e isso corrige-se
    // no prompt, não a aceitar propostas por verificar.
    logger.info('perguntas_viaveis_geradas', {
      datasetIds,
      propostas: resposta.dados?.perguntas?.length ?? 0,
      validas: validas.length,
      descartadas,
    })

    // Poucas sugestões válidas são um sinal de que a validação não confiou no que veio; guardar
    // isso em cache fixaria um resultado fraco até o dataset mudar.
    if (validas.length >= MIN_PERGUNTAS_UTEIS) {
      await escreverCache(chave, validade, validas)
    }
    return aproximar(validas)
  } catch (erro) {
    logger.error('erro_gerar_perguntas_viaveis', { error: erro, datasetIds })
    return []
  }
}
