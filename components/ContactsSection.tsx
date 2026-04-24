'use client'

import { Mail, MapPin, Phone, Globe, Map } from 'lucide-react'
import { FormEvent, useState } from 'react'

export function ContactsSection() {
  const mapsUrl =
    'https://www.google.com/maps/search/?api=1&query=Rua+de+Barue%2C+Condominio+da+PAF+35%2C+Chimoio%2C+Mozambique'
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

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

      if (!response.ok) {
        throw new Error(data?.error || 'Não foi possível enviar a mensagem.')
      }

      setFeedback({ type: 'success', message: 'Mensagem enviada com sucesso!' })
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Erro ao enviar mensagem.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="contato" className="py-16 md:py-20 px-4 bg-gradient-to-br from-green-50 to-yellow-50/30 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-green-200 to-green-300 rounded-full blur-3xl opacity-20 -z-0 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-red-200 to-yellow-200 rounded-full blur-3xl opacity-20 -z-0 animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center mb-12 animate-slide-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4 relative inline-block">
            Entre em <span className="bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">Contacto</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Tem alguma dúvida ou precisa de assistência? Estamos aqui para ajudar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Email */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover-lift transition-all duration-300 border border-gray-100 animate-slide-up group hover:border-green-300">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:rotate-6 mb-4">
              <Mail className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Email</h3>
            <a 
              href="mailto:portaldedados@data4moz.com" 
              className="text-green-600 hover:text-green-700 transition text-sm md:text-base"
            >
              portaldedados@data4moz.com
            </a>
          </div>

          {/* Telefone */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover-lift transition-all duration-300 border border-gray-100 animate-slide-up group hover:border-green-300" style={{ animationDelay: '0.1s' }}>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:rotate-6 mb-4">
              <Phone className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Telefone</h3>
            <a 
              href="tel:+258828863737" 
              className="text-red-600 hover:text-red-700 transition text-sm md:text-base"
            >
              +258 828863737
            </a>
          </div>

          {/* Localização */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover-lift transition-all duration-300 border border-gray-100 animate-slide-up group hover:border-green-300" style={{ animationDelay: '0.2s' }}>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:rotate-6 mb-4">
              <MapPin className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Localização</h3>
            <p className="text-green-600 text-sm md:text-base mb-3">
              Rua de Barue, Condominio da PAF 35, Chimoio, Mozambique
            </p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 transition"
            >
              <Map className="w-4 h-4" />
              Google Maps
            </a>
          </div>

          {/* Website */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover-lift transition-all duration-300 border border-gray-100 animate-slide-up group hover:border-green-300" style={{ animationDelay: '0.3s' }}>
            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:rotate-6 mb-4">
              <Globe className="w-7 h-7 text-yellow-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Website</h3>
            <a 
              href="https://www.dataportall.com" 
              className="text-yellow-600 hover:text-yellow-700 transition text-sm md:text-base"
            >
              www.dataportall.com
            </a>
          </div>
        </div>

        {/* Formulário de contato opcional */}
        <div className="mt-12 bg-white rounded-2xl p-8 shadow-lg border border-gray-100 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 text-center">Envie-nos uma mensagem</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                placeholder="Seu email"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">Assunto</label>
              <input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                placeholder="Assunto da mensagem"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
              <textarea
                id="message"
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                placeholder="Sua mensagem..."
              ></textarea>
            </div>
            {feedback && (
              <div className={`md:col-span-2 rounded-lg px-4 py-3 text-sm font-medium ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {feedback.message}
              </div>
            )}
            <div className="md:col-span-2 text-center">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold shadow-lg hover:shadow-green-500/30 hover:scale-105 transition-all duration-300"
              >
                {loading ? 'Enviando...' : 'Enviar Mensagem'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}