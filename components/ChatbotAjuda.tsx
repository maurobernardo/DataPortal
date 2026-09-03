'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, Send, X, Loader2 } from 'lucide-react'

type Mensagem = { role: 'user' | 'assistant'; content: string }

const CHAVE_HISTORICO = 'pd-chatbot-ajuda-historico'
const MENSAGEM_BOAS_VINDAS: Mensagem = {
  role: 'assistant',
  content:
    'Olá! Sou o assistente do DataPortal. Posso explicar o que é a plataforma e ensinar-te a ' +
    'usar qualquer parte dela, do catálogo de dados até como fazer uma análise com IA. O que ' +
    'queres saber?',
}

export function ChatbotAjuda() {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([MENSAGEM_BOAS_VINDAS])
  const [texto, setTexto] = useState('')
  const [aEnviar, setAEnviar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)
  // Nunca no backoffice: este assistente ensina o portal público, não faz sentido dentro do admin.
  // Fica como variável (não um "return null" antes dos hooks abaixo): este componente vive no
  // layout raiz e nunca desmonta entre navegações — corta ali fazia o React chamar menos hooks ao
  // entrar em /admin vindo de qualquer outra rota, rebentando com "Rendered fewer hooks than
  // expected" (confirmado ao vivo em produção nessa transição exacta).
  // Também escondido em /ruas-360: o botão flutuante de "Solicitar este serviço" fica no mesmo
  // canto do ecrã e os dois sobrepunham-se.
  const escondidoNoAdmin =
    pathname === '/admin' || pathname?.startsWith('/admin/') || pathname === '/ruas-360'

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CHAVE_HISTORICO)
      if (guardado) {
        const dados = JSON.parse(guardado)
        if (Array.isArray(dados) && dados.length > 0) setMensagens(dados)
      }
    } catch {
      // localStorage indisponível (privado/bloqueado): fica só com a mensagem de boas-vindas.
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(mensagens.slice(-40)))
    } catch {
      // Idem: se não conseguir guardar, a conversa só não sobrevive a um refresh.
    }
  }, [mensagens])

  useEffect(() => {
    if (aberto) fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, aberto])

  async function enviar() {
    const pergunta = texto.trim()
    if (!pergunta || aEnviar) return
    setTexto('')
    setErro(null)
    const historico = [...mensagens, { role: 'user' as const, content: pergunta }]
    setMensagens(historico)
    setAEnviar(true)
    try {
      const res = await fetch('/api/chatbot-ajuda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: historico }),
      })
      const dados = await res.json().catch(() => null)
      if (!res.ok) {
        setErro(dados?.error || 'Não foi possível responder agora.')
        return
      }
      setMensagens((prev) => [...prev, { role: 'assistant', content: dados.texto }])
    } catch {
      setErro('Falha de ligação. Tenta novamente.')
    } finally {
      setAEnviar(false)
    }
  }

  if (escondidoNoAdmin) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="pd-chatbot-fab"
        aria-label={aberto ? 'Fechar assistente do portal' : 'Abrir assistente do portal'}
        title="Assistente do DataPortal"
      >
        {aberto ? <X size={22} strokeWidth={2} aria-hidden /> : <Bot size={22} strokeWidth={2} aria-hidden />}
        <span>Ajuda do portal</span>
      </button>

      {aberto && (
        <div className="pd-chatbot-panel" role="dialog" aria-label="Assistente do DataPortal">
          <div className="pd-chatbot-panel-header">
            <div className="flex items-center gap-2">
              <Bot size={18} aria-hidden />
              <span>Assistente do DataPortal</span>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
              className="pd-chatbot-panel-close"
            >
              <X size={16} aria-hidden />
            </button>
          </div>

          <div className="pd-chatbot-panel-body">
            {mensagens.map((m, i) => (
              <div key={i} className={`pd-chatbot-msg pd-chatbot-msg-${m.role}`}>
                {m.content}
              </div>
            ))}
            {aEnviar && (
              <div className="pd-chatbot-msg pd-chatbot-msg-assistant pd-chatbot-msg-loading">
                <Loader2 size={14} className="animate-spin" aria-hidden /> A escrever...
              </div>
            )}
            {erro && <div className="pd-chatbot-erro">{erro}</div>}
            <div ref={fimRef} />
          </div>

          <form
            className="pd-chatbot-panel-form"
            onSubmit={(e) => {
              e.preventDefault()
              enviar()
            }}
          >
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Como faço uma análise?"
              maxLength={500}
              aria-label="Escreve a tua pergunta sobre o portal"
              disabled={aEnviar}
            />
            <button type="submit" aria-label="Enviar" disabled={aEnviar || !texto.trim()}>
              <Send size={16} aria-hidden />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
