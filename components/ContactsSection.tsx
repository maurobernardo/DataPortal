'use client'

import { ArrowUpRight, Building2, ChevronDown, Globe, Mail, MapPin, Phone, Send } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { OPCOES_FINALIDADE_CONTACTO } from '@/lib/user-profile-options'

const mapsUrl =
  'https://www.google.com/maps/search/?api=1&query=Rua+de+Barue%2C+Condominio+da+PAF+35%2C+Chimoio%2C+Mozambique'

// Tratamento de link único para todo o painel (mesmo verde institucional em qualquer item) — antes
// cada card tinha a sua própria cor "de acento" (verde, vermelho, cinza, amarelo) sem nenhum
// sistema por trás; o vermelho no telefone em particular colidia com o significado de erro/alerta
// usado no resto da interface, sem ter nada a ver com isso aqui.
const LINK_CLASS = 'text-[15px] font-semibold text-[#064E2C] hover:underline underline-offset-2 transition-colors'

const CONTACT_ITEMS = [
  {
    icon: Mail,
    label: 'Email',
    render: () => (
      <a href="mailto:portaldedados@data4moz.com" className={LINK_CLASS}>
        portaldedados@data4moz.com
      </a>
    ),
  },
  {
    icon: Phone,
    label: 'Telefone',
    render: () => (
      <div className="flex flex-col gap-0.5">
        <a href="tel:+17604504448" className={`${LINK_CLASS} block`}>
          +1 760 450 4448
        </a>
        <a href="tel:+258828863737" className={`${LINK_CLASS} block`}>
          +258 82 886 3737
        </a>
      </div>
    ),
  },
  {
    icon: MapPin,
    label: 'Localização',
    render: () => (
      <div>
        <p className="text-[15px] font-semibold text-gray-900 leading-relaxed">
          Rua de Barue, Condomínio da PAF 35, Chimoio, Moçambique
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-1.5 text-[13px] font-semibold text-[#064E2C] hover:underline underline-offset-2 transition-colors"
        >
          Ver no Google Maps
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
        </a>
      </div>
    ),
  },
  {
    icon: Globe,
    label: 'Website',
    render: () => (
      <div className="flex flex-col gap-0.5">
        <a href="https://dataportal.co.mz" target="_blank" rel="noopener noreferrer" className={`${LINK_CLASS} block`}>
          dataportal.co.mz
        </a>
        <a href="https://data4moz.com/" target="_blank" rel="noopener noreferrer" className={`${LINK_CLASS} block`}>
          data4moz.com
        </a>
      </div>
    ),
  },
  {
    icon: Building2,
    label: 'Organização',
    render: () => (
      <p className="text-[15px] font-semibold text-gray-900 leading-relaxed">
        Data4Moz: entidade responsável pelo Data Portal
      </p>
    ),
  },
]

const FIELD_CLASS =
  'w-full px-3.5 py-3 text-[15px] border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#064E2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] focus-visible:ring-offset-1 transition placeholder:text-gray-400'
const FIELD_LABEL_CLASS = 'block text-[11px] font-bold tracking-widest uppercase text-gray-600'

type ContactsSectionProps = {
  /** Dentro do modal global: sem id na secção e com menos espaçamento vertical. */
  variant?: 'page' | 'modal'
}

export function ContactsSection({ variant = 'page' }: ContactsSectionProps) {
  const isModal = variant === 'modal'
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '', purpose: '' })

  // Preenche o assunto quando se chega aqui a partir de um pedido de serviço "sob consulta" (ex.:
  // /servicos, /?assunto=Formação%20e%20capacitação#contato) — sem isto a pessoa tinha de escrever
  // outra vez, à mão, o serviço que já tinha escolhido no ecrã anterior.
  const searchParams = useSearchParams()
  useEffect(() => {
    const assunto = searchParams.get('assunto')
    if (assunto) setFormData((p) => ({ ...p, subject: assunto }))
  }, [searchParams])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Não foi possível enviar a mensagem.')
      setFeedback({ type: 'success', message: 'Mensagem enviada com sucesso! Entraremos em contacto em breve.' })
      setFormData({ name: '', email: '', subject: '', message: '', purpose: '' })
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Erro ao enviar mensagem.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id={isModal ? undefined : 'contato'}
      className={`font-body-stack relative overflow-hidden bg-gradient-to-b from-[#f0f5f1] to-[#e8f0ea] ${
        isModal ? 'rounded-b-2xl py-10 md:py-11' : 'border-t border-[#E2E8E5] py-9 md:py-12'
      }`}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full bg-[radial-gradient(circle,_#bbf7d0_0%,_transparent_65%)] opacity-45" />
      <div className="pointer-events-none absolute -bottom-20 -right-16 w-80 h-80 rounded-full bg-[radial-gradient(circle,_#fecaca_0%,_transparent_65%)] opacity-30" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ── Header ── */}
        <div className="mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F8F4] border border-[#CFE3D6] px-4 py-1.5 mb-5">
            <span className="w-2 h-2 rounded-full bg-[#064E2C] animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#064E2C]">
              Contacto
            </span>
          </div>
          <h2
            id={isModal ? 'contact-modal-title' : undefined}
            className="text-3xl md:text-4xl lg:text-[40px] font-extrabold text-gray-900 leading-[1.12] mb-3 tracking-tight"
          >
            Entre em <span className="text-[#064E2C]">contacto</span>
          </h2>
          <p className="text-[16px] md:text-[17px] text-gray-600 leading-relaxed max-w-xl">
            Tem alguma dúvida ou precisa de assistência? A nossa equipa está disponível para ajudar.
          </p>
        </div>

        {/* ── Main layout: contact panel left, form right — mesma altura (grid stretch), painel
            de contactos primeiro no DOM para empilhar antes do formulário em mobile. ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-5">

          {/* Painel de contactos: um único painel com linhas separadas por hairline, não 4 cards.
              Cabeçalho igual ao do formulário ao lado — sem isto, o painel ficava com muito menos
              conteúdo do que o formulário (que tem 6 campos) e sobrava espaço em branco por
              preencher visualmente sem inventar informação real (horário, morada exacta no mapa,
              etc. que não estão confirmados). */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-slide-up flex flex-col">
            <div className="px-5 pt-6 pb-5 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Os nossos contactos</h3>
              <p className="text-[14px] text-gray-600">Estes são os canais oficiais do Data Portal.</p>
            </div>
            {CONTACT_ITEMS.map(({ icon: Icon, label, render }, i) => (
              <div
                key={label}
                className={`flex items-start gap-4 px-5 py-4 min-h-11 ${i > 0 ? 'border-t border-gray-100' : ''}`}
              >
                <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#F1F8F4] border border-[#CFE3D6] text-[#064E2C] mt-0.5">
                  <Icon className="w-4 h-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-wide uppercase text-gray-600 mb-1">{label}</p>
                  {render()}
                </div>
              </div>
            ))}
          </div>

          {/* Contact form */}
          <div
            className="bg-white border border-gray-200 rounded-2xl p-7 animate-slide-up shadow-sm"
            style={{ animationDelay: '0.28s' }}
          >
            {/* Form header */}
            <div className="mb-6 pb-5 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Envie-nos uma mensagem</h3>
              <p className="text-[14px] text-gray-600">Respondemos com a maior brevidade possível.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className={FIELD_LABEL_CLASS}>
                    Nome
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="O seu nome"
                    className={FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className={FIELD_LABEL_CLASS}>
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    required
                    placeholder="O seu email"
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="purpose" className={FIELD_LABEL_CLASS}>
                  Para que fim pretende utilizar os dados?
                </label>
                <div className="relative">
                  <select
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData((p) => ({ ...p, purpose: e.target.value }))}
                    required
                    className={`${FIELD_CLASS} appearance-none pr-10`}
                  >
                    <option value="" disabled>
                      Seleccione uma opção
                    </option>
                    {OPCOES_FINALIDADE_CONTACTO.map((opcao) => (
                      <option key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-500"
                    aria-hidden
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="subject" className={FIELD_LABEL_CLASS}>
                  Assunto
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                  required
                  placeholder="Assunto da mensagem"
                  className={FIELD_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="message" className={FIELD_LABEL_CLASS}>
                  Mensagem
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                  required
                  placeholder="Escreva a sua mensagem..."
                  className={`${FIELD_CLASS} min-h-[120px] resize-none`}
                />
              </div>

              {feedback && (
                <div
                  className={`rounded-xl px-4 py-3 text-[12px] font-semibold border ${
                    feedback.type === 'success'
                      ? 'bg-[#F1F8F4] text-[#064E2C] border-[#CFE3D6]'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#064E2C] text-white rounded-xl text-[15px] font-bold hover:bg-[#053D23] disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all duration-200 shadow-md shadow-[#064E2C]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C] focus-visible:ring-offset-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {loading ? 'A enviar...' : 'Enviar Mensagem'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </section>
  )
}
