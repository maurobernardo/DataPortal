'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageSquareHeart, X, Loader2, CheckCircle2 } from 'lucide-react'

const MENSAGEM_PREDEFINIDA =
  'O seu feedback: estamos na fase beta do Data Portal e a sua opinião é importante para ' +
  'nos ajudar a melhorar. Conte-nos o que gostou, o que não funcionou bem, ou o que gostaria ' +
  'de ver a seguir.'

export function FeedbackBetaButton() {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [aEnviar, setAEnviar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [mensagem, setMensagem] = useState(MENSAGEM_PREDEFINIDA)

  const escondidoNoAdmin = pathname === '/admin' || pathname?.startsWith('/admin/')

  useEffect(() => {
    if (!aberto) return
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((dados) => {
        if (dados?.user?.name) setNome((prev) => prev || dados.user.name)
        if (dados?.user?.email) setEmail((prev) => prev || dados.user.email)
      })
      .catch(() => {})
  }, [aberto])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (aEnviar) return
    setErro(null)
    if (!nome.trim() || !email.trim() || !mensagem.trim()) {
      setErro('Preencha todos os campos.')
      return
    }
    setAEnviar(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, mensagem, paginaOrigem: pathname }),
      })
      const dados = await res.json().catch(() => null)
      if (!res.ok) {
        setErro(dados?.error || 'Não foi possível enviar o feedback agora.')
        return
      }
      setEnviado(true)
    } catch {
      setErro('Falha de ligação. Tente novamente.')
    } finally {
      setAEnviar(false)
    }
  }

  function fechar() {
    setAberto(false)
    setEnviado(false)
    setErro(null)
    setMensagem(MENSAGEM_PREDEFINIDA)
  }

  if (escondidoNoAdmin) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="pd-feedback-fab"
        aria-label="Enviar feedback sobre o portal"
        title="O seu feedback"
      >
        <MessageSquareHeart size={22} strokeWidth={2} aria-hidden />
        <span>O seu feedback</span>
      </button>

      {aberto && (
        <div className="pd-feedback-overlay" role="dialog" aria-label="Enviar feedback">
          <div className="pd-feedback-panel">
            <div className="pd-feedback-panel-header">
              <div className="flex items-center gap-2">
                <MessageSquareHeart size={18} aria-hidden />
                <span>O seu feedback</span>
              </div>
              <button type="button" onClick={fechar} aria-label="Fechar" className="pd-feedback-panel-close">
                <X size={16} aria-hidden />
              </button>
            </div>

            {enviado ? (
              <div className="pd-feedback-sucesso">
                <CheckCircle2 size={40} className="text-green-600" aria-hidden />
                <p>Obrigado pelo seu feedback. Ele foi enviado à equipa do Data Portal.</p>
                <button type="button" onClick={fechar} className="pd-feedback-btn-primario">
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={enviar} className="pd-feedback-form">
                <p className="pd-feedback-intro">
                  Estamos na fase beta do Data Portal e a sua opinião é importante para nos ajudar a
                  melhorar.
                </p>

                <label className="pd-feedback-label">
                  Nome
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="O seu nome"
                    required
                  />
                </label>

                <label className="pd-feedback-label">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="o.seu@email.com"
                    required
                  />
                </label>

                <label className="pd-feedback-label">
                  Mensagem
                  <textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    rows={5}
                    required
                  />
                </label>

                {erro && <p className="pd-feedback-erro">{erro}</p>}

                <button type="submit" disabled={aEnviar} className="pd-feedback-btn-primario">
                  {aEnviar ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
                  {aEnviar ? 'A enviar...' : 'Enviar feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
