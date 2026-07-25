'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  MapPin, Clock, Download, Star, ArrowRight, ChevronDown, ChevronUp,
} from 'lucide-react'

interface CatalogCard {
  id: number
  icon?: React.ReactNode
  iconVariant: 'geo' | 'default'
  title: string
  desc: string
  updated: string
  downloads: string
  rating: string
  href: string
  formats: string[]
  tabs: string[]
  org: string
}

const TABS = ['Todos', 'Geoespacial', 'Alfanumérico']

const TRUST_LOGOS = [
  'INE', 'MADER', 'BANCO DE MOÇAMBIQUE',
  'UN MOZAMBIQUE', 'WORLD BANK', 'DATA4MOZ',
]

/* ── FORMAT CHIP ── */
function FormatChip({ label }: { label: string }) {
  return (
    <span style={{
      background: '#F7F9F8', border: '1px solid #D9DFDB',
      color: '#4A5A52', fontSize: 10, fontWeight: 600,
      padding: '2px 7px', borderRadius: 4,
      letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>
      {label}
    </span>
  )
}

/* ── CARD ── */
function Card({ card }: { card: CatalogCard }) {
  const [hovered, setHovered] = useState(false)

  const iconMap: Record<string, { bg: string; color: string }> = {
    geo:     { bg: '#E8F1FA', color: '#1F6FB2' },
    default: { bg: '#EEF8F2', color: '#0E7A47' },
  }
  const ic = iconMap[card.iconVariant]

  return (
    <Link
      href={card.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1px solid ${hovered ? '#1FA365' : '#E2E8E5'}`,
        borderRadius: 14,
        padding: '1.25rem 1.375rem',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        boxShadow: hovered
          ? '0 8px 24px rgba(14,122,71,0.10), 0 2px 6px rgba(11,27,20,.05)'
          : '0 1px 3px rgba(11,27,20,.04)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: hovered ? 'linear-gradient(90deg,#0E7A47,#1FA365)' : 'transparent',
        transition: 'background 0.18s',
      }} />

      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: ic.bg, color: ic.color, flexShrink: 0,
        }}>
          {card.icon ?? <MapPin size={18} strokeWidth={2} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#8B9A91', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {card.org}
          </span>
          <span style={{
            background: '#DCF1E5',
            color: '#064E2C',
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            flexShrink: 0,
          }}>
            Dados reais
          </span>
        </div>
      </div>

      {/* title */}
      <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0B1B14', marginBottom: '0.5rem', lineHeight: 1.3 }}>
        {card.title}
      </h3>

      {/* desc */}
      <p style={{ fontSize: '0.8125rem', color: '#4A5A52', lineHeight: 1.55, marginBottom: '1rem', flex: 1 }}>
        {card.desc}
      </p>

      {/* formats */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: '0.875rem' }}>
        {card.formats.map(f => <FormatChip key={f} label={f} />)}
      </div>

      {/* meta footer */}
      <div style={{
        display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#8B9A91',
        paddingTop: '0.75rem', borderTop: '1px solid #EEF2F0', flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} /> {card.updated}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Download size={11} /> {card.downloads}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Star size={11} /> {card.rating}
        </span>
        <span style={{
          marginLeft: 'auto', fontWeight: 600,
          color: hovered ? '#0E7A47' : '#8B9A91',
          transition: 'color 0.15s',
          display: 'inline-flex', alignItems: 'center', gap: 3,
        }}>
          Ver dataset <ArrowRight size={11} />
        </span>
      </div>
    </Link>
  )
}

/* ── TRUST STRIP ── */
function TrustStrip() {
  return (
    <div style={{
      background: '#fff',
      borderBottom: '1px solid #D9DFDB',
      padding: '1.25rem 0',
      overflow: 'hidden',
      fontFamily: '-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif',
    }}>
      <style>{`
        @keyframes pdmarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .pd-mtrack {
          display: flex;
          gap: 3.5rem;
          animation: pdmarquee 28s linear infinite;
          width: max-content;
        }
        .pd-mtrack:hover { animation-play-state: paused; }
        .pd-tlogo {
          color: #8B9A91;
          font-weight: 700;
          font-size: 0.8rem;
          letter-spacing: 0.07em;
          opacity: 0.65;
          white-space: nowrap;
          cursor: default;
          transition: opacity 0.15s, color 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }
        .pd-tlogo:hover { opacity: 1; color: #0E7A47; }
      `}</style>

      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 2rem',
        display: 'flex', alignItems: 'center', gap: '2rem',
      }}>
        <div style={{
          fontSize: '0.6875rem', color: '#8B9A91',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          Usado por
        </div>

        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className="pd-mtrack">
            {[...TRUST_LOGOS, ...TRUST_LOGOS].map((logo, i) => (
              <span key={i} className="pd-tlogo">
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#D9DFDB', display: 'inline-block', flexShrink: 0,
                }} />
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── MAIN ── */
export function CatalogSection({
  featuredCards,
  statsData,
}: {
  featuredCards: CatalogCard[]
  statsData: { datasets: number; organizations: number; apiCalls: number; views: number }
}) {
  const [activeTab, setActiveTab] = useState('Todos')
  const [showAll, setShowAll] = useState(false)
  const filtered = featuredCards.filter((c) => c.tabs.includes(activeTab))
  const visibleCards = showAll ? filtered : filtered.slice(0, 3)

  const tabCounts = TABS.reduce<Record<string, number>>((acc, tab) => {
    acc[tab] = featuredCards.filter((c) => c.tabs.includes(tab)).length
    return acc
  }, {})

  return (
    <>
      <style>{`
        .pd-catalog {
          padding: 4rem 0 5rem;
          background: #F7F9F8;
          font-family: -apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif;
        }
        .pd-catalog-inner { max-width: 1280px; margin: 0 auto; padding: 0 2rem; }

        .pd-cat-header {
          display: flex; justify-content: space-between;
          align-items: flex-end; margin-bottom: 1.5rem;
          gap: 1rem; flex-wrap: wrap;
        }
        .pd-cat-title {
          font-size: 2rem; font-weight: 700;
          letter-spacing: -0.025em; color: #0B1B14;
          margin-bottom: 0.375rem; line-height: 1.1;
        }
        .pd-cat-subtitle { color: #4A5A52; font-size: 0.9375rem; line-height: 1.5; }

        .pd-cat-link {
          color: #0E7A47; font-weight: 600; font-size: 0.875rem;
          text-decoration: none;
          display: inline-flex; align-items: center; gap: 0.25rem;
          white-space: nowrap; padding: 0.75rem 1rem;
          border: 1px solid #B8DFC8; border-radius: 12px;
          background: linear-gradient(180deg, #ffffff 0%, #f7fff9 100%);
          flex-shrink: 0;
          box-shadow: 0 6px 20px rgba(14,122,71,0.10);
          transition: background 0.15s, gap 0.15s, transform 0.15s;
        }
        .pd-cat-link:hover { background: #EEF8F2; gap: 0.5rem; transform: translateY(-1px); }

        /* stat bar */
        .pd-cat-statbar {
          display: flex; gap: 0;
          margin-bottom: 1.75rem;
          background: #fff;
          border: 1px solid #E2E8E5;
          border-radius: 12px;
          overflow: hidden;
        }
        .pd-cat-stat {
          flex: 1; padding: 0.875rem 1.25rem;
          border-right: 1px solid #E2E8E5;
          display: flex; flex-direction: column; gap: 2px;
        }
        .pd-cat-stat:last-child { border-right: none; }
        .pd-cat-stat-num {
          font-size: 1.25rem; font-weight: 700;
          color: #0B1B14; letter-spacing: -0.025em;
        }
        .pd-cat-stat-label {
          font-size: 0.6875rem; color: #8B9A91;
          text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600;
        }

        /* tabs */
        .pd-cat-tabs {
          display: flex; gap: 0;
          margin-bottom: 2rem;
          border-bottom: 1px solid #D9DFDB;
          overflow-x: auto; scrollbar-width: none;
        }
        .pd-cat-tabs::-webkit-scrollbar { display: none; }
        .pd-cat-tab {
          padding: 0.625rem 1.125rem;
          font-size: 0.875rem; font-weight: 500;
          color: #4A5A52; cursor: pointer;
          border: none; border-bottom: 2px solid transparent;
          margin-bottom: -1px; white-space: nowrap;
          background: none; font-family: inherit;
          transition: color 0.12s, border-color 0.12s;
        }
        .pd-cat-tab:hover { color: #0E7A47; }
        .pd-cat-tab.active {
          color: #0E7A47;
          border-bottom-color: #0E7A47;
          font-weight: 600;
        }
        .pd-tab-count {
          font-size: 0.75rem;
          color: #8B9A91;
          margin-left: 0.25rem;
        }

        /* grid */
        .pd-cat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }
        .pd-show-more-wrap {
          margin-top: 1.25rem;
          display: flex;
          justify-content: center;
        }
        .pd-show-more-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid #CDE8D7;
          background: linear-gradient(180deg, #ffffff 0%, #f0fbf4 100%);
          color: #0E7A47;
          border-radius: 999px;
          padding: 0.6rem 1.15rem;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform .12s, box-shadow .12s, background .12s;
          box-shadow: 0 6px 16px rgba(14,122,71,.08);
        }
        .pd-show-more-btn:hover {
          transform: translateY(-1px);
          background: #eef8f2;
        }

        @media (max-width: 1024px) { .pd-cat-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 640px) {
          .pd-cat-grid { grid-template-columns: 1fr; }
          .pd-cat-header { flex-direction: column; align-items: flex-start; }
          .pd-cat-title { font-size: 1.625rem; }
          .pd-cat-statbar { flex-wrap: wrap; }
          .pd-cat-stat { flex: 1 1 40%; border-bottom: 1px solid #E2E8E5; }
        }
      `}</style>

      <TrustStrip />

      <section className="pd-catalog">
        <div className="pd-catalog-inner">

          {/* Header */}
          <div className="pd-cat-header">
            <div>
              <h2 className="pd-cat-title">Catálogo em destaque</h2>
              <p className="pd-cat-subtitle">
                Datasets oficiais, prontos para análise. Filtre por sector, frescura e tipo de licença.
              </p>
            </div>
            <Link href="/dados-espaciais" className="pd-cat-link">
              Ver todos os datasets <ArrowRight size={14} />
            </Link>
          </div>

          {/* Stat bar */}
          <div className="pd-cat-statbar">
            {[
              { num: statsData.datasets.toLocaleString('pt-BR'), label: 'Datasets' },
              { num: statsData.organizations.toLocaleString('pt-BR'), label: 'Organizações' },
              { num: statsData.apiCalls.toLocaleString('pt-BR'), label: 'Chamadas API/mês' },
              { num: statsData.views.toLocaleString('pt-BR'), label: 'Visualizações' },
            ].map(s => (
              <div key={s.label} className="pd-cat-stat">
                <span className="pd-cat-stat-num">{s.num}</span>
                <span className="pd-cat-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="pd-cat-tabs">
            {TABS.map(tab => (
              <button
                key={tab}
                className={`pd-cat-tab${activeTab === tab ? ' active' : ''}`}
                onClick={() => {
                  setActiveTab(tab)
                  setShowAll(false)
                }}
              >
                {tab}
                <span className="pd-tab-count">({tabCounts[tab] || 0})</span>
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="pd-cat-grid">
            {visibleCards.length > 0 ? (
              visibleCards.map(card => <Card key={card.id} card={card} />)
            ) : (
              <div style={{
                gridColumn: '1 / -1', textAlign: 'center',
                padding: '3rem', color: '#8B9A91', fontSize: '0.9375rem',
              }}>
                Em breve datasets nesta categoria.
              </div>
            )}
          </div>
          {filtered.length > 3 && (
            <div className="pd-show-more-wrap">
              <button
                type="button"
                className="pd-show-more-btn"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll ? 'Ver menos' : `Ver mais (${filtered.length - 3})`}
                {showAll ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>
          )}

        </div>
      </section>
    </>
  )
}