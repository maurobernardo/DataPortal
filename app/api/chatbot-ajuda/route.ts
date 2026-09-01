import { NextRequest, NextResponse } from 'next/server'
import { getCliente } from '@/lib/analysis/router'
import { rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'
import { MANUAL_DATAPORTAL } from '@/lib/chatbot/manual'

export const dynamic = 'force-dynamic'

const SISTEMA = `Ês o assistente de ajuda do DataPortal (dataportal.co.mz), o portal de dados aberto da \
Data4Moz. A tua única função é ensinar a usar a plataforma e explicar o que ela é: nunca \
respondes a perguntas sobre outros assuntos (política, actualidade, código, etc.) — se te \
perguntarem isso, explica com simpatia que só ajudas com o DataPortal.

Regras:
- Responde SÓ com base no manual abaixo. Nunca inventes um botão, filtro ou funcionalidade que \
  não esteja descrito aqui — se não souberes, diz que não tens essa informação e sugere usar o \
  botão "Falar connosco" para contactar a equipa.
- Sê extremamente concreto: nomeia o botão exacto, o menu exacto, a página exacta. Um utilizador \
  a seguir a tua resposta ao pé da letra nunca deve ficar sem saber onde clicar.
- Respostas curtas e directas por defeito (2-5 frases); só te alongas em passo-a-passo quando a \
  pergunta pedir um "como fazer X" de várias etapas — nesse caso numera os passos.
- Português de Moçambique, tom simples e acolhedor, nunca técnico a mais.
- Nunca uses o travessão "—" no texto: usa ":" ou ";".
- Nunca uses formatação markdown: sem asteriscos (nem **negrito** nem *itálico*), sem cardinais (#),
  sem crases, sem listas com "-" ou "*". O texto é mostrado tal e qual, sem processar markdown, por
  isso qualquer símbolo desses aparece literalmente ao utilizador. Para passos numerados usa só
  "1.", "2.", "3." seguidos de espaço, cada um numa linha nova, em texto simples.
- Nunca uses emojis.

MANUAL:
${MANUAL_DATAPORTAL}`

type Mensagem = { role: 'user' | 'assistant'; content: string }

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimit(`chatbot-ajuda:${ip}`, 30, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiadas perguntas. Tenta novamente daqui a pouco.' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const mensagens: Mensagem[] = Array.isArray(body?.mensagens) ? body.mensagens : []
  if (mensagens.length === 0) {
    return NextResponse.json({ error: 'Mensagem em falta' }, { status: 400 })
  }

  // Só as últimas 10 trocas (20 mensagens): suficiente para manter o fio da conversa sem deixar o
  // pedido crescer sem limite numa conversa longa.
  const historico = mensagens.slice(-20).map((m) => ({
    role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
    content: String(m.content || '').slice(0, 1000),
  }))

  try {
    const cliente = getCliente()
    const resposta = await cliente.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 700,
      // O manual é igual em todos os pedidos de todos os visitantes: cache_control marca-o para
      // não ser reprocessado do zero em cada mensagem, o que importa muito aqui porque é grande e
      // este endpoint é público (potencialmente muito tráfego).
      system: [{ type: 'text', text: SISTEMA, cache_control: { type: 'ephemeral' } }],
      messages: historico,
    } as any)

    const bruto = (resposta as any).content
      ?.filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')
      .trim() || 'Não consegui responder agora. Tenta de novo daqui a pouco.'

    // Rede de segurança: as instruções no system prompt (sem travessão, sem markdown) não são
    // garantidas a 100% (confirmado ao vivo em ambos os casos). Aplicar aqui garante a regra
    // sempre, sem depender só do modelo se lembrar dela em cada resposta. Os asteriscos nunca são
    // precisos em texto normal (nem multiplicação aparece nestas respostas), por isso remover
    // todos é seguro: fica só o texto que estava a negrito, sem os marcadores.
    const texto = bruto.replace(/\s*—\s*/g, ': ').replace(/\*/g, '')

    return NextResponse.json({ texto })
  } catch (erro) {
    logger.error('erro_chatbot_ajuda', { error: erro })
    return NextResponse.json({ error: 'Não foi possível responder agora.' }, { status: 502 })
  }
}
