'use client'

import { Mail, MapPin, Phone, Globe, Map, Send } from 'lucide-react'
import { FormEvent, useState } from 'react'

const mapsUrl =
  'https://www.google.com/maps/search/?api=1&query=Rua+de+Barue%2C+Condominio+da+PAF+35%2C+Chimoio%2C+Mozambique'

const INFO_CARDS = [
  {
    icon: Mail,
    label: 'Email',
    accent: '#064E2C',
    accentLight: '#F1F8F4',
    accentBorder: '#CFE3D6',
    labelColor: '#064E2C',
    content: (
      <a
        href="mailto:portaldedados@data4moz.com"
        className="text-[15px] text-[#064E2C] font-medium hover:underline transition"
      >
        portaldedados@data4moz.com
      </a>
    ),
  },
  {
    icon: Phone,
    label: 'Telefone',
    accent: '#dc2626',
    accentLight: '#fef2f2',
    accentBorder: '#fecaca',
    labelColor: '#b91c1c',
    content: (
      <div className="flex flex-col gap-0.5">
        <a href="tel:+17604504448" className="text-[15px] text-red-700 font-medium hover:underline transition block">
          +1 760 450 4448
        </a>
        <a href="tel:+258828863737" className="text-[15px] text-red-700 font-medium hover:underline transition block">
          +258 82 886 3737
        </a>
      </div>
    ),
  },
  {
    icon: MapPin,
    label: 'Localização',
    accent: '#064E2C',
    accentLight: '#F1F8F4',
    accentBorder: '#CFE3D6',
    labelColor: '#064E2C',
    content: (
      <div>
        <p className="text-[15px] text-gray-600 leading-relaxed mb-3">
          Rua de Barue, Condomínio da PAF 35,<br />Chimoio, Moçambique
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#CFE3D6] bg-[#F1F8F4] text-[12px] font-bold text-[#064E2C] hover:bg-[#E7F3EB] transition"
        >
          <Map className="w-3 h-3" />
          Ver no Google Maps
        </a>
      </div>
    ),
  },
  {
    icon: Globe,
    label: 'Website',
    accent: '#d97706',
    accentLight: '#fffbeb',
    accentBorder: '#fde68a',
    labelColor: '#92400e',
    content: (
      <div className="flex flex-col gap-0.5">
        <a
          href="https://dataportal.co.mz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[15px] text-amber-800 font-medium hover:underline transition block"
        >
          dataportal.co.mz
        </a>
        <a
          href="https://data4moz.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[15px] text-amber-800 font-medium hover:underline transition block"
        >
          data4moz.com
        </a>
      </div>
    ),
  },
]

type ContactsSectionProps = {
  /** Dentro do modal global: sem id na secção e com menos espaçamento vertical. */
  variant?: 'page' | 'modal'
}

export function ContactsSection({ variant = 'page' }: ContactsSectionProps) {
  const isModal = variant === 'modal'
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })

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
      setFormData({ name: '', email: '', subject: '', message: '' })
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
        isModal ? 'rounded-b-2xl py-10 md:py-11' : 'border-t border-[#E2E8E5] py-16 md:py-24'
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

        {/* ── Main layout: info cards left, form right ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-5 items-start">

          {/* Info cards */}
          <div className="flex flex-col gap-3">
            {INFO_CARDS.map(({ icon: Icon, label, accentLight, accentBorder, labelColor, content }, i) => (
              <div
                key={label}
                className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-start gap-4 hover:border-[#CFE3D6] hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 animate-slide-up"
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{ background: accentLight, borderColor: accentBorder }}
                >
                  <Icon className="w-4 h-4" style={{ stroke: labelColor } as React.CSSProperties} />
                </div>
                <div>
                  <p
                    className="text-[11px] font-bold tracking-widest uppercase mb-2"
                    style={{ color: labelColor }}
                  >
                    {label}
                  </p>
                  {content}
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
                  <label htmlFor="name" className="block text-[11px] font-bold tracking-widest uppercase text-gray-600">
                    Nome
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="O seu nome"
                    className="w-full px-3.5 py-3 text-[15px] border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#064E2C] focus:ring-2 focus:ring-[#E7F3EB] transition outline-none placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-[11px] font-bold tracking-widest uppercase text-gray-600">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    required
                    placeholder="O seu email"
                    className="w-full px-3.5 py-3 text-[15px] border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#064E2C] focus:ring-2 focus:ring-[#E7F3EB] transition outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="subject" className="block text-[11px] font-bold tracking-widest uppercase text-gray-600">
                  Assunto
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                  required
                  placeholder="Assunto da mensagem"
                  className="w-full px-3.5 py-3 text-[15px] border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#064E2C] focus:ring-2 focus:ring-[#E7F3EB] transition outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="message" className="block text-[11px] font-bold tracking-widest uppercase text-gray-600">
                  Mensagem
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                  required
                  placeholder="Escreva a sua mensagem..."
                  className="w-full px-3.5 py-3 min-h-[120px] text-[15px] border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#064E2C] focus:ring-2 focus:ring-[#E7F3EB] transition outline-none resize-none placeholder:text-gray-400"
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
                  className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#064E2C] text-white rounded-xl text-[15px] font-bold hover:bg-[#053D23] disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all duration-200 shadow-md shadow-[#064E2C]/20"
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