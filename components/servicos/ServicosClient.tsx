'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { RevealOnScroll } from '@/components/RevealOnScroll'
import '../../app/servicos.css'

type ServicoTool = {
  numero: string
  titulo: string
  desc: string
  meta: string
  who: string
  href: string
  icon: 'geo' | 'alfa' | 'mapa' | 'dash' | 'ia' | 'relatorio' | 'alerta' | 'download' | 'ruas360'
  badge?: { texto: string; classe: 'new' | 'pro' | 'soon' }
}

type ServicoConsulta = {
  titulo: string
  desc: string
  out: string
  href: string
  icon: 'recolha' | 'consultoria' | 'formacao' | 'integracao'
}

function Icon({ tipo }: { tipo: ServicoTool['icon'] | ServicoConsulta['icon'] }) {
  switch (tipo) {
    case 'geo':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Z" />
          <path d="M9 3v15M15 6v15" />
        </svg>
      )
    case 'alfa':
      return (
        <svg viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M9 9v11M3 14h18" />
        </svg>
      )
    case 'mapa':
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="10" r="3" />
          <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z" />
        </svg>
      )
    case 'dash':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      )
    case 'ia':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
          <circle cx="12" cy="12" r="3.4" />
        </svg>
      )
    case 'relatorio':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
      )
    case 'alerta':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8Z" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      )
    case 'download':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M7 10l5 5 5-5M12 15V3" />
        </svg>
      )
    case 'ruas360':
      return (
        <svg viewBox="0 0 24 24">
          <ellipse cx="12" cy="13" rx="9" ry="5" />
          <circle cx="12" cy="13" r="2.6" />
          <path d="M7 6.5C8.7 5.6 10.3 5 12 5s3.3.6 5 1.5" />
        </svg>
      )
    case 'recolha':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M9 11l3 3 8-8" />
          <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
        </svg>
      )
    case 'consultoria':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M12 2 3 7v6c0 5 3.8 8.4 9 9 5.2-.6 9-4 9-9V7l-9-5Z" />
          <path d="M9.5 12.5 11 14l3.5-3.5" />
        </svg>
      )
    case 'formacao':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M22 10 12 5 2 10l10 5 10-5Z" />
          <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
        </svg>
      )
    case 'integracao':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      )
  }
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  )
}

function Tick() {
  return (
    <span className="tick">
      <svg viewBox="0 0 12 12">
        <polyline points="2,6 5,9 10,3" />
      </svg>
    </span>
  )
}

export function ServicosClient({
  totalDatasets,
  organizacoes,
  ferramentas,
  consulta,
}: {
  totalDatasets: number
  organizacoes: number
  ferramentas: ServicoTool[]
  consulta: ServicoConsulta[]
}) {
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [form, setForm] = useState({ name: '', org: '', email: '', subject: 'Recolha de dados sob encomenda', message: '' })

  // Um link "Solicitar este serviço" noutra página (ex.: Ruas 360°) traz o assunto já escolhido
  // via ?assunto=..., para quem chega já saber a que se refere sem ter de encontrar a opção certa
  // no menu. Lido no cliente (não em searchParams do servidor) para não obrigar toda a página a
  // Suspense só por causa deste caso.
  useEffect(() => {
    const assunto = new URLSearchParams(window.location.search).get('assunto')
    if (assunto) setForm((p) => ({ ...p, subject: assunto }))
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: `${form.subject}${form.org ? ` (${form.org})` : ''}`,
          message: form.message,
          purpose: 'outro',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Não foi possível enviar o pedido.')
      setFeedback({ type: 'ok', msg: 'Pedido enviado. Respondemos em até 48 horas úteis.' })
      setForm({ name: '', org: '', email: '', subject: form.subject, message: '' })
    } catch (err: any) {
      setFeedback({ type: 'err', msg: err.message || 'Erro ao enviar o pedido.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="svc">
      {/* HERO: fotografia real de fundo, sem widget de demonstração */}
      <header className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="hero-scrim" aria-hidden />
        <div className="wrap hero-in">
          <RevealOnScroll>
            <span className="eyebrow on-dark">Serviços · Portal de Dados</span>
          </RevealOnScroll>
          <RevealOnScroll delayMs={70}>
            <h1>
              Dados prontos para <span className="hl">decidir</span>, não só para descarregar.
            </h1>
          </RevealOnScroll>
          <RevealOnScroll delayMs={140}>
            <p className="lede on-dark">
              Do catálogo aberto à consultoria dedicada: {ferramentas.length + consulta.length} formas de
              transformar os dados públicos de Moçambique em decisões defensáveis; explorar um mapa,
              perguntar em português, ou encomendar a recolha que ainda não existe.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delayMs={210}>
            <div className="hero-actions">
              <Link className="btn btn-amber pd-press" href="/analise/nova">
                Experimentar a análise por IA →
              </Link>
              <a
                className="btn btn-ghost-d pd-press"
                href="mailto:portaldedados@data4moz.com?subject=Falar%20com%20um%20especialista&body=Ol%C3%A1%2C%0A%0AGostaria%20de%20falar%20com%20um%20especialista%20do%20Data%20Portal%20sobre%3A%0A%0A"
              >
                Falar com um especialista
              </a>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delayMs={280}>
            <div className="trust">
              <div>
                <b>{totalDatasets}</b>datasets publicados<br />e versionados
              </div>
              <div>
                <b>{organizacoes}</b>organizações<br />fornecedoras
              </div>
              <div>
                <b>{ferramentas.length}</b>serviços activos<br />hoje
              </div>
              <div>
                <b>&lt;48h</b>resposta a<br />pedidos institucionais
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </header>

      {/* 3 CAMINHOS */}
      <div className="wrap">
        <div className="paths">
          <RevealOnScroll delayMs={0}>
          <div className="path p1">
            <span className="cap" />
            <div className="k">
              <h3>Explorar</h3>
              <span className="price">Gratuito</span>
            </div>
            <p className="lede" style={{ fontSize: 14.5 }}>
              Catálogo aberto, mapas e dashboards. Sem registo para consultar.
            </p>
            <ul>
              <li>
                <Tick />
                {totalDatasets} datasets geoespaciais e alfanuméricos
              </li>
              <li>
                <Tick />
                Mapas inteligentes e dashboards públicos
              </li>
              <li>
                <Tick />
                Licença aberta, com citação
              </li>
            </ul>
            <Link href="/dados-espaciais" className="go">
              Ver catálogo completo →
            </Link>
          </div>
          </RevealOnScroll>
          <RevealOnScroll delayMs={80}>
          <div className="path p2">
            <span className="cap" />
            <div className="k">
              <h3>Perguntar</h3>
              <span className="price">Análise por IA</span>
            </div>
            <p className="lede" style={{ fontSize: 14.5 }}>
              Para quem precisa de uma resposta agora, com números auditáveis.
            </p>
            <ul>
              <li>
                <Tick />
                Pergunta em português, sem código
              </li>
              <li>
                <Tick />
                Cada número rastreável até ao dado de origem
              </li>
              <li>
                <Tick />
                Dashboard gerado na hora
              </li>
            </ul>
            <Link href="/analise/nova" className="go">
              Fazer uma pergunta →
            </Link>
          </div>
          </RevealOnScroll>
          <RevealOnScroll delayMs={160}>
          <div className="path p3">
            <span className="cap" />
            <div className="k">
              <h3>Contratar</h3>
              <span className="price">Proposta em 48h</span>
            </div>
            <p className="lede" style={{ fontSize: 14.5 }}>
              Quando o dado não existe, ou a decisão exige análise dedicada.
            </p>
            <ul>
              <li>
                <Tick />
                Recolha de dados à medida e inquéritos
              </li>
              <li>
                <Tick />
                Consultoria estratégica e formação
              </li>
              <li>
                <Tick />
                Integração de dados em tempo real
              </li>
            </ul>
            <Link href="#consultoria" className="go">
              Ver serviços sob consulta →
            </Link>
          </div>
          </RevealOnScroll>
        </div>
      </div>

      {/* FERRAMENTAS */}
      <section id="ferramentas">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Auto-serviço · disponível agora</span>
              <h2>O que precisa de fazer hoje?</h2>
              <p className="lede">
                {ferramentas.length} ferramentas prontas a usar, com dados reais do portal, actualizados
                continuamente.
              </p>
            </div>
          </div>
          <div className="grid-3">
            {ferramentas.map((f, i) => (
              <RevealOnScroll key={f.numero} delayMs={Math.min(i, 7) * 50}>
                <Link href={f.href} className={`card pd-card-lift${f.href === '#' ? ' disabled' : ''}`}>
                  {f.badge && <span className={`badge ${f.badge.classe}`}>{f.badge.texto}</span>}
                  <span className={`ico${f.icon === 'ia' ? ' i' : f.icon === 'alerta' ? ' a' : ''}`}>
                    <Icon tipo={f.icon} />
                  </span>
                  <h3>{f.titulo}</h3>
                  <p>{f.desc}</p>
                  <div className="meta">
                    <span className="chip">{f.meta}</span>
                    <span className="who">{f.who}</span>
                  </div>
                  <span className="go-btn">
                    {f.href === '#' ? 'Brevemente' : 'Abrir'}
                    {f.href !== '#' && <ArrowIcon />}
                  </span>
                </Link>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* CONSULTORIA */}
      <section id="consultoria" className="band">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow on-dark">Serviços sob consulta</span>
              <h2 style={{ color: '#fff' }}>Quando a resposta ainda não está no catálogo.</h2>
              <p className="lede on-dark">
                {consulta.length} linhas de trabalho conduzidas pela equipa Data4Moz, com entregáveis
                definidos, prazos acordados e transferência de conhecimento incluída.
              </p>
            </div>
          </div>
          <div className="cap-grid">
            {consulta.map((c, i) => (
              <RevealOnScroll key={c.titulo} delayMs={Math.min(i, 5) * 60}>
                <div className="cap-card">
                  <span className="ico">
                    <Icon tipo={c.icon} />
                  </span>
                  <h3>{c.titulo}</h3>
                  <p>{c.desc}</p>
                  <span className="out">{c.out}</span>
                </div>
              </RevealOnScroll>
            ))}
          </div>

          <div className="leadbox">
            <div>
              <span className="eyebrow on-dark">Pedido de proposta</span>
              <h3 style={{ color: '#fff', fontSize: 26, margin: '10px 0 12px', letterSpacing: '-.025em' }}>
                Diga-nos a decisão que tem pela frente.
              </h3>
              <p className="lede on-dark" style={{ fontSize: 15 }}>
                Respondemos em menos de 48 horas úteis com âmbito, prazo e orçamento indicativo. Sem
                compromisso.
              </p>
              <div className="src" style={{ marginTop: 18 }}>
                <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#DCE8E0' }}>
                  Resposta &lt;48h
                </span>
                <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#DCE8E0' }}>
                  portaldedados@data4moz.com
                </span>
                <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#DCE8E0' }}>
                  PT / EN
                </span>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="f-grid">
                <input
                  className="field"
                  placeholder="Nome"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
                <input
                  className="field"
                  placeholder="Organização"
                  value={form.org}
                  onChange={(e) => setForm((p) => ({ ...p, org: e.target.value }))}
                />
                <input
                  className="field span"
                  type="email"
                  placeholder="Email institucional"
                  required
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
                <select
                  className="field span"
                  value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                >
                  {consulta.map((c) => (
                    <option key={c.titulo} value={c.titulo}>
                      {c.titulo}
                    </option>
                  ))}
                </select>
                <textarea
                  className="field span"
                  placeholder="Descreva a decisão ou o problema…"
                  required
                  rows={3}
                  style={{ paddingBottom: 12, resize: 'vertical' }}
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                />
              </div>
              {feedback && (
                <div className={`feedback ${feedback.type === 'ok' ? 'ok' : 'err'}`} style={{ marginTop: 12 }}>
                  {feedback.msg}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn btn-amber pd-press" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
                {loading ? 'A enviar…' : 'Enviar pedido →'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* CONFIANÇA */}
      <section id="confianca">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Confiança</span>
              <h2>Porque é que pode citar estes números.</h2>
            </div>
          </div>
          <div className="gov">
            <div>
              <b>Proveniência rastreável</b>
              <p>Cada indicador liga à fonte primária, ano e instituição responsável.</p>
            </div>
            <div>
              <b>Actualização declarada</b>
              <p>Data da última actualização e periodicidade visíveis em cada dataset.</p>
            </div>
            <div>
              <b>Licenciamento claro</b>
              <p>Licença aberta com atribuição; condições comerciais explícitas quando aplicável.</p>
            </div>
            <div>
              <b>Auditabilidade da IA</b>
              <p>Toda a análise por IA mostra o método e as linhas usadas em cada número.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="finalcta" style={{ padding: '56px 0 116px' }}>
        <div className="wrap cta-in">
          <div>
            <h2 style={{ fontSize: 30, marginBottom: 8 }}>Não encontrou o dado de que precisa?</h2>
            <p className="lede" style={{ fontSize: 16 }}>
              Diga-nos qual é; dizemos-lhe em 48h se já existe, ou quanto custa recolhê-lo.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn btn-green pd-press" href="#consultoria">
              Pedir um dataset
            </Link>
            <Link className="btn btn-ghost pd-press" href="#consultoria">
              Falar connosco
            </Link>
          </div>
        </div>
      </section>

      {/* Barra fixa: dados reais, botões funcionais (catálogo real e âncora do pedido de proposta) */}
      <div className="stickybar">
        <div className="sb-in">
          <p>
            <b>{totalDatasets} datasets abertos.</b> Precisa de mais profundidade, actualização contínua ou
            recolha nova?
          </p>
          <div className="sb-actions">
            <Link className="btn btn-sm btn-ghost-d pd-press" href="/dados-espaciais">
              Ver catálogo
            </Link>
            <Link className="btn btn-sm btn-amber pd-press" href="#consultoria">
              Pedir proposta →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
