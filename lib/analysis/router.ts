import Anthropic from '@anthropic-ai/sdk'
import { CONSTITUICAO } from './constitution'
import type { EstadoPipeline } from './types'

/**
 * Roteamento de modelos por estágio (Parte 15 da especificação).
 *
 * Planeamento e Narrativa usavam Opus + (Planeamento) raciocínio prolongado — a maior fatia do
 * tempo de uma análise (~3 min só nestes dois estágios, antes de qualquer pesquisa externa,
 * medido ao vivo). Trocados para Sonnet, sem raciocínio prolongado, para caber num orçamento de
 * 30-60s por análise: perde-se alguma profundidade de plano/escrita, mas Sonnet continua a
 * produzir saída estruturada válida sobre um catálogo conhecido — não é um estágio exploratório
 * sem restrições. Descoberta continua cortada (achados extra que não são a resposta pedida).
 *
 * Crítica (PLANO-INTELIGENCIA-PRO-MAX.md, Fase 5) voltou a ser chamada, mas só condicionalmente
 * (baixa confianca_sem_enriquecimento ou pergunta comparativa/temporal) — por isso mantém-se em
 * Opus + raciocínio prolongado (COM_PENSAMENTO abaixo): já não corre em todas as análises, por
 * isso o custo extra só é pago quando o risco de erro de raciocínio é maior.
 *
 * Suficiência trocada para Haiku pelo mesmo motivo que Compreensão: apesar do nome, é uma
 * classificação (coberto/não-coberto por sub-pergunta, contra uma lista fechada de 7 tipos de
 * lacuna) não uma etapa criativa — e era a maior fatia de tempo depois do corte acima (~69s numa
 * medição ao vivo, quase metade do total).
 */

export type Estagio = EstadoPipeline | 'critica' | 'codigo' | 'titulos'

const MODELO_POR_ESTAGIO: Record<Estagio, string> = {
  compreensao: 'claude-haiku-4-5',
  planeamento: 'claude-sonnet-5',
  suficiencia: 'claude-haiku-4-5',
  enriquecimento: 'claude-sonnet-5',
  codigo: 'claude-sonnet-5',
  execucao: 'claude-sonnet-5',
  descoberta: 'claude-opus-5',
  narrativa: 'claude-sonnet-5',
  critica: 'claude-opus-5',
  composicao: 'claude-sonnet-5',
  titulos: 'claude-sonnet-5',
}

/** Estágios onde o raciocínio prolongado muda materialmente a qualidade da saída. Só a Crítica:
 *  o raciocínio prolongado do Planeamento por si só acrescentava dezenas de segundos a TODAS as
 *  análises; a Crítica só corre condicionalmente (ver comentário acima), por isso pode dar-se ao
 *  luxo de pensar mais nas poucas vezes em que corre. */
const COM_PENSAMENTO: Estagio[] = ['critica']

export function modeloPara(estagio: Estagio): string {
  return process.env.AI_MODEL_OVERRIDE?.trim() || MODELO_POR_ESTAGIO[estagio]
}

let cliente: Anthropic | null = null
export function getCliente(): Anthropic {
  if (!cliente) cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return cliente
}

export type ChamadaEstagio = {
  estagio: Estagio
  /** Instruções específicas do estágio. A Constituição é anteposta automaticamente. */
  sistema: string
  /** Contexto estável (manifestos, catálogo de métodos): enviado sob prompt caching. */
  contextoEstavel?: string
  utilizador: string
  schema: Record<string, unknown>
  maxTokens?: number
}

export type RespostaEstagio<T> = {
  dados: T
  tokens_entrada: number
  tokens_saida: number
  duracao_ms: number
}

/**
 * A API fica sobrecarregada de vez em quando (erro 529/"overloaded_error") sem que isso tenha
 * nada a ver com o pedido em si: repetir passados alguns segundos costuma resolver. Sem isto, um
 * pico transitório do lado do fornecedor chegava ao utilizador como um JSON cru de erro, no meio
 * de uma etapa qualquer, e a análise inteira (já paga até ali) era deitada fora.
 *
 * "invalid_request_error" está normalmente fora desta lista (um pedido malformado falha sempre da
 * mesma forma), mas verificado ao vivo: a mesma chamada, com o mesmo pedido, falhou uma vez com
 * "Invalid request data" e teve sucesso imediato a seguir — é intermitente do lado do fornecedor
 * em pelo menos alguns casos, não só um erro nosso. Entra na lista de retentativas por segurança;
 * se for mesmo um pedido malformado, falha outra vez em poucos segundos e sai pelo mesmo caminho.
 */
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
        tipo === 'overloaded_error' || tipo === 'rate_limit_error' || tipo === 'api_error' ||
        tipo === 'invalid_request_error'
      if (!transitorio || tentativa === MAX_TENTATIVAS) break
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (tentativa - 1))) // 1s, 2s, 4s
    }
  }
  // Nunca deixar o JSON cru do fornecedor chegar ao utilizador: isso já aconteceu (erro a meio de
  // uma etapa qualquer, mostrado tal e qual no ecrã) e não diz nada de útil a quem não é o próprio
  // motor. `cause` mantém o erro original disponível para quem inspecciona os logs do servidor.
  throw new Error('Não foi possível completar o pedido ao modelo de IA depois de várias tentativas. Tente novamente.', {
    cause: ultimoErro,
  })
}

/**
 * Executa um estágio com saída estruturada validada pelo schema.
 *
 * A Constituição e o contexto estável vão em blocos separados com `cache_control`, porque se
 * repetem em todos os estágios da mesma análise: sem isso, cada um dos oito estágios voltaria a
 * pagar os mesmos milhares de tokens de manifestos.
 */
export async function chamarEstagio<T>(opcoes: ChamadaEstagio): Promise<RespostaEstagio<T>> {
  const inicio = Date.now()
  const modelo = modeloPara(opcoes.estagio)

  const blocosSistema: any[] = [
    { type: 'text', text: CONSTITUICAO, cache_control: { type: 'ephemeral' } },
  ]
  if (opcoes.contextoEstavel) {
    blocosSistema.push({
      type: 'text',
      text: opcoes.contextoEstavel,
      cache_control: { type: 'ephemeral' },
    })
  }
  // O prompt de cada estágio (opcoes.sistema, ex.: PROMPT_PLANEAMENTO_COMPLETO) é um texto estático
  // do código-fonte, igual em TODAS as análises de TODOS os utilizadores para aquele estágio — não
  // tinha cache_control nenhum, por isso era reenviado por inteiro (milhares de tokens) em cada
  // chamada. É o bloco mais reutilizável do pedido (mais do que o contexto por análise, que só se
  // repete dentro da mesma análise), por isso ganha o seu próprio breakpoint.
  blocosSistema.push({ type: 'text', text: opcoes.sistema, cache_control: { type: 'ephemeral' } })

  // Nos estágios com raciocínio adaptativo, os tokens de pensamento contam para o mesmo limite
  // da resposta: um tecto pensado para o JSON final trunca a saída antes de ela começar.
  const comPensamento = COM_PENSAMENTO.includes(opcoes.estagio)
  const maxTokens = opcoes.maxTokens ?? (comPensamento ? 24000 : 8000)

  const pedido: any = {
    model: modelo,
    max_tokens: maxTokens,
    system: blocosSistema,
    messages: [{ role: 'user', content: opcoes.utilizador }],
    output_config: {
      format: { type: 'json_schema', schema: opcoes.schema },
    },
  }

  if (comPensamento) {
    pedido.thinking = { type: 'adaptive' }
  }

  // Streaming obrigatório: com raciocínio adaptativo e tectos altos, o pedido pode ultrapassar os
  // 10 minutos que o SDK aceita numa chamada não transmitida. finalMessage() devolve a mensagem
  // completa, por isso o resto do código não muda.
  const resposta = await chamarComRetentativa(pedido)

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
    // A causa quase sempre é truncagem por limite de tokens: distingui-la de JSON malformado
    // poupa tempo de diagnóstico, porque a correcção é diferente em cada caso.
    const motivo = (resposta as any).stop_reason
    if (motivo === 'max_tokens') {
      throw new Error(
        `Estágio ${opcoes.estagio}: resposta truncada no limite de ${maxTokens} tokens. ` +
          `Aumentar maxTokens ou reduzir o âmbito do pedido.`
      )
    }
    throw new Error(
      `Estágio ${opcoes.estagio}: resposta não é JSON válido (stop_reason=${motivo}, ` +
        `${texto.length} caracteres). Início: ${texto.slice(0, 200)}`
    )
  }

  const duracao_ms = Date.now() - inicio
  // Instrumentação temporária (PLANO-30S.md): sem números reais por estágio, qualquer alegação
  // sobre onde o tempo se está a ir é uma suposição. Isto fica nos logs do servidor até se saber
  // ao certo qual estágio é o responsável pelos vários minutos reportados.
  console.log(
    `[analise:tempo] estagio=${opcoes.estagio} modelo=${modelo} pensamento=${comPensamento} duracao_ms=${duracao_ms} tokens_entrada=${(resposta as any).usage?.input_tokens ?? 0} tokens_saida=${(resposta as any).usage?.output_tokens ?? 0} tokens_cache_lido=${(resposta as any).usage?.cache_read_input_tokens ?? 0} tokens_cache_escrito=${(resposta as any).usage?.cache_creation_input_tokens ?? 0}`
  )

  return {
    dados,
    tokens_entrada: (resposta as any).usage?.input_tokens ?? 0,
    tokens_saida: (resposta as any).usage?.output_tokens ?? 0,
    duracao_ms,
  }
}

/** Preço por milhão de tokens, para registar custo por análise (tabela `analises.custo_usd`). */
const PRECO_POR_MILHAO: Record<string, { entrada: number; saida: number }> = {
  'claude-opus-5': { entrada: 5, saida: 25 },
  'claude-sonnet-5': { entrada: 3, saida: 15 },
  'claude-haiku-4-5': { entrada: 1, saida: 5 },
}

export function custoUsd(modelo: string, tokensEntrada: number, tokensSaida: number): number {
  const preco = PRECO_POR_MILHAO[modelo] || PRECO_POR_MILHAO['claude-sonnet-5']
  return (tokensEntrada / 1_000_000) * preco.entrada + (tokensSaida / 1_000_000) * preco.saida
}
