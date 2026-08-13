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
const TIMEOUT_MS = 90_000
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
3. Corre o código de verdade antes de responder: o resultado final tem de vir da execução, nunca de um cálculo mental teu.
4. No FIM da resposta, depois de correres o código, escreve UM ÚNICO bloco \`\`\`json\`\`\` com o resultado, exactamente numa destas três formas e mais nada:
   - Escalar: {"tipo": "escalar", "valor": <número ou string>, "unidade": "<opcional>"}
   - Lista: {"tipo": "lista", "itens": [{"nome": "<string>", "valor": <número>}, ...], "unidade": "<opcional>"}
   - Impossível: {"tipo": "impossivel", "motivo": "<string curta explicando porquê os dados não chegam>"}

Não escrevas nenhum outro bloco \`\`\`json\`\`\` na resposta além deste último. Não expliques o resultado fora do bloco — a explicação em texto é livre antes dele, mas o bloco final é o que será lido por outro sistema.`

function extrairJson(texto: string): unknown {
  const blocos = Array.from(texto.matchAll(/```json\s*([\s\S]*?)```/g))
  const candidato = blocos.length > 0 ? blocos[blocos.length - 1][1] : texto
  return JSON.parse(candidato.trim())
}

function validarResultado(obj: any): ResultadoExecucaoCodigo {
  if (!obj || typeof obj !== 'object') {
    throw new Error('execucao_codigo: resposta não é um objecto JSON válido')
  }
  if (obj.tipo === 'escalar' && (typeof obj.valor === 'number' || typeof obj.valor === 'string')) {
    return {
      tipo: 'escalar',
      valor: obj.valor,
      unidade: typeof obj.unidade === 'string' ? obj.unidade : undefined,
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
      unidade: typeof obj.unidade === 'string' ? obj.unidade : undefined,
    }
  }
  if (obj.tipo === 'impossivel') {
    return { tipo: 'impossivel', motivo: typeof obj.motivo === 'string' ? obj.motivo : 'sem motivo indicado' }
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

export async function executarComCodigo(
  tabela: { titulo: string; colunas: string[]; linhas: string[][]; n_linhas: number },
  instrucao: string,
  limiteLinhas: number = LIMITE_LINHAS_PADRAO
): Promise<SaidaExecucaoCodigo> {
  const linhasCap = tabela.linhas.slice(0, limiteLinhas)
  const csv = paraCsv(tabela.colunas, linhasCap)
  const amostraNota =
    linhasCap.length < tabela.n_linhas
      ? ` (amostra de ${linhasCap.length} das ${tabela.n_linhas} linhas totais — declara isto no resultado se for relevante para a precisão)`
      : ''

  const cliente = getCliente()
  const modelo = modeloPara('codigo')

  const ficheiro = await cliente.beta.files.upload({
    file: await toFile(Buffer.from(csv, 'utf-8'), 'dados.csv', { type: 'text/csv' }),
    betas: [BETA_FILES_API],
  })

  try {
    const conteudoInicial = [
      {
        type: 'text',
        text:
          `Tabela "${tabela.titulo}"${amostraNota}, anexada como dados.csv.\n\n` +
          `Instrução específica a responder com código sobre estes dados:\n${instrucao}`,
      },
      { type: 'container_upload', file_id: ficheiro.id },
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
        { timeout: TIMEOUT_MS, headers: { 'anthropic-beta': BETA_FILES_API } }
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
