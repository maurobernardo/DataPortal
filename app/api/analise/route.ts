export const runtime = 'nodejs'
export const maxDuration = 800

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { executarPipeline, novoIdAnalise } from '@/lib/analysis/pipeline'
import { criarAnalise, guardarResultado, registarErro } from '@/lib/analysis/persistencia'
import { rateLimit } from '@/lib/security'
import { registarAcesso } from '@/lib/origem'
import { logger } from '@/lib/logger'
import type { EventoPipeline } from '@/lib/analysis/types'

const MAX_DATASETS = 3

/**
 * Nunca mostrar o erro técnico cru ao utilizador (ECONNRESET, timeout, 500, etc.): já aconteceu
 * chegar ao ecrã tal como o Node ou a base de dados o escreveram, o que não ajuda ninguém e parece
 * a aplicação partida. O erro completo continua a ir para os logs (`logger.error` abaixo); esta
 * mensagem é a única coisa que o utilizador vê.
 */
function mensagemAmigavel(): string {
  return 'Não foi possível concluir esta análise devido a uma falha temporária. Tente novamente — se persistir, tente com outra pergunta ou outros datasets.'
}

/**
 * Inicia uma análise e transmite o progresso por Server-Sent Events.
 *
 * O streaming não é um detalhe de UX: a análise leva vários minutos e o utilizador precisa de
 * ver o plano e os primeiros números enquanto espera. Um ecrã em branco com spinner durante
 * oito minutos seria indistinguível de uma falha.
 */
export async function POST(request: NextRequest) {
  const sessao = await getCurrentUser()
  if (!sessao) {
    return new Response(JSON.stringify({ error: 'Precisa de sessão iniciada' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const corpo = await request.json().catch(() => null)
  const pergunta = String(corpo?.pergunta || '').trim()
  const datasetIds: number[] = Array.isArray(corpo?.dataset_ids)
    ? corpo.dataset_ids.map((v: unknown) => Number.parseInt(String(v), 10)).filter(Number.isFinite)
    : []
  // Desligado por omissão: pesquisa externa (web_search/web_fetch) pode custar até 150s por
  // chamada, incompatível com o orçamento de 30-60s de uma análise normal. Só quem pede
  // explicitamente aceita a espera extra.
  const fontesExternas = corpo?.fontes_externas === true

  if (!pergunta || pergunta.length < 5) {
    return new Response(JSON.stringify({ error: 'Escreva uma pergunta' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (datasetIds.length === 0 || datasetIds.length > MAX_DATASETS) {
    return new Response(
      JSON.stringify({ error: `Seleccione entre 1 e ${MAX_DATASETS} datasets` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Cada análise custa perto de um dólar e ocupa minutos de CPU: sem limite, um utilizador
  // sozinho conseguiria esgotar o orçamento do portal.
  const rl = await rateLimit(`analise:${sessao.userId}`, 10, 60 * 60 * 1000)
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'Limite de análises por hora atingido. Tente mais tarde.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const analiseId = novoIdAnalise()
  await criarAnalise(analiseId, pergunta, datasetIds, sessao.userId)
  await registarAcesso(request, 'analise_ia', { referenciaId: analiseId, utilizadorId: sessao.userId })

  const codificador = new TextEncoder()
  const fluxo = new ReadableStream({
    async start(controlador) {
      const enviar = (evento: EventoPipeline | { tipo: 'inicio'; analise_id: string }) => {
        try {
          controlador.enqueue(codificador.encode(`data: ${JSON.stringify(evento)}\n\n`))
        } catch {
          // Cliente desligou-se: a análise continua e fica guardada na mesma.
        }
      }

      enviar({ tipo: 'inicio', analise_id: analiseId })

      // Falhas de rede (ex.: ECONNRESET a meio de uma chamada longa) podem acontecer em qualquer
      // ponto do pipeline, não só nas chamadas ao modelo (essas já têm a própria retentativa em
      // router.ts). Uma segunda tentativa completa do zero é o que garante que o utilizador nunca
      // fica sem resposta por causa de um problema transitório de rede, em vez de só das falhas
      // que o router já sabia tratar.
      const MAX_TENTATIVAS_PIPELINE = 2
      let ultimoErro: any = null
      for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_PIPELINE; tentativa++) {
        try {
          const resultado = await executarPipeline(pergunta, datasetIds, enviar, analiseId, { fontesExternas })
          await guardarResultado(resultado)
          ultimoErro = null
          break
        } catch (erro: any) {
          ultimoErro = erro
          logger.error('erro_pipeline_analise', { error: erro, analiseId, tentativa })
        }
      }
      if (ultimoErro) {
        await registarErro(analiseId, mensagemAmigavel()).catch(() => {})
        enviar({
          tipo: 'erro',
          estagio: 'execucao',
          mensagem: mensagemAmigavel(),
          recuperavel: false,
        })
      }

      try {
        controlador.close()
      } catch {
        /* já fechado */
      }
    },
  })

  return new Response(fluxo, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
