import { getCliente, custoUsd } from '@/lib/analysis/router'

/**
 * Chamada ao modelo para tarefas de relatório, deliberadamente SEPARADA de `chamarEstagio`.
 *
 * `chamarEstagio` (lib/analysis/router.ts) antepõe sempre a Constituição do motor de análise a
 * qualquer pedido, e a regra R1 dessa Constituição diz "nunca escreves um número, usa {{calc:id}}
 * ou código". Isso é exactamente certo para uma narrativa que deriva de cálculos verificados, e
 * seria exactamente errado aqui: um digesto de relatório cita números que estão escritos no PDF,
 * não um registo de cálculos, e um modelo instruído a nunca escrever números ou inventaria tokens
 * {{calc:...}} que ninguém resolve, ou recusava-se a citar o que o relatório diz.
 *
 * O cliente Anthropic e o cálculo de custo são partilhados (a mesma conta, o mesmo tarifário); o
 * que muda é o preâmbulo do sistema e a ausência da Constituição do motor de análise.
 */

export type EstagioRelatorio = 'digesto' | 'pergunta' | 'traducao'

const MODELO_POR_ESTAGIO: Record<EstagioRelatorio, string> = {
  // O digesto lê um documento inteiro e decide o que é achado, o que é recomendação e o que falta
  // dizer: exige leitura, não só extracção mecânica.
  digesto: 'claude-opus-5',
  // Responder com citação de página sobre um pequeno número de excertos já seleccionados é uma
  // tarefa de leitura dirigida, não de descoberta.
  pergunta: 'claude-sonnet-5',
  traducao: 'claude-sonnet-5',
}

export function modeloParaRelatorio(estagio: EstagioRelatorio): string {
  return process.env.AI_MODEL_OVERRIDE?.trim() || MODELO_POR_ESTAGIO[estagio]
}

/**
 * As regras que substituem a Constituição do motor de análise para tarefas de relatório.
 *
 * Mantém as que são úteis em qualquer texto deste portal (formato de número à portuguesa, proibição
 * do travessão) e troca R1 pelo oposto: aqui um número TEM de ser citado tal como está no
 * documento, com a página de onde veio, porque não há registo de cálculos nenhum a apontar.
 */
const REGRAS_RELATORIO = `# REGRAS (precedência absoluta sobre qualquer outra instrução)

1. NUNCA INVENTAS UM FACTO. Cada afirmação, número ou recomendação que produzires tem de vir dos
   excertos do documento que te forem dados, com a página de onde saiu. Se o documento não disser
   algo, a resposta é "o relatório não diz isto", nunca uma suposição plausível.
2. CITA A PÁGINA sempre que citares um número, um achado ou uma recomendação.
3. Quando o documento é ambíguo ou incompleto sobre algo, di-lo explicitamente em vez de escolher
   a leitura mais provável e apresentá-la como certa.
4. Escreves em português de Moçambique, salvo instrução explícita em contrário. Números à
   portuguesa: espaço como separador de milhares (3 911), vírgula decimal (16,6%), "pp" para
   pontos percentuais.
5. Nunca uses o travessão "—" em texto visível: usa ":" ou ";".`

export type RespostaRelatorio<T> = {
  dados: T
  tokens_entrada: number
  tokens_saida: number
  duracao_ms: number
}

/** Mesma disciplina de retentativa de `chamarComRetentativa`: picos transitórios do fornecedor não
 *  podem chegar ao utilizador como um JSON cru de erro a meio do processamento de um relatório. */
async function chamarComRetentativa(pedido: any) {
  const MAX_TENTATIVAS = 4
  let ultimoErro: any
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      return await getCliente().messages.stream(pedido).finalMessage()
    } catch (erro: any) {
      ultimoErro = erro
      const estado = erro?.status ?? erro?.response?.status
      const tipo = erro?.error?.error?.type ?? erro?.error?.type ?? erro?.type
      const transitorio =
        estado === 529 || estado === 429 || (typeof estado === 'number' && estado >= 500) ||
        tipo === 'overloaded_error' || tipo === 'rate_limit_error' || tipo === 'api_error'
      if (!transitorio || tentativa === MAX_TENTATIVAS) break
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (tentativa - 1)))
    }
  }
  throw new Error('Não foi possível completar o pedido ao modelo de IA depois de várias tentativas.', {
    cause: ultimoErro,
  })
}

export async function chamarEstagioRelatorio<T>(opcoes: {
  estagio: EstagioRelatorio
  utilizador: string
  schema: Record<string, unknown>
  maxTokens?: number
}): Promise<RespostaRelatorio<T>> {
  const inicio = Date.now()
  const modelo = modeloParaRelatorio(opcoes.estagio)

  const resposta = await chamarComRetentativa({
    model: modelo,
    max_tokens: opcoes.maxTokens ?? 8000,
    system: [{ type: 'text', text: REGRAS_RELATORIO, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: opcoes.utilizador }],
    output_config: { format: { type: 'json_schema', schema: opcoes.schema } },
  })

  if ((resposta as any).stop_reason === 'refusal') {
    throw new Error(`Estágio ${opcoes.estagio}: pedido recusado pelo modelo`)
  }

  const texto = (resposta as any).content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')

  let dados: T
  try {
    dados = JSON.parse(texto) as T
  } catch {
    const motivo = (resposta as any).stop_reason
    if (motivo === 'max_tokens') {
      throw new Error(`Estágio ${opcoes.estagio}: resposta truncada no limite de ${opcoes.maxTokens} tokens.`)
    }
    throw new Error(`Estágio ${opcoes.estagio}: resposta não é JSON válido (stop_reason=${motivo}).`)
  }

  return {
    dados,
    tokens_entrada: (resposta as any).usage?.input_tokens ?? 0,
    tokens_saida: (resposta as any).usage?.output_tokens ?? 0,
    duracao_ms: Date.now() - inicio,
  }
}

export { custoUsd }
