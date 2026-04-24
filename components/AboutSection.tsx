'use client'

import { Mail, Globe2, Database, Map, ArrowRight, Linkedin, BarChart3 } from 'lucide-react'
import Image from 'next/image'

export function AboutSection() {
  return (
    <section
      id="sobre"
      className="py-12 md:py-16 lg:py-20 px-4 bg-white relative overflow-hidden"
    >
      {/* Background decorativo com as cores do sistema */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-100 via-emerald-100 to-green-200 rounded-full blur-3xl opacity-40 -z-0 animate-pulse" />
      <div
        className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-br from-green-100 via-white to-emerald-100 rounded-full blur-3xl opacity-30 -z-0 animate-pulse"
        style={{ animationDelay: '1s' }}
      />

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Título / Identidade */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-4 px-4 py-2 rounded-full bg-green-50 border border-green-100 shadow-sm mb-4">
            <div className="relative w-10 h-10 rounded-full bg-white shadow-inner flex items-center justify-center overflow-hidden">
              <Image
                src="/images/logo.png"
                alt="Data4Moz Logo"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold tracking-wide text-green-700 uppercase">
                Sobre a Plataforma DataPortal
              </p>
              <p className="text-xs text-gray-500">
                Dados geoespaciais, alfanuméricos e relatorios 
              </p>
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 relative inline-block">
            
          </h2>
          <p className="max-w-3xl mx-auto text-base md:text-lg text-gray-600">
            Uma iniciativa dedicada a organizar, qualificar e democratizar o acesso a dados, apoiando decisões públicas, pesquisa, negócios e cidadania.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 lg:gap-12 items-center">
          {/* Lado Esquerdo - Card com logo e manifesto */}
          <div className="relative animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-green-400/30 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-emerald-400/20 blur-3xl" />

              <div className="relative flex items-center gap-4 mb-6">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm overflow-hidden">
                  <Image
                    src="/images/logo.png"
                    alt="Data4Moz Logo"
                    width={72}
                    height={72}
                    className="object-contain drop-shadow-md"
                  />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-white">
                    Data4Moz – Data Portal
                  </h3>
                  <p className="text-sm text-emerald-100">
                    Infraestrutura de dados aberta, moderna e colaborativa.
                  </p>
                </div>
              </div>

              <p className="text-sm md:text-base text-emerald-50 leading-relaxed mb-4">
                O Data Portal da Data4Moz reúne num único lugar dados geoespaciais, séries
                estatísticas e relatórios temáticos, com foco em qualidade, transparência e
                reutilização. Tudo isso com uma experiência visual pensada para ser simples
                e agradável.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-emerald-50">
                <div className="bg-white/5 rounded-2xl px-3 py-3 border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe2 className="w-4 h-4 text-emerald-100" />
                    <span className="font-semibold">Geoespacial</span>
                  </div>
                  <p className="text-xs text-emerald-100/90">
                    Camadas e mapas sobre território, infraestruturas e ambiente.
                  </p>
                </div>
                <div className="bg-white/5 rounded-2xl px-3 py-3 border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-emerald-100" />
                    <span className="font-semibold">Alfanumérico</span>
                  </div>
                  <p className="text-xs text-emerald-100/90">
                    Indicadores, estatísticas e séries temporais em formatos abertos.
                  </p>
                </div>
                <div className="bg-white/5 rounded-2xl px-3 py-3 border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-emerald-100" />
                    <span className="font-semibold">Relatórios</span>
                  </div>
                  <p className="text-xs text-emerald-100/90">
                    Análises, estudos e dashboards que transformam dados em decisões.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lado Direito - Texto institucional */}
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="space-y-4">
              <p className="text-gray-700 leading-relaxed text-base md:text-lg animate-fade-in">
                <strong className="text-gray-900">DataPortal</strong> é uma iniciativa focada
                em fortalecer o ecossistema de dados. O portal foi pensado
                para ser a “casa digital” onde instituições públicas, academia, empresas e
                a sociedade civil encontram dados confiáveis, bem documentados e fáceis de
                usar.
              </p>

              <p className="text-gray-700 leading-relaxed text-base md:text-lg animate-fade-in">
                A plataforma combina um catálogo estruturado, mecanismos de pesquisa
                inteligentes e download de dados, permitindo explorar dados por
                temas, anos, formatos e fontes.
              </p>

              <p className="text-gray-700 leading-relaxed text-base md:text-lg animate-fade-in">
                Mais do que um repositório, o Data Portal é parte da identidade visual e
                tecnológica da <strong>Data4Moz</strong>  .
              </p>
            </div>

            {/* Link Sobre em card */}
            <div className="pt-2 animate-fade-in" style={{ animationDelay: '1.0s' }}>
              <div className="inline-flex items-center rounded-2xl border border-green-200 bg-green-50 px-4 py-3 shadow-sm">
                <a
                  href="#contato"
                  className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-semibold transition group"
                >
                  <span>Fale com a equipa Data4Moz</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </a>
              </div>
            </div>

            {/* Ícones de Contacto / Redes */}
            <div
              className="flex flex-wrap gap-4 pt-4 animate-fade-in"
              style={{ animationDelay: '1.2s' }}
            >
              <a
                href="mailto:portaldedados@data4moz.com"
                className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 hover-lift group"
                aria-label="Email Data4Moz"
              >
                <Mail className="w-5 h-5 group-hover:animate-bounce" />
              </a>

              <a
                href="#"
                className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-600 to-sky-700 flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 hover-lift group"
                aria-label="LinkedIn Data4Moz"
              >
                <Linkedin className="w-5 h-5 group-hover:scale-110" />
              </a>

              <a
                href="/dados-espaciais"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-green-200 bg-white text-sm font-medium text-green-700 hover:bg-green-50 hover:border-green-300 transition shadow-sm"
              >
                <Map className="w-4 h-4" />
                <span>Explorar dados no portal</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
