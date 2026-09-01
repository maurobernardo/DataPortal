import type { ReactNode } from 'react'
import Link from 'next/link'
import { FileText, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { BotaoImprimirDocumento } from './BotaoImprimirDocumento'

export type LegalSection = {
  id: string
  numero: string
  titulo: string
  conteudo: ReactNode
}

type LegalPageLayoutProps = {
  eyebrow: string
  titulo: string
  resumo: string
  versao: string
  actualizadoEm: string
  sections: LegalSection[]
  documentosRelacionados?: { href: string; label: string }[]
}

/**
 * Layout partilhado pelos três documentos legais (Termos, Cookies, Privacidade): estrutura de
 * documento numerado com índice fixo, não uma página de marketing. Uma plataforma que vai a
 * avaliação do INTIC precisa que estas páginas leiam como um documento sério e completo, não como
 * mais um bloco de cartões genéricos do resto do site.
 */
export function LegalPageLayout({
  eyebrow,
  titulo,
  resumo,
  versao,
  actualizadoEm,
  sections,
  documentosRelacionados = [],
}: LegalPageLayoutProps) {
  return (
    <div className="legal-doc font-body-stack">
      <header className="legal-doc-hero">
        <div className="legal-doc-inner">
          <p className="legal-doc-eyebrow">{eyebrow}</p>
          <h1 className="legal-doc-title">{titulo}</h1>
          <p className="legal-doc-summary">{resumo}</p>

          <div className="legal-doc-meta">
            <span>
              <strong>Versão</strong> {versao}
            </span>
            <span>
              <strong>Última actualização</strong> {actualizadoEm}
            </span>
            <span>
              <strong>Entidade responsável</strong> Data4Moz
            </span>
          </div>

          <div className="legal-doc-hero-actions">
            <BotaoImprimirDocumento />
          </div>
        </div>
      </header>

      <div className="legal-doc-inner legal-doc-body">
        <nav className="legal-doc-toc" aria-label="Índice do documento">
          <p className="legal-doc-toc-label">Índice</p>
          <ol>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  <span className="legal-doc-toc-num">{s.numero}</span>
                  {s.titulo}
                </a>
              </li>
            ))}
          </ol>

          {documentosRelacionados.length > 0 && (
            <div className="legal-doc-toc-related">
              <p className="legal-doc-toc-label">Documentos relacionados</p>
              <ul>
                {documentosRelacionados.map((d) => (
                  <li key={d.href}>
                    <Link href={d.href}>
                      <FileText size={14} aria-hidden />
                      {d.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <main className="legal-doc-content">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="legal-doc-section">
              <h2>
                <span className="legal-doc-section-num">{s.numero}</span>
                {s.titulo}
              </h2>
              <div className="legal-doc-section-body">{s.conteudo}</div>
            </section>
          ))}

          <section className="legal-doc-contact-box" aria-label="Contactos para exercer os seus direitos">
            <div className="legal-doc-contact-box-icon">
              <ShieldCheck size={20} aria-hidden />
            </div>
            <div>
              <p className="legal-doc-contact-box-title">Dúvidas ou pedidos sobre este documento</p>
              <p className="legal-doc-contact-box-text">
                Para questões sobre este documento, ou para exercer os seus direitos sobre dados
                pessoais, contacte directamente a Data4Moz, entidade responsável pelo Data Portal.
              </p>
              <ul className="legal-doc-contact-box-list">
                <li>
                  <Mail size={14} aria-hidden />
                  <a href="mailto:portaldedados@data4moz.com">portaldedados@data4moz.com</a>
                </li>
                <li>
                  <Phone size={14} aria-hidden />
                  <a href="tel:+258828863737">+258 82 886 3737</a>
                </li>
                <li>
                  <MapPin size={14} aria-hidden />
                  Rua de Barue, Condomínio da PAF 35, Chimoio, Moçambique
                </li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
