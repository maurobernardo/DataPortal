import { toFile } from '@anthropic-ai/sdk'
import { getCliente, modeloPara } from './router'

/**
 * Execução de código como último recurso do catálogo (PLANO-INTELIGENCIA-PRO-MAX.md, Fase 2).
 *
 * Quando nenhum método do catálogo (lib/analysis/library) responde a uma sub-pergunta, este
 * módulo dá ao modelo acesso à ferramenta de execução de código server-side da Anthropic: em vez
 * de o modelo "adivinhar" um número, ele escreve Python que corre de facto sobre os dados reais
 * do dataset seleccionado, num contentor isolado sem acesso à rede. R1 mantém-se: o valor nunca
 * sai da cabeça do modelo, sai da saída de um cálculo reproduzível — que fica guardado
 * (ctx.codigoExecutado) para auditoria, tal como qualquer outro método do catálogo.
 *
 * Segurança: o contentor da Anthropic não tem acesso à internet nem a este servidor — só vê o
 * ficheiro CSV que aqui se lhe envia via Files API. Não há credenciais, base de dados de produção
 * nem sistema de ficheiros do portal ao alcance do código gerado.
 *
 * O CSV é enviado como FICHEIRO carregado (Files API + container_upload), nunca embutido em texto
 * na mensagem: a primeira versão desta função embutia o CSV directamente no prompt e pedia ao
 * modelo para o "escrever" dentro de um comando bash — na prática isso obriga o modelo a
 * RETRANSCREVER a tabela inteira como tokens de saída antes de poder ler uma linha dela, o que
 * esgota o tecto de max_tokens em qualquer tabela real (milhares de linhas) e faz o passo falhar
 * com JSON truncado. Com container_upload o ficheiro já está pronto no sandbox; o modelo só o lê.
 */

export type ResultadoExecucaoCodigo =
  | { tipo: 'escalar'; valor: number | string; unidade?: string }
  | { tipo: 'lista'; itens: { nome: string; valor: number }[]; unidade?: string }
  | { tipo: 'impossivel'; motivo: string }

export type SaidaExecucaoCodigo = {
  resultado: ResultadoExecucaoCodigo
  /** Código realmente corrido no sandbox, guardado para auditoria — pode ficar vazio se a API
   *  não devolveu o bloco de ferramenta em forma inspeccionável. */
  codigo: string
  tokens_entrada: number
  tokens_saida: number
}

const LIMITE_LINHAS_PADRAO = 15000
// 90s chegava para um ficheiro. Com dois, o sandbox tem de os carregar, alinhar pela coluna
// geográfica e só depois calcular, e passou a estourar o prazo (visto ao vivo: "Request timed
// out" num passo de cruzamento que antes nem sequer recebia o segundo ficheiro). O tempo extra só
// é pedido quando há mesmo dois ficheiros; com um só, nada muda.
const TIMEOUT_MS = 90_000
const TIMEOUT_MS_DOIS_FICHEIROS = 150_000
const MAX_VOLTAS = 3 // 1 pedido inicial + até 2 retomas de pause_turn
const BETA_FILES_API = 'files-api-2025-04-14'

function csvEscape(valor: string): string {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`
  return valor
}

function paraCsv(colunas: string[], linhas: string[][]): string {
  const cabecalho = colunas.map(csvEscape).join(',')
  const corpo = linhas.map((l) => colunas.map((_, i) => csvEscape(l[i] ?? '')).join(','))
  return [cabecalho, ...corpo].join('\n')
}

const SISTEMA = `És um analista de dados. Tens acesso a execução de código Python num sandbox isolado, sem acesso à rede.

Um ficheiro "dados.csv" com a tabela relevante já está anexado a este pedido — não precisas de o escrever nem de o retranscrever. Pode não estar no directório de trabalho actual: antes de tentares lê-lo, corre UMA VEZ \`find / -iname dados.csv 2>/dev/null\` para obteres o caminho completo (costuma estar num subdirectório de input), e usa esse caminho directamente em \`pandas.read_csv(...)\` — não precisas de o copiar para outro sítio primeiro.

A tua tarefa, dada uma instrução específica sobre esta tabela:

1. Carrega "dados.csv" com pandas.
2. Calcula exactamente o que foi pedido, usando SÓ os dados fornecidos. Nunca inventes, estimes ou completes de memória um valor que os dados não permitam calcular — se não for possível com estes dados, di-lo explicitamente.
2b. Quando a instrução pede um cálculo REPETIDO por grupo (por província, por categoria, por distrito, etc.), "impossivel" só é a resposta certa se NENHUM grupo tiver dados suficientes. Se alguns grupos têm dados completos e outros não, calcula os que têm e devolve "lista" só com esses — não declares o cálculo inteiro impossível só porque uma parte dos grupos falha. Um resultado parcial e honesto (com menos itens, mas todos reais) vale mais do que "impossivel" quando uma parte da resposta era mesmo calculável. Se preferires, ainda podes mencionar no texto livre antes do bloco final quais grupos ficaram de fora e porquê — mas o bloco JSON deve conter os que resultaram.
3. Corre o código de verdade antes de responder: o resultado final tem de vir da execução, nunca de um cálculo mental teu.
4. No FIM da resposta, depois de correres o código, escreve UM ÚNICO bloco \`\`\`json\`\`\` com o resultado, exactamente numa destas três formas e mais nada:
   - Escalar: {"tipo": "escalar", "valor": <número ou string>, "unidade": "<opcional>"}
   - Lista: {"tipo": "lista", "itens": [{"nome": "<string>", "valor": <número>}, ...], "unidade": "<opcional>"}
   - Impossível: {"tipo": "impossivel", "motivo": "<string curta explicando porquê os dados não chegam>"}

Não escrevas nenhum outro bloco \`\`\`json\`\`\` na resposta além deste último. Não expliques o resultado fora do bloco — a explicação em texto é livre antes dele, mas o bloco final é o que será lido por outro sistema.`

/**
 * Percorre o texto e devolve os objectos JSON completos que lá estejam, do último para o primeiro.
 *
 * Conta chavetas respeitando cadeias de texto e escapes, para não terminar num "}" que faça parte
 * de um valor. O último objecto é o mais provável: o modelo costuma explicar primeiro e concluir
 * com o resultado.
 */
function objectosJsonNoTexto(texto: string): string[] {
  const encontrados: string[] = []
  for (let inicio = 0; inicio < texto.length; inicio++) {
    if (texto[inicio] !== '{') continue
    let profundidade = 0
    let dentroDeTexto = false
    let escapado = false
    for (let i = inicio; i < texto.length; i++) {
      const c = texto[i]
      if (escapado) {
        escapado = false
        continue
      }
      if (c === '\\') {
        escapado = true
        continue
      }
      if (c === '"') dentroDeTexto = !dentroDeTexto
      if (dentroDeTexto) continue
      if (c === '{') profundidade++
      else if (c === '}') {
        profundidade--
        if (profundidade === 0) {
          encontrados.push(texto.slice(inicio, i + 1))
          inicio = i
          break
        }
      }
    }
  }
  return encontrados.reverse()
}

/**
 * Tira o resultado estruturado da resposta, seja qual for a forma que ela tome.
 *
 * Antes só aceitava uma cerca ```json. Verificado ao vivo: uma análise perdeu o passo inteiro
 * porque o modelo escreveu a explicação antes do objecto e sem cerca, e o parse tentou ler a prosa
 * ("Unexpected token 'C'"). O conteúdo estava lá e era válido; falhou só a maneira de o encontrar,
 * o que é a pior razão possível para perder um passo de uma análise.
 */
export function extrairJson(texto: string): unknown {
  const candidatos: string[] = []

  for (const m of Array.from(texto.matchAll(/```json\s*([\s\S]*?)```/g))) candidatos.push(m[1])
  for (const m of Array.from(texto.matchAll(/```\s*([\s\S]*?)```/g))) candidatos.push(m[1])
  candidatos.reverse() // a última cerca costuma trazer a conclusão
  candidatos.push(texto)
  candidatos.push(...objectosJsonNoTexto(texto))

  let ultimoErro: unknown = null
  for (const candidato of candidatos) {
    const limpo = candidato.trim()
    if (!limpo) continue
    try {
      return JSON.parse(limpo)
    } catch (erro) {
      ultimoErro = erro
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error('sem JSON reconhecível na resposta')
}

/**
 * Reduz a "unidade" devolvida pelo código ao que cabe a seguir a um número.
 *
 * O campo é livre e o modelo usa-o às vezes para descrever o método inteiro. Verificado ao vivo,
 * num título de análise: "r=0,52 coeficiente de correlação de Pearson (n=10 províncias, ano 2022;
 * confundimento plausível: dimensão territorial da província)". A unidade é colada ao valor em
 * todo o lado onde ele aparece, por isso uma frase aqui torna ilegível o título, os cartões e o
 * texto de uma vez só.
 *
 * Corta no primeiro parêntesis ou ponto e vírgula, que é onde a descrição costuma começar, e
 * desiste da unidade se mesmo assim continuar do tamanho de uma frase: um número sem unidade lê-se
 * bem, um número seguido de um parágrafo não.
 */
export function limparUnidade(bruta: unknown): string | undefined {
  if (typeof bruta !== 'string') return undefined
  const cortada = bruta.split(/[(;]/)[0].trim().replace(/\s+/g, ' ')
  if (!cortada) return undefined
  // 30 caracteres separa bem as duas coisas na pratica: deixa passar unidades legitimas compridas
  // ("casos por 100 mil habitantes", 28) e barra nomes de metodo ("coeficiente de correlacao de
  // Pearson", 36), que sao o que costuma aparecer aqui por engano.
  return cortada.length <= 30 ? cortada : undefined
}

export function validarResultado(obj: any): ResultadoExecucaoCodigo {
  if (!obj || typeof obj !== 'object') {
    throw new Error('execucao_codigo: resposta não é um objecto JSON válido')
  }
  if (obj.tipo === 'escalar' && (typeof obj.valor === 'number' || typeof obj.valor === 'string')) {
    return {
      tipo: 'escalar',
      valor: obj.valor,
      unidade: limparUnidade(obj.unidade),
    }
  }
  if (
    obj.tipo === 'lista' &&
    Array.isArray(obj.itens) &&
    obj.itens.length > 0 &&
    obj.itens.every((i: any) => i && typeof i.nome === 'string' && typeof i.valor === 'number')
  ) {
    return {
      tipo: 'lista',
      itens: obj.itens.map((i: any) => ({ nome: i.nome, valor: i.valor })),
      unidade: limparUnidade(obj.unidade),
    }
  }
  if (obj.tipo === 'impossivel') {
    return { tipo: 'impossivel', motivo: typeof obj.motivo === 'string' ? obj.motivo : 'sem motivo indicado' }
  }

  // O cálculo correu, o JSON é válido, e perde-se o passo por causa do invólucro. Verificado ao
  // vivo: uma soma por província devolvida como {"Tete": 37134, "Manica": 21000} em vez de
  // {"tipo":"lista","itens":[...]}. São os mesmos números; recusá-los por causa da forma é deitar
  // fora trabalho já feito, e o passo perdido custa à análise inteira.
  const itensDeMapa = (fonte: any): { nome: string; valor: number }[] =>
    Object.entries(fonte)
      .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
      .map(([nome, valor]) => ({ nome, valor: valor as number }))

  // Lista sob outro nome ("resultado", "dados", "valores") ou sem o campo "tipo".
  for (const campo of ['itens', 'resultado', 'resultados', 'dados', 'valores']) {
    const v = obj[campo]
    if (Array.isArray(v) && v.length > 0 && v.every((i: any) => i && typeof i.valor === 'number' && typeof i.nome === 'string')) {
      return { tipo: 'lista', itens: v.map((i: any) => ({ nome: i.nome, valor: i.valor })), unidade: limparUnidade(obj.unidade) }
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const itens = itensDeMapa(v)
      if (itens.length > 0) return { tipo: 'lista', itens, unidade: limparUnidade(obj.unidade) }
    }
  }

  // Escalar sem "tipo": {"valor": 12} ou {"resultado": 12}.
  for (const campo of ['valor', 'resultado', 'total']) {
    if (typeof obj[campo] === 'number' && Number.isFinite(obj[campo])) {
      return { tipo: 'escalar', valor: obj[campo], unidade: limparUnidade(obj.unidade) }
    }
  }

  // O objecto inteiro é o mapa nome -> número.
  const directo = itensDeMapa(obj)
  if (directo.length > 0) {
    return { tipo: 'lista', itens: directo, unidade: limparUnidade(obj.unidade) }
  }

  throw new Error('execucao_codigo: resposta em formato inesperado (nem escalar, lista nem impossivel)')
}

/**
 * Extrai, best-effort, o código realmente corrido — só para auditoria (ctx.codigoExecutado). Se a
 * forma exacta dos blocos de ferramenta mudar entre versões da API, isto degrada para string
 * vazia sem afectar o resultado, que vem só do JSON final validado.
 */
function extrairCodigo(blocos: any[]): string {
  const trechos: string[] = []
  for (const b of blocos) {
    const entrada = b?.input
    if (typeof entrada?.command === 'string') trechos.push(entrada.command)
    else if (typeof entrada?.file_text === 'string') trechos.push(entrada.file_text)
  }
  return trechos.join('\n\n---\n\n')
}

export type TabelaParaCodigo = {
  titulo: string
  colunas: string[]
  linhas: string[][]
  n_linhas: number
}

/**
 * `segunda` existe porque uma pergunta de cruzamento não se responde com um ficheiro só.
 *
 * Verificado ao vivo em três casos seguidos: o passo recebia apenas o primeiro dataset e o modelo
 * respondia, com razão, "o ficheiro dados.csv contém apenas dados da camada de Tuberculose". O
 * plano estava certo e os dados existiam; o passo morria só porque o segundo ficheiro nunca
 * chegava ao sandbox.
 */
export async function executarComCodigo(
  tabela: TabelaParaCodigo,
  instrucao: string,
  limiteLinhas: number = LIMITE_LINHAS_PADRAO,
  segunda?: TabelaParaCodigo
): Promise<SaidaExecucaoCodigo> {
  const descrever = (t: TabelaParaCodigo, nome: string) => {
    const cap = t.linhas.slice(0, limiteLinhas)
    const nota =
      cap.length < t.n_linhas
        ? ` (amostra de ${cap.length} das ${t.n_linhas} linhas totais — declara isto no resultado se for relevante para a precisão)`
        : ''
    return { csv: paraCsv(t.colunas, cap), texto: `Tabela "${t.titulo}"${nota}, anexada como ${nome}.` }
  }

  const primeira = descrever(tabela, 'dados.csv')
  const outra = segunda ? descrever(segunda, 'dados2.csv') : null

  const cliente = getCliente()
  const modelo = modeloPara('codigo')

  const ficheiro = await cliente.beta.files.upload({
    file: await toFile(Buffer.from(primeira.csv, 'utf-8'), 'dados.csv', { type: 'text/csv' }),
    betas: [BETA_FILES_API],
  })
  const ficheiro2 = outra
    ? await cliente.beta.files.upload({
        file: await toFile(Buffer.from(outra.csv, 'utf-8'), 'dados2.csv', { type: 'text/csv' }),
        betas: [BETA_FILES_API],
      })
    : null

  try {
    const conteudoInicial = [
      {
        type: 'text',
        text:
          `${primeira.texto}\n` +
          (outra
            ? `${outra.texto}\nSão dois ficheiros: cruza-os pela coluna geográfica comum (nome da ` +
              `província ou do distrito), ao nível mais grosso dos dois, e nunca emparelhes linhas ` +
              `pela ordem em que aparecem.\n`
            : '') +
          `\nInstrução específica a responder com código sobre estes dados:\n${instrucao}`,
      },
      { type: 'container_upload', file_id: ficheiro.id },
      ...(ficheiro2 ? [{ type: 'container_upload', file_id: ficheiro2.id }] : []),
    ]

    let messages: any[] = [{ role: 'user', content: conteudoInicial }]
    let tokensEntrada = 0
    let tokensSaida = 0
    let ultimaResposta: any = null

    for (let volta = 0; volta < MAX_VOLTAS; volta++) {
      const resposta: any = await cliente.messages.create(
        {
          model: modelo,
          max_tokens: 4096,
          system: SISTEMA,
          messages,
          tools: [{ type: 'code_execution_20260120', name: 'code_execution' }],
        } as any,
        { timeout: outra ? TIMEOUT_MS_DOIS_FICHEIROS : TIMEOUT_MS, headers: { 'anthropic-beta': BETA_FILES_API } }
      )
      tokensEntrada += resposta.usage?.input_tokens ?? 0
      tokensSaida += resposta.usage?.output_tokens ?? 0
      ultimaResposta = resposta
      if (resposta.stop_reason !== 'pause_turn') break
      // Servidor sinaliza que o loop interno de ferramentas atingiu o limite de iterações:
      // reenviar o par pergunta+resposta faz a API retomar exactamente onde ficou (não é "continua").
      messages = [{ role: 'user', content: conteudoInicial }, { role: 'assistant', content: resposta.content }]
    }

    const blocos: any[] = ultimaResposta?.content ?? []
    const texto = blocos
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')

    let resultado: ResultadoExecucaoCodigo
    try {
      resultado = validarResultado(extrairJson(texto))
    } catch (erro: any) {
      throw new Error(`execucao_codigo: não devolveu um resultado estruturado válido (${erro?.message})`)
    }

    return {
      resultado,
      codigo: extrairCodigo(blocos),
      tokens_entrada: tokensEntrada,
      tokens_saida: tokensSaida,
    }
  } finally {
    // Não há razão para guardar os dados brutos indefinidamente no armazenamento da Anthropic
    // depois de a análise terminar — cada análise sobe o seu próprio ficheiro efémero.
    await cliente.beta.files.delete(ficheiro.id, { betas: [BETA_FILES_API] }).catch(() => {})
  }
}
