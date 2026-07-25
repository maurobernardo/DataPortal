'use client'

import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { OpenContactTrigger } from '@/components/OpenContactTrigger'
import {
  CAPEX_BY_RISK,
  type FeederPulseBundle,
  type FeederRecord,
  RISK_COLORS,
  RISK_PILL_CLASS,
  fmtNum,
  markerRadius,
  provBarColor,
} from './feeder-pulse-utils'
import '@/app/maps/feeder-pulse.css'
import 'leaflet/dist/leaflet.css'

type LModule = typeof import('leaflet')

type Props = {
  dataPath: string
  title: string
  subtitle: string
  badges?: string[]
}

function AnimatedCounter({
  target,
  suffix = '',
  decimals = 0,
  className,
}: {
  target: number
  suffix?: string
  decimals?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState('0')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let animated = false
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || animated) return
          animated = true
          const start = performance.now()
          const duration = 1800
          const step = (now: number) => {
            const t = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - t, 3)
            const v = target * eased
            setValue(fmtNum(v, decimals, suffix))
            if (t < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        })
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, suffix, decimals])

  return (
    <div ref={ref} className={className}>
      {value}
    </div>
  )
}

function RiskPill({ tier, score }: { tier: FeederRecord['risk_tier']; score?: number }) {
  return (
    <span className={`fp-pill ${RISK_PILL_CLASS[tier]}`}>
      {tier}
      {score != null ? ` (${score})` : ''}
    </span>
  )
}

function FeederDetailPanel({
  feeder,
  eyebrow,
}: {
  feeder: FeederRecord | null
  eyebrow: string
}) {
  if (!feeder) {
    return (
      <>
        <div className="fp-card-takeaway">{eyebrow}</div>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
          25 alimentadores de amostra. O dataset completo FeederPulse-MZ cobre ~2.200 alimentadores
          com dados de carga a cada 15 minutos, SAIDI/SAIFI mensais e registos de interrupções.
        </p>
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              color: '#6b7280',
              letterSpacing: '0.08em',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Legenda de risco
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              ['Extreme', 'Score ≥ 7.0'],
              ['High', 'Score 5.0–6.9'],
              ['Moderate', 'Score 3.0–4.9'],
              ['Low', 'Score < 3.0'],
            ].map(([tier, label]) => (
              <div
                key={tier}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
              >
                <span className={`fp-pill ${RISK_PILL_CLASS[tier as FeederRecord['risk_tier']]}`}>
                  {tier}
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="fp-card-takeaway">{eyebrow}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fp-navy)' }}>
        {feeder.feeder_name}
      </div>
      <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
        {feeder.district}, {feeder.province}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        <RiskPill tier={feeder.risk_tier} score={feeder.cyclone_risk_score} />
        <span className="fp-pill fp-pill-neutral">{feeder.voltage_kv} kV</span>
        <span className="fp-pill fp-pill-neutral">{feeder.vintage}</span>
      </div>
      <div className="fp-detail-grid">
        {[
          ['Clientes', feeder.num_customers.toLocaleString()],
          ['Comprimento', `${feeder.length_km} km`],
          ['Transformadores', String(feeder.transformer_count)],
          ['Carga/transf.', String(feeder.transformer_load_avg)],
          ['Idade', `${feeder.age_years} anos`],
          ['Estado', feeder.status],
        ].map(([label, val]) => (
          <div key={label}>
            <div className="fp-detail-label">{label}</div>
            <div className="fp-detail-value" style={{ textTransform: label === 'Estado' ? 'capitalize' : undefined }}>
              {val}
            </div>
          </div>
        ))}
      </div>
      {feeder.status === 'maintenance' && (
        <div className="fp-maintenance-note">
          <b>Manutenção</b> — sem cronograma público de retorno ao serviço.
        </div>
      )}
    </>
  )
}

const CHART_TOOLTIP = {
  contentStyle: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 12,
  },
}

export default function FeederPulseDashboard({ dataPath, title, subtitle, badges }: Props) {
  const [bundle, setBundle] = useState<FeederPulseBundle | null>(null)
  const [selected, setSelected] = useState<FeederRecord | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const markersRef = useRef<import('leaflet').CircleMarker[]>([])

  useEffect(() => {
    fetch(dataPath)
      .then((r) => r.json())
      .then((data: FeederPulseBundle) => setBundle(data))
      .catch(console.error)
  }, [dataPath])

  const feeders = bundle?.feeders ?? []
  const provinces = bundle?.provinces ?? []
  const totals = bundle?.totals

  const provChartData = useMemo(
    () => [...provinces].sort((a, b) => b.customers - a.customers),
    [provinces]
  )

  const scatterData = useMemo(
    () =>
      feeders.map((f) => ({
        ...f,
        size: Math.max(8, Math.sqrt(f.num_customers) / 3),
      })),
    [feeders]
  )

  const voltageData = useMemo(() => {
    const counts: Record<string, number> = {}
    feeders.forEach((f) => {
      const key = `${f.voltage_kv} kV`
      counts[key] = (counts[key] ?? 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [feeders])

  const vintageData = useMemo(() => {
    const keys = ['Legacy (<2005)', 'Modern (2005-2014)', 'Recent (2015+)'] as const
    const groups = { 'Legacy (<2005)': 0, 'Modern (2005-2014)': 0, 'Recent (2015+)': 0 }
    const cust = { 'Legacy (<2005)': 0, 'Modern (2005-2014)': 0, 'Recent (2015+)': 0 }
    feeders.forEach((f) => {
      const k = f.vintage as keyof typeof groups
      if (k in groups) {
        groups[k] += 1
        cust[k] += f.num_customers
      }
    })
    return keys.map((k) => ({
      vintage: k.replace(' (<2005)', '').replace(' (2005-2014)', '').replace(' (2015+)', '+'),
      full: k,
      feeders: groups[k],
      customersK: cust[k] / 1000,
    }))
  }, [feeders])

  const top10 = useMemo(
    () => [...feeders].sort((a, b) => b.priority_score - a.priority_score).slice(0, 10),
    [feeders]
  )

  const handleSelect = useCallback((f: FeederRecord) => {
    setSelected(f)
  }, [])

  useEffect(() => {
    if (!feeders.length || !mapContainerRef.current) return
    let cancelled = false

    import('leaflet').then((mod) => {
      const L = (mod as { default?: LModule }).default ?? (mod as LModule)
      if (cancelled || !mapContainerRef.current) return

      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markersRef.current = []
      }

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([-18.5, 36.5], 6)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
      }).addTo(map)

      mapRef.current = map

      feeders.forEach((f) => {
        const marker = L.circleMarker([f.lat, f.lon], {
          radius: markerRadius(f.num_customers),
          fillColor: RISK_COLORS[f.risk_tier],
          color: '#0A1F3D',
          weight: 1.5,
          fillOpacity: 0.75,
        })
        marker.bindTooltip(
          `<div style="min-width:180px;font-size:12px"><b>${f.feeder_name}</b><br/>${f.district}, ${f.province}<br/>${f.num_customers.toLocaleString()} clientes · risco ${f.cyclone_risk_score}</div>`,
          { sticky: true }
        )
        marker.on('click', () => handleSelect(f))
        marker.addTo(map)
        markersRef.current.push(marker)
      })

      const ro = new ResizeObserver(() => map.invalidateSize())
      ro.observe(mapContainerRef.current)

      return () => {
        ro.disconnect()
      }
    })

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markersRef.current = []
      }
    }
  }, [feeders, handleSelect])

  const detailEyebrow = selected
    ? `Prioridade: ${selected.priority_score}/100`
    : 'Clique num círculo no mapa'

  if (!bundle) {
    return (
      <div className="fp-root">
        <div className="fp-scroll" style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
          A carregar FeederPulse-MZ…
        </div>
      </div>
    )
  }

  return (
    <div className="fp-root">
      <div className="fp-scroll">
        {/* Hero */}
        <header className="fp-hero">
          <div className="fp-hero-content">
            <div
              style={{
                marginBottom: 24,
                opacity: 0.85,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              <span className="fp-pulse-dot" />
              FeederPulse-MZ · Amostra analítica DATA4MOZ Energy Intelligence
            </div>
            <h1 className="fp-display fp-hero-title">
            A Rede eléctrica por detrás do <span className="fp-hero-gradient">crescimento</span> de Moçambique.
            </h1>
            <p
              style={{
                fontSize: 'clamp(16px, 1.5vw, 19px)',
                fontWeight: 300,
                lineHeight: 1.6,
                maxWidth: 720,
                marginTop: 24,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              Em 25 alimentadores de amostra em cinco províncias prioritárias,{' '}
              <b>93 130 clientes</b> dependem de infraestrutura com idade média de{' '}
              <b>16 anos</b> — com <b>43%</b> expostos a risco ciclónico elevado ou extremo.
              {badges?.length ? ` ${badges.join(' · ')}.` : ''}
            </p>
            <p style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>{subtitle}</p>

            {totals && (
              <div className="fp-kpi-grid">
                <div className="fp-counter-tile">
                  <AnimatedCounter target={totals.feeders} className="fp-counter-val" />
                  <div className="fp-counter-label">Alimentadores (amostra)</div>
                </div>
                <div className="fp-counter-tile">
                  <AnimatedCounter target={totals.customers} className="fp-counter-val" />
                  <div className="fp-counter-label">Clientes ligados</div>
                </div>
                <div className="fp-counter-tile">
                  <AnimatedCounter
                    target={Math.round(totals.length_km)}
                    suffix=" km"
                    className="fp-counter-val"
                  />
                  <div className="fp-counter-label">Linhas MV mapeadas</div>
                </div>
                <div className="fp-counter-tile">
                  <AnimatedCounter target={totals.transformers} className="fp-counter-val" />
                  <div className="fp-counter-label">Transformadores</div>
                </div>
                <div className="fp-counter-tile fp-counter-tile--accent">
                  <AnimatedCounter
                    target={totals.customers_high_risk}
                    className="fp-counter-val"
                  />
                  <div className="fp-counter-label" style={{ opacity: 0.85 }}>
                    Clientes em zonas ALTO/EXTREMO risco
                  </div>
                </div>
                <div className="fp-counter-tile fp-counter-tile--accent">
                  <AnimatedCounter
                    target={totals.customers_legacy}
                    className="fp-counter-val"
                  />
                  <div className="fp-counter-label" style={{ opacity: 0.85 }}>
                    Clientes em infra LEGACY (&lt;2005)
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Map */}
        <section className="fp-section fp-section--surface" id="intelligence">
          <div className="fp-container">
            <div className="fp-eyebrow">Secção 01 — O mapa</div>
            <h2 className="fp-section-h fp-display">
              Onde a electricidade de Moçambique realmente flui
            </h2>
            <p className="fp-section-sub">
              Cada círculo é um alimentador de média tensão real. Tamanho = clientes servidos.
              Cor = vulnerabilidade a ciclones. Clique para ver os dados subjacentes.
            </p>

            <div className="fp-map-grid">
              <div ref={mapContainerRef} className="fp-map-wrap" id="feederMap" />
              <div className="fp-data-card" style={{ height: '100%' }}>
                <div className="fp-card-title">Alimentador seleccionado</div>
                <FeederDetailPanel feeder={selected} eyebrow={detailEyebrow} />
              </div>
            </div>

            <div className="fp-insights-grid">
              <div className="fp-insight-badge">
                <b>Beira</b> concentra os alimentadores urbanos mais expostos — Manga & Munhava (16
                160 clientes, score 8.4)
              </div>
              <div className="fp-insight-badge">
                <b>Maputo Província</b> tem exposição ciclónica ~1.7× inferior à média nacional
              </div>
              <div className="fp-insight-badge">
                <b>Cabo Delgado</b> risco duplo segurança + clima: 2 alimentadores em manutenção
              </div>
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="fp-section fp-section--muted">
          <div className="fp-container">
            <div className="fp-eyebrow">Secção 02 — Padrões</div>
            <h2 className="fp-section-h fp-display">Quatro dimensões de inteligência de rede</h2>
            <p className="fp-section-sub">
              Onde estão os clientes, onde está o risco, onde a infraestrutura envelhece e onde o
              investimento compra mais resiliência.
            </p>

            <div className="fp-charts-grid">
              <div className="fp-data-card">
                <div className="fp-card-title">Clientes por província</div>
                <div className="fp-card-takeaway">
                  Sofala (Beira) lidera — mas 95% desses clientes estão em risco extremo
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={provChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid horizontal={false} stroke="#f3f4f6" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="province" width={88} tick={{ fontSize: 11 }} />
                    <Tooltip {...CHART_TOOLTIP} />
                    <Bar dataKey="customers" radius={[0, 4, 4, 0]}>
                      {provChartData.map((p) => (
                        <Cell key={p.province} fill={provBarColor(p.avg_risk)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="fp-data-card">
                <div className="fp-card-title">Risco ciclónico × idade da infra</div>
                <div className="fp-card-takeaway">
                  Canto superior-direito = candidatos prioritários à substituição
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 32 }}>
                    <CartesianGrid stroke="#f3f4f6" />
                    <XAxis
                      type="number"
                      dataKey="age_years"
                      name="Idade"
                      unit=" anos"
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Idade (anos)', position: 'bottom', offset: 12, fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="cyclone_risk_score"
                      name="Risco"
                      domain={[0, 10]}
                      tick={{ fontSize: 11 }}
                      label={{
                        value: 'Risco ciclónico',
                        angle: -90,
                        position: 'insideLeft',
                        fontSize: 11,
                      }}
                    />
                    <ZAxis type="number" dataKey="size" range={[40, 400]} />
                    <Tooltip
                      {...CHART_TOOLTIP}
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(v: number, name: string) =>
                        name === 'size' ? null : [v, name === 'cyclone_risk_score' ? 'Risco' : 'Idade']
                      }
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.feeder_name ?? ''
                      }
                    />
                    <Scatter data={scatterData} fill="#E86F2C" fillOpacity={0.85} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="fp-data-card">
                <div className="fp-card-title">Composição por tensão</div>
                <div className="fp-card-takeaway">
                  Linhas 110 kV servem corredores LNG/mineração — poucos clientes residenciais
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={voltageData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {voltageData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={['#0A1F3D', '#E86F2C', '#B8943B', '#1F4E79'][i % 4]}
                        />
                      ))}
                    </Pie>
                    <Tooltip {...CHART_TOOLTIP} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="fp-data-card">
                <div className="fp-card-title">Vintage da distribuição</div>
                <div className="fp-card-takeaway">
                  Quase metade dos clientes (44%) servidos por infra anterior a 2005
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={vintageData} margin={{ top: 8, right: 48, left: 8, bottom: 24 }}>
                    <CartesianGrid stroke="#f3f4f6" />
                    <XAxis dataKey="vintage" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip {...CHART_TOOLTIP} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="feeders" name="Alimentadores" fill="#0A1F3D" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="customersK"
                      name="Clientes (K)"
                      stroke="#E86F2C"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#E86F2C' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Opportunity */}
        <section className="fp-section fp-section--surface" id="opportunity">
          <div className="fp-container">
            <div className="fp-eyebrow">Secção 03 — Oportunidade</div>
            <h2 className="fp-section-h fp-display">
              10 alimentadores. ~USD 180M de investimento justificado.
            </h2>
            <p className="fp-section-sub">
              Score de prioridade composto (40% carga × 40% risco × 20% idade) identifica onde cada
              dólar de CAPEX gera maior resiliência e melhor experiência do cliente.
            </p>

            <div className="fp-table-wrap">
              <table className="fp-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>#</th>
                    <th style={{ textAlign: 'left' }}>Alimentador</th>
                    <th style={{ textAlign: 'left' }}>Província / Distrito</th>
                    <th style={{ textAlign: 'right' }}>Clientes</th>
                    <th style={{ textAlign: 'center' }}>Idade</th>
                    <th style={{ textAlign: 'center' }}>Risco</th>
                    <th style={{ textAlign: 'right' }}>Prioridade</th>
                    <th style={{ textAlign: 'left' }}>CAPEX indicativo</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((f, i) => (
                    <tr key={f.feeder_id}>
                      <td className="fp-table-rank">{i + 1}</td>
                      <td>
                        <div className="fp-table-primary">{f.feeder_name}</div>
                        <div className="fp-table-sub">
                          {f.voltage_kv}kV · {f.transformer_count} transformadores
                        </div>
                      </td>
                      <td>
                        <div className="fp-table-primary">{f.province}</div>
                        <div className="fp-table-sub">{f.district}</div>
                      </td>
                      <td className="fp-table-num">{f.num_customers.toLocaleString()}</td>
                      <td className="fp-table-center">{f.age_years} anos</td>
                      <td className="fp-table-center">
                        <RiskPill tier={f.risk_tier} score={f.cyclone_risk_score} />
                      </td>
                      <td className="fp-table-priority">{f.priority_score}</td>
                      <td>
                        <div className="fp-table-capex">${CAPEX_BY_RISK[f.risk_tier]}M</div>
                        <div className="fp-table-sub">indicativo</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="fp-opp-grid">
              {[
                {
                  meta: 'Investidor',
                  title: 'Corredores mineração & LNG',
                  body: 'Metoro (110 kV, Cabo Delgado), Nacala Porto (110 kV, Nampula), Moatize (110 kV, Tete) — alimentadores backbone para indústrias exportadoras.',
                },
                {
                  meta: 'Doadores',
                  title: 'CAPEX resiliência ciclónica',
                  body: 'Beira (Manga, Munhava), Dondo, Quelimane — 24 200 clientes no corredor de maior exposição do país.',
                },
                {
                  meta: 'Utility',
                  title: 'Manutenção predictiva',
                  body: 'Costa do Sol (Maputo, 8 240 clientes, 27 anos) no núcleo urbano envelhecido — substituição de transformadores quando os dados existem.',
                },
                {
                  meta: 'Regulador',
                  title: 'Regulação baseada em desempenho',
                  body: 'Com estes dados, a ARENE pode introduzir pisos SAIDI/SAIFI e ajustes tarifários por desempenho.',
                },
              ].map((c) => (
                <div key={c.title} className="fp-opp-card">
                  <div className="fp-opp-meta">{c.meta}</div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      color: 'var(--fp-navy)',
                      marginTop: 8,
                    }}
                  >
                    {c.title}
                  </div>
                  <div style={{ fontSize: 13, color: '#4b5563', marginTop: 8, lineHeight: 1.5 }}>
                    {c.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Service */}
        <section className="fp-section fp-section--dark" id="service">
          <div className="fp-container fp-service-grid">
            <div>
              <div className="fp-eyebrow">Secção 04 — DATA4MOZ</div>
              <h2 className="fp-section-h fp-display">Inteligência sectorial como serviço.</h2>
              <p style={{ fontSize: 17, lineHeight: 1.6, opacity: 0.85, marginTop: 16 }}>
                O que vê nesta página é uma amostra de 25 alimentadores de um dataset muito maior.
                Combinamos fontes públicas, satélite, mobile, regulatórias e proprietárias em
                camadas de inteligência que não existem noutro sítio.
              </p>
              <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['R2S Pipeline', 'Extracção Report-to-Signal em datasets estruturados e auditáveis.'],
                  ['Sector Intelligence Briefs', 'Relatórios síntese a partir de EDM, FUNAE, USAID, Banco Mundial, INE, NASA.'],
                  ['Dashboards interactivos', 'Painéis partilháveis orientados à decisão.'],
                  ['Advisory & outputs', 'XLS, gráficos, GeoJSON e visualizações para C-suite e reguladores.'],
                ].map(([t, d], i) => (
                  <div key={t} className="fp-step-row">
                    <div className="fp-step-num">{i + 1}</div>
                    <div>
                      <b>{t}</b> — {d}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="fp-service-panel">
              <div className="fp-eyebrow" style={{ marginBottom: 16 }}>
                Fontes por trás desta página
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Relatórios anuais EDM 2010–2023',
                  'Plano Director Integrado 2018–2043 (JICA)',
                  'Projectos Prioritários 2021–2030',
                  'USAID/Deloitte RTM Tool v6',
                  'NASA VIIRS Day/Night Band',
                  'Censo INE 2017',
                  'INAM + INGD (Idai 2019, Freddy 2023)',
                ].map((s) => (
                  <div key={s} className="fp-source-pill">
                    <span className="fp-dot" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Impact */}
        <section className="fp-section fp-section--surface">
          <div className="fp-container">
            <div className="fp-section-intro">
              <div className="fp-eyebrow">Secção 05 — Impacto</div>
              <h2 className="fp-section-h fp-display">O que esta inteligência desbloqueia</h2>
              <p className="fp-section-sub fp-section-sub--center">
                O build completo FeederPulse-MZ (~2.200 alimentadores) estima-se que entregue:
              </p>
            </div>
            <div className="fp-impact-grid">
              {[
                ['$4–6B', 'FDI industrial acelerado em 10 anos'],
                ['30–40%', 'Redução de interrupções não planeadas'],
                ['$200M+', 'Custo de energia não servida evitado/ano'],
                ['12–24h', 'Resposta pós-ciclone mais rápida'],
              ].map(([v, l]) => (
                <div key={l} className="fp-data-card" style={{ textAlign: 'center' }}>
                  <div className="fp-display fp-gradient-text" style={{ fontSize: 42, fontWeight: 800 }}>
                    {v}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          className="fp-section fp-section--dark fp-section--end"
          id="contact"
          style={{ textAlign: 'center' }}
        >
          <div className="fp-container" style={{ maxWidth: 800 }}>
            <div className="fp-eyebrow">Secção 06 — Contacto</div>
            <h2 className="fp-section-h fp-display" style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}>
              Se toma decisões sobre o sector energético de Moçambique — devíamos conversar.
            </h2>
            <p style={{ fontSize: 17, opacity: 0.85, lineHeight: 1.6, marginTop: 16 }}>
              DATA4MOZ constrói a camada de inteligência que transforma dados públicos fragmentados
              no sistema operativo para investimento, regulação e prestação de serviços.
            </p>
            <div
              style={{
                marginTop: 36,
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <OpenContactTrigger className="fp-cta-btn">Solicitar briefing</OpenContactTrigger>
              <a
                href="mailto:ainguane@data4moz.com?subject=FeederPulse-MZ briefing request"
                className="fp-cta-btn fp-cta-btn--secondary"
              >
                ainguane@data4moz.com
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
