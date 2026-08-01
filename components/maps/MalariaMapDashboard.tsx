'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  activeColor,
  colorChange,
  computeKpis,
  fmtPct,
  fmtPp,
  type MalariaBundle,
  type MalariaMode,
  type MalariaNationalPoint,
  type MalariaProvince,
} from './malaria-map-utils'
import '@/app/maps/health-map.css'
import '@/app/maps/malaria-map.css'

type Props = {
  dataPath: string
  title: string
  subtitle: string
  badges?: string[]
}

function MalariaProvinceChart({
  provinces,
  national,
  selected,
  mode,
  onSelect,
}: {
  provinces: MalariaProvince[]
  national: MalariaNationalPoint[]
  selected: string | null
  mode: MalariaMode
  onSelect: (name: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 520 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({
        width: Math.max(320, r.width),
        height: Math.max(360, r.height),
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const svg = useMemo(() => {
    const { width, height } = size
    const m = { top: 34, right: 116, bottom: 56, left: 58 }
    const maxY = 72
    const x = (year: number) =>
      m.left + ((year - 2015) / 3) * (width - m.left - m.right)
    const y = (val: number) =>
      m.top + ((maxY - val) / maxY) * (height - m.top - m.bottom)

    const selectedData = selected
      ? provinces.find((d) => d.province === selected)
      : null
    const n2015 = national.find((d) => d.year === 2015)?.value ?? 39.6
    const n2018 = national.find((d) => d.year === 2018)?.value ?? 39

    const gridLines = [0, 20, 40, 60]
      .map(
        (t) =>
          `<line class="gridline" stroke="#e7edf2" x1="${m.left}" x2="${width - m.right}" y1="${y(t)}" y2="${y(t)}"></line>` +
          `<text class="ml-chart-label" x="${m.left - 10}" y="${y(t) + 4}" text-anchor="end">${t}%</text>`
      )
      .join('')

    const series = provinces
      .map((d) => {
        const isSel = selected === d.province
        const muted = Boolean(selected && !isSel)
        const col = activeColor(d, mode)
        const opacity = muted ? 0.28 : 1
        const strokeW = isSel ? 5 : 2.8
        const strokeOp = muted ? 0.22 : 1
        const showLabel =
          !selected || isSel || Math.abs(d.delta) >= 20 || d.v2018 >= 50
        const dots = [
          [2015, d.v2015, d.n2015],
          [2018, d.v2018, d.n2018],
        ] as const
        return (
          `<g data-province="${d.province}">` +
          `<line x1="${x(2015)}" y1="${y(d.v2015)}" x2="${x(2018)}" y2="${y(d.v2018)}" stroke="${col}" stroke-width="${strokeW}" stroke-opacity="${strokeOp}" fill="none" stroke-linecap="round"></line>` +
          dots
            .map(
              ([yr, val, n]) =>
                `<circle data-province="${d.province}" data-year="${yr}" data-value="${val}" data-n="${n}" cx="${x(yr)}" cy="${y(val)}" r="${isSel ? 7 : 5}" fill="${col}" fill-opacity="${opacity}" stroke="#fff" stroke-width="2" style="cursor:pointer"></circle>`
            )
            .join('') +
          (showLabel
            ? `<text x="${x(2018) + 10}" y="${y(d.v2018) + 4}" fill="${muted ? '#9aa6b2' : col}" font-size="12" font-weight="${isSel ? 900 : 750}">${d.province}</text>`
            : '') +
          `</g>`
        )
      })
      .join('')

    let callout = ''
    if (selectedData) {
      const midX = (x(2015) + x(2018)) / 2
      const midY = (y(selectedData.v2015) + y(selectedData.v2018)) / 2 - 16
      callout =
        `<rect x="${midX - 70}" y="${midY - 20}" rx="7" width="140" height="34" fill="#18212d"></rect>` +
        `<text x="${midX}" y="${midY + 2}" fill="#fff" font-size="13" font-weight="900" text-anchor="middle">${fmtPp(selectedData.delta)}</text>`
    }

    return (
      `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Prevalência de malária por província">` +
      gridLines +
      `<line stroke="#c9d4df" x1="${m.left}" x2="${width - m.right}" y1="${height - m.bottom}" y2="${height - m.bottom}"></line>` +
      `<text class="ml-chart-title" x="${x(2015)}" y="${height - 22}" text-anchor="middle">2015</text>` +
      `<text class="ml-chart-title" x="${x(2018)}" y="${height - 22}" text-anchor="middle">2018</text>` +
      `<text class="ml-chart-label" x="${m.left}" y="18">% RDT+ crianças 6–59 meses</text>` +
      `<line x1="${x(2015)}" y1="${y(n2015)}" x2="${x(2018)}" y2="${y(n2018)}" stroke="#18212d" stroke-dasharray="5 5" stroke-width="2.2" opacity=".55"></line>` +
      `<text x="${x(2018) + 10}" y="${y(n2018) + 4}" fill="#18212d" font-size="12" font-weight="800">Nacional ~${n2018.toFixed(0)}%</text>` +
      series +
      callout +
      `</svg>`
    )
  }, [provinces, national, selected, mode, size])

  const onSvgClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const t = e.target as SVGElement
      const name = t.getAttribute('data-province')
      if (name) onSelect(name)
    },
    [onSelect]
  )

  return (
    <div
      ref={containerRef}
      className="ml-main-chart"
      dangerouslySetInnerHTML={{ __html: svg }}
      onClick={onSvgClick}
    />
  )
}

export default function MalariaMapDashboard({
  dataPath,
  title,
  subtitle,
  badges = [],
}: Props) {
  const [bundle, setBundle] = useState<MalariaBundle | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<MalariaMode>('change')
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(dataPath)
      .then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar dados')
        return r.json()
      })
      .then((data: MalariaBundle) => setBundle(data))
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Erro'))
  }, [dataPath])

  const provinces = bundle?.provinces ?? []
  const national = bundle?.national ?? []

  const kpis = useMemo(
    () => (provinces.length ? computeKpis(provinces, national) : null),
    [provinces, national]
  )

  const cardProvince = useMemo(() => {
    if (!provinces.length) return null
    if (selected) return provinces.find((p) => p.province === selected) ?? null
    return provinces.slice().sort((a, b) => b.delta - a.delta)[0]
  }, [provinces, selected])

  const showTip = (html: string, clientX: number, clientY: number) => {
    const el = tooltipRef.current
    if (!el) return
    el.innerHTML = html
    el.style.left = `${clientX}px`
    el.style.top = `${clientY}px`
    el.style.opacity = '1'
  }

  const hideTip = () => {
    if (tooltipRef.current) tooltipRef.current.style.opacity = '0'
  }

  if (loadError) {
    return (
      <div className="ml-root">
        <div className="ml-wrap p-8 text-center text-red-700">{loadError}</div>
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="ml-root">
        <div className="ml-wrap p-8 text-center text-[var(--ml-muted)]">
          A carregar dashboard de malária…
        </div>
      </div>
    )
  }

  const maxAbsDelta = Math.max(...provinces.map((d) => Math.abs(d.delta)), 1)
  const rankSorted = provinces.slice().sort((a, b) => b.delta - a.delta)
  const tableSorted = provinces.slice().sort((a, b) => b.v2018 - a.v2018)

  return (
    <div className="ml-root">
      <header className="hm-header">
        <Image src="/images/logo.png" alt="" width={44} height={44} className="hm-logo" />
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {badges.map((b) => (
          <span key={b} className="hm-badge">
            {b}
          </span>
        ))}
      </header>

      <div className="ml-scroll">
        <div className="ml-wrap">
          <div className="ml-header">
            <div>
              <div className="ml-eyebrow">Data4Moz · inteligência malária</div>
              <h2 className="ml-title">Onde a malária mudou de lugar entre 2015 e 2018.</h2>
              <p className="ml-subtitle">
                Série temporal de prevalência em crianças 6–59 meses: IMASIDA 2015 e IIM 2018
                por província. A média nacional quase não se moveu; a história provincial mudou
                de forma acentuada.
              </p>
            </div>
            <div className="ml-source-pill">
              Indicador: % de crianças 6–59 meses com teste RDT positivo. 2015: prevalência P.
              falciparum (IMASIDA Quadro 10.13). 2018: IIM Quadro 4.10.
            </div>
          </div>

          <div className="ml-toolbar">
            <button
              type="button"
              className={mode === 'change' ? 'active' : ''}
              onClick={() => setMode('change')}
            >
              Variação 2015→2018
            </button>
            <button
              type="button"
              className={mode === 'level' ? 'active' : ''}
              onClick={() => setMode('level')}
            >
              Carga 2018
            </button>
            <button type="button" onClick={() => setSelected(null)}>
              Limpar selecção
            </button>
            <select
              value={selected ?? ''}
              onChange={(e) => setSelected(e.target.value || null)}
              aria-label="Seleccionar província"
            >
              <option value="">Todas as províncias</option>
              {provinces.map((d) => (
                <option key={d.province} value={d.province}>
                  {d.province}
                </option>
              ))}
            </select>
          </div>

          {kpis && (
            <section className="ml-kpi-grid">
              <div className="ml-kpi">
                <div className="ml-kpi-label">Nacional 2018</div>
                <div className="ml-kpi-value">{fmtPct(kpis.national2018)}</div>
                <div className="ml-kpi-small">Resumo tendência IIM</div>
              </div>
              <div className="ml-kpi">
                <div className="ml-kpi-label">Maior carga 2018</div>
                <div className="ml-kpi-value">{fmtPct(kpis.highest2018.v2018)}</div>
                <div className="ml-kpi-small">{kpis.highest2018.province}</div>
              </div>
              <div className="ml-kpi">
                <div className="ml-kpi-label">Maior aumento</div>
                <div className="ml-kpi-value">{fmtPp(kpis.largestIncrease.delta)}</div>
                <div className="ml-kpi-small">
                  {kpis.largestIncrease.province}, 2015→2018
                </div>
              </div>
              <div className="ml-kpi">
                <div className="ml-kpi-label">Maior queda</div>
                <div className="ml-kpi-value">{fmtPp(kpis.largestDecline.delta)}</div>
                <div className="ml-kpi-small">
                  {kpis.largestDecline.province}, 2015→2018
                </div>
              </div>
            </section>
          )}

          <main className="ml-grid-main">
            <section className="ml-panel">
              <h2>Série temporal provincial</h2>
              <p className="ml-note">
                Clique numa linha, mosaico ou linha da tabela para isolar a província.
              </p>
              <MalariaProvinceChart
                provinces={provinces}
                national={national}
                selected={selected}
                mode={mode}
                onSelect={setSelected}
              />
            </section>

            <aside className="ml-panel">
              <h2>Superfície geográfica de carga</h2>
              <p className="ml-note">
                Cor conforme o modo seleccionado. Disposição compacta norte→sul.
              </p>
              <div className="ml-tile-map">
                {provinces.map((d) => (
                  <div
                    key={d.province}
                    role="button"
                    tabIndex={0}
                    className={`ml-tile${selected === d.province ? ' selected' : ''}`}
                    style={{
                      gridColumn: d.tile_x + 1,
                      gridRow: d.tile_y + 1,
                      background: activeColor(d, mode),
                    }}
                    onClick={() => setSelected(d.province)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setSelected(d.province)
                    }}
                    onMouseMove={(e) =>
                      showTip(
                        `<b>${d.province}</b><br>2015: ${fmtPct(d.v2015)}<br>2018: ${fmtPct(d.v2018)}<br>Variação: ${fmtPp(d.delta)}<br>Risco 2018: ${d.risk_2018}`,
                        e.clientX,
                        e.clientY
                      )
                    }
                    onMouseLeave={hideTip}
                  >
                    <div className="ml-tile-name">{d.province}</div>
                    <div className="ml-tile-delta">{fmtPp(d.delta)}</div>
                    <div className="ml-tile-val">
                      {mode === 'change' ? fmtPp(d.delta) : fmtPct(d.v2018)}
                    </div>
                  </div>
                ))}
              </div>

              {cardProvince && (
                <div className="ml-province-card">
                  <div className="ml-mini">
                    <div className="ml-mini-label">
                      {selected ? 'Província seleccionada' : 'Maior piora'}
                    </div>
                    <div className="ml-mini-value">{cardProvince.province}</div>
                  </div>
                  <div className="ml-mini">
                    <div className="ml-mini-label">Prevalência 2018</div>
                    <div className="ml-mini-value">{fmtPct(cardProvince.v2018)}</div>
                  </div>
                  <div className="ml-mini">
                    <div className="ml-mini-label">Variação 2015→2018</div>
                    <div
                      className="ml-mini-value"
                      style={{ color: colorChange(cardProvince.delta) }}
                    >
                      {fmtPp(cardProvince.delta)}
                    </div>
                  </div>
                  <div className="ml-mini">
                    <div className="ml-mini-label">Leitura</div>
                    <div className="ml-mini-value" style={{ fontSize: 18 }}>
                      {cardProvince.risk_2018}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </main>

          <section className="ml-grid-bottom">
            <div className="ml-panel">
              <h2>Ranking de variação</h2>
              <p className="ml-note">
                Valores positivos = piora entre 2015 e 2018; negativos = melhoria.
              </p>
              <div className="ml-rank-list">
                {rankSorted.map((d) => (
                  <div
                    key={d.province}
                    role="button"
                    tabIndex={0}
                    className="ml-rank-row"
                    onClick={() => setSelected(d.province)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setSelected(d.province)
                    }}
                  >
                    <div>
                      <b>{d.province}</b>
                    </div>
                    <div className="ml-bar-track">
                      <div
                        className="ml-bar"
                        style={{
                          width: `${(Math.abs(d.delta) / maxAbsDelta) * 100}%`,
                          background: colorChange(d.delta),
                        }}
                      />
                    </div>
                    <div style={{ fontWeight: 900, color: colorChange(d.delta) }}>
                      {fmtPp(d.delta)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ml-panel">
              <h2>Tabela de dados</h2>
              <p className="ml-note">Vista operacional para reuniões provinciais.</p>
              <table className="ml-table">
                <thead>
                  <tr>
                    <th>Província</th>
                    <th>2015</th>
                    <th>2018</th>
                    <th>Variação</th>
                    <th>Risco</th>
                  </tr>
                </thead>
                <tbody>
                  {tableSorted.map((d) => (
                    <tr key={d.province} onClick={() => setSelected(d.province)}>
                      <td>
                        <b>{d.province}</b>
                      </td>
                      <td>{fmtPct(d.v2015)}</td>
                      <td>{fmtPct(d.v2018)}</td>
                      <td style={{ fontWeight: 900, color: colorChange(d.delta) }}>
                        {fmtPp(d.delta)}
                      </td>
                      <td>{d.risk_2018}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="ml-footer">
            Fontes: IMASIDA 2015 Quadro 10.13; IIM 2018 Quadro 4.10 e Figura 4.5. Estimativas de
            inquérito, não contagens mensais de HMIS. Para acção distrital, triangular com
            SISMA/DHIS2, rutura de RDT, precipitação e acesso.
          </p>
        </div>
      </div>

      <div ref={tooltipRef} className="ml-tooltip" />
    </div>
  )
}
