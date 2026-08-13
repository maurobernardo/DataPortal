'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import '@/app/maps/health-map.css'
import '@/app/maps/cereal-map.css'

type Row = { y: number; p: string; c: string; v: number; a?: number }
type Bundle = {
  crops: string[]
  cropLabels: Record<string, string>
  provinces: string[]
  provinceLabels: Record<string, string>
  years: number[]
  fonte: string
  rows: Row[]
}
type GeoFeature = {
  properties: { name: string; water: boolean }
  geometry: { coordinates: [number, number][][][] }
}
type GeoBundle = { features: GeoFeature[] }
type Props = { dataPath: string; title: string; subtitle: string; badges?: string[] }

const CROP_COLOR: Record<string, string> = { Maize: '#1D6E4B', Rice: '#C99700', Sorghum: '#7B4B22', Millet: '#1B6CA8' }
const fmt = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('pt-PT'))
const short = (n: number | null | undefined) => {
  if (n == null) return '—'
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (n >= 1e3) return Math.round(n / 1e3) + 'k'
  return String(Math.round(n))
}
const sum = (rows: Row[]) => rows.reduce((a, b) => a + b.v, 0)
const rowsFor = (rows: Row[], y: number | 'All' | null, c: string, p: string) =>
  rows.filter((r) => (y == null || y === 'All' || r.y === y) && (c === 'All' || r.c === c) && (p === 'All' || r.p === p))
const mixColor = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const ramp = (t: number) => {
  const c1 = [255, 255, 255]
  const c2 = [242, 194, 26]
  const c3 = [6, 43, 30]
  const rgb = t < 0.5 ? mixColor(c1, c2, t / 0.5) : mixColor(c2, c3, (t - 0.5) / 0.5)
  return `rgb(${rgb.join(',')})`
}

const dPath = (f: GeoFeature, PX: (x: number) => number, PY: (y: number) => number) =>
  f.geometry.coordinates.map((poly) => 'M' + poly[0].map(([x, y]) => `${PX(x).toFixed(1)},${PY(y).toFixed(1)}`).join('L') + 'Z').join('')

function centroid(f: GeoFeature, PX: (x: number) => number, PY: (y: number) => number): [number, number] {
  const poly = f.geometry.coordinates[0][0]
  let A = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < poly.length - 1; i++) {
    const [x0, y0] = poly[i]
    const [x1, y1] = poly[i + 1]
    const cr = x0 * y1 - x1 * y0
    A += cr
    cx += (x0 + x1) * cr
    cy += (y0 + y1) * cr
  }
  A *= 0.5
  if (!A) return [PX(poly[0][0]), PY(poly[0][1])]
  return [PX(cx / (6 * A)), PY(cy / (6 * A))]
}

export default function CerealProductionDashboard({ dataPath, title, subtitle, badges = [] }: Props) {
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [geo, setGeo] = useState<GeoBundle | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [crop, setCrop] = useState('All')
  const [year, setYear] = useState<number | 'All'>('All')
  const [prov, setProv] = useState('All')
  const [showTiles, setShowTiles] = useState(true)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch(dataPath).then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar dados')
        return r.json()
      }),
      fetch('/data/cereal-production-geo.json').then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar fronteiras')
        return r.json()
      }),
    ])
      .then(([data, geoData]: [Bundle, GeoBundle]) => {
        setBundle(data)
        setGeo(geoData)
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Erro'))
  }, [dataPath])

  const showTip = (html: string, x: number, y: number) => {
    const el = tooltipRef.current
    if (!el) return
    el.innerHTML = html
    el.style.left = `${x + 14}px`
    el.style.top = `${y + 14}px`
    el.style.opacity = '1'
  }
  const hideTip = () => {
    if (tooltipRef.current) tooltipRef.current.style.opacity = '0'
  }

  const isAvg = year === 'All'
  const cropLabel = (c: string) => bundle?.cropLabels[c] || c
  const provLabel = (p: string) => bundle?.provinceLabels[p] || p

  // Projecção Web Mercator real (EPSG:3857), calculada uma vez a partir da caixa delimitadora real
  // das 10 províncias — os tiles de satélite e os polígonos usam exactamente a mesma grelha.
  const proj = useMemo(() => {
    if (!geo) return null
    const Z = 6
    const WORLD = 256 * 2 ** Z
    const PAD = 0.3
    let minLon = Infinity
    let minLat = Infinity
    let maxLon = -Infinity
    let maxLat = -Infinity
    geo.features.forEach((f) =>
      f.geometry.coordinates.forEach((poly) =>
        poly[0].forEach(([x, y]) => {
          if (x < minLon) minLon = x
          if (y < minLat) minLat = y
          if (x > maxLon) maxLon = x
          if (y > maxLat) maxLat = y
        })
      )
    )
    const mercY = (lat: number) => {
      const s = Math.sin((lat * Math.PI) / 180)
      return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
    }
    const wx = (lon: number) => ((lon + 180) / 360) * WORLD
    const wy = (lat: number) => mercY(lat) * WORLD
    const X0 = wx(minLon - PAD)
    const X1 = wx(maxLon + PAD)
    const Y0 = wy(maxLat + PAD)
    const Y1 = wy(minLat - PAD)
    const MW = Math.round(X1 - X0)
    const MH = Math.round(Y1 - Y0)
    const PX = (x: number) => wx(x) - X0
    const PY = (y: number) => wy(y) - Y0
    const tx0 = Math.floor(X0 / 256)
    const tx1 = Math.floor((X1 - 1) / 256)
    const ty0 = Math.floor(Y0 / 256)
    const ty1 = Math.floor((Y1 - 1) / 256)
    const max = 2 ** Z
    const tiles: { url: string; left: number; top: number }[] = []
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        if (ty < 0 || ty >= max) continue
        const xx = ((tx % max) + max) % max
        tiles.push({
          url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${Z}/${ty}/${xx}`,
          left: tx * 256 - X0,
          top: ty * 256 - Y0,
        })
      }
    }
    return { MW, MH, PX, PY, tiles }
  }, [geo])

  const model = useMemo(() => {
    if (!bundle) return null
    const rows = bundle.rows

    const provAvgOrTotal = (p: string, c: string) => {
      if (!isAvg) return sum(rowsFor(rows, year, c, p))
      const yrs = Array.from(new Set(rowsFor(rows, null, c, p).map((r) => r.y)))
      if (!yrs.length) return 0
      return yrs.reduce((a, y) => a + sum(rowsFor(rows, y, c, p)), 0) / yrs.length
    }
    const roundsFor = (p: string) => {
      if (!isAvg) return 1
      return Array.from(new Set(rowsFor(rows, null, crop, p).map((r) => r.y))).length
    }

    const out: Record<string, number> = {}
    const rounds: Record<string, number> = {}
    bundle.provinces.forEach((p) => {
      out[p] = provAvgOrTotal(p, crop)
      rounds[p] = roundsFor(p)
    })
    const nationalTotal = provAvgOrTotal('All', crop)
    const scopeTotal = prov === 'All' ? nationalTotal : out[prov] ?? 0

    const scopeRows = rowsFor(rows, isAvg ? null : year, crop, prov).filter((r) => r.a != null)
    let area: number | null = null
    if (scopeRows.length) {
      if (!isAvg) {
        area = scopeRows.reduce((a, r) => a + (r.a ?? 0), 0)
      } else {
        const yrs = Array.from(new Set(scopeRows.map((r) => r.y)))
        area = yrs.reduce((a, y) => a + scopeRows.filter((r) => r.y === y).reduce((s, r) => s + (r.a ?? 0), 0), 0) / yrs.length
      }
    }
    const yieldKgHa = area && area > 0 ? Math.round((scopeTotal * 1000) / area) : null

    let leadingProvince = bundle.provinces[0]
    let leadingValue = -1
    bundle.provinces.forEach((p) => {
      if (out[p] > leadingValue) {
        leadingValue = out[p]
        leadingProvince = p
      }
    })
    const share = prov !== 'All' && nationalTotal > 0 ? (scopeTotal / nationalTotal) * 100 : null

    const pieItems = bundle.crops.map((c) => ({ c, v: provAvgOrTotal(prov === 'All' ? 'All' : prov, c) })).filter((it) => it.v > 0)
    const pieTotal = pieItems.reduce((a, b) => a + b.v, 0)

    const yearsAsc = [...bundle.years].sort((a, b) => a - b)
    const trend = bundle.crops.map((c) => {
      const series = yearsAsc.map((y) => sum(rowsFor(rows, y, c, 'All')))
      const peak = Math.max(...series)
      return { c, series, peak }
    })

    const roundsWithData = yearsAsc.filter((y) => rows.some((r) => r.y === y && (crop === 'All' || r.c === crop)))
    let wl: { yA: number; yB: number; rows: { p: string; a: number; b: number; d: number; pct: number | null }[] } | null = null
    if (roundsWithData.length >= 2) {
      let yA: number
      let yB: number
      const idx = !isAvg ? roundsWithData.indexOf(year as number) : -1
      if (idx > 0) {
        yA = roundsWithData[idx - 1]
        yB = year as number
      } else {
        yA = roundsWithData[0]
        yB = roundsWithData[roundsWithData.length - 1]
      }
      const wlRows = bundle.provinces
        .map((p) => {
          const a = sum(rowsFor(rows, yA, crop, p))
          const b = sum(rowsFor(rows, yB, crop, p))
          return { p, a, b, d: b - a, pct: a > 0 ? ((b - a) / a) * 100 : null }
        })
        .filter((o) => o.a > 0 || o.b > 0)
        .sort((x, y) => y.d - x.d)
      wl = { yA, yB, rows: wlRows }
    }

    return { out, rounds, scopeTotal, area, yieldKgHa, leadingProvince, share, pieItems, pieTotal, trend, yearsAsc, wl }
  }, [bundle, crop, year, prov, isAvg])

  const mapHtml = useMemo(() => {
    if (!proj || !geo || !model) return ''
    const { MW, MH, PX, PY } = proj
    const { out } = model
    const vals = Object.values(out).filter((v) => v > 0)
    const max = vals.length ? Math.max(...vals) : 0
    let s = `<svg class="cr-svg" viewBox="0 0 ${MW} ${MH}" role="img" aria-label="Produção de cereais por província">`
    geo.features
      .filter((f) => !f.properties.water)
      .filter((f) => prov === 'All' || prov === f.properties.name)
      .forEach((f) => {
        s += `<path d="${dPath(f, PX, PY)}" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="3.4"/>`
      })
    geo.features
      .filter((f) => f.properties.water)
      .forEach((f) => {
        s += `<path class="cr-water" d="${dPath(f, PX, PY)}" fill-opacity=".35"><title>Lago Niassa</title></path>`
      })
    geo.features
      .filter((f) => !f.properties.water)
      .forEach((f) => {
        const n = f.properties.name
        const v = out[n]
        const has = v > 0
        const t = has && max ? v / max : 0
        const iso = prov !== 'All'
        const isSel = prov === n
        const fill = !iso || isSel ? (has ? ramp(t) : '#EDF1EC') : '#FFFFFF'
        const fo = !iso || isSel ? (has ? 0.8 : 0.42) : 0.55
        s += `<path class="cr-prov${isSel ? ' sel' : ''}${iso && !isSel ? ' muted' : ''}" d="${dPath(f, PX, PY)}" fill="${fill}" fill-opacity="${fo}" tabindex="0" data-p="${n}"></path>`
      })
    const RMIN = 10
    const RMAX = 30
    const bubbles: { n: string; v: number; has: boolean; cx: number; cy: number; r: number }[] = []
    geo.features
      .filter((f) => !f.properties.water)
      .forEach((f) => {
        const n = f.properties.name
        const v = out[n]
        const has = v > 0
        const [cx, cy] = centroid(f, PX, PY)
        const r = has && max ? RMIN + (RMAX - RMIN) * Math.sqrt(v / max) : RMIN * 0.72
        bubbles.push({ n, v, has, cx, cy, r })
      })
    bubbles.sort((a, b) => b.r - a.r)
    const isoP = prov !== 'All'
    bubbles
      .filter((b) => !isoP || b.n === prov)
      .forEach((b) => {
        const sel = prov === b.n
        s += `<circle cx="${b.cx.toFixed(1)}" cy="${b.cy.toFixed(1)}" r="${(b.r + 2).toFixed(1)}" fill="rgba(6,43,30,.32)" pointer-events="none"/>`
        s += `<circle class="cr-bub" cx="${b.cx.toFixed(1)}" cy="${b.cy.toFixed(1)}" r="${b.r.toFixed(1)}" fill="${b.has ? '#FFFFFF' : '#EDF1EC'}" fill-opacity="${b.has ? 0.94 : 0.8}" stroke="${sel ? '#F2C21A' : '#0C3F2C'}" stroke-width="${sel ? 3.4 : 1.6}" tabindex="0" data-p="${b.n}"/>`
        const fs = Math.max(8.6, Math.min(13, b.r * 0.62))
        s += `<text class="cr-bubv" x="${b.cx.toFixed(1)}" y="${(b.cy + fs * 0.34).toFixed(1)}" text-anchor="middle" font-size="${fs.toFixed(1)}" pointer-events="none">${b.has ? short(b.v) : '—'}</text>`
        s += `<text class="cr-bubn" x="${b.cx.toFixed(1)}" y="${(b.cy + b.r + 9.5).toFixed(1)}" text-anchor="middle">${b.n === 'Maputo Provincia' ? 'Maputo' : b.n}</text>`
      })
    s += '</svg>'
    return s
  }, [proj, geo, model, prov])

  const onMapAction = (e: React.MouseEvent<HTMLDivElement>, moveOnly = false) => {
    const t = e.target as SVGElement
    const n = t.getAttribute('data-p')
    if (!n || !model || !bundle) return
    if (moveOnly) {
      const v = model.out[n]
      const rs = isAvg ? [] : rowsFor(bundle.rows, year, crop, n)
      const body = isAvg
        ? `<div class="r"><span>Média</span><b>${fmt(v)} t</b></div>`
        : rs.length
          ? rs.map((r) => `<div class="r"><span>${cropLabel(r.c)}</span><b>${fmt(r.v)} t</b></div>`).join('')
          : `<div class="r"><span>Sem dados para ${year}</span></div>`
      showTip(`<div style="font-weight:700;margin-bottom:4px">${provLabel(n)}</div>${body}`, e.clientX, e.clientY)
    } else {
      setProv(prov === n ? 'All' : n)
    }
  }

  const pieHtml = useMemo(() => {
    if (!model || !model.pieTotal) return ''
    const { pieItems, pieTotal } = model
    const S = 236
    const R = 88
    const r0 = 46
    const cx = S / 2
    const cy = S / 2
    let a0 = -Math.PI / 2
    let s = `<svg class="cr-svg" viewBox="0 0 ${S} ${S}" role="img" aria-label="Mistura de culturas">`
    pieItems.forEach((it) => {
      const ang = (it.v / pieTotal) * 2 * Math.PI
      const a1 = a0 + ang
      const dim = crop !== 'All' && crop !== it.c
      if (pieItems.length === 1) {
        s += `<circle class="cr-slice" cx="${cx}" cy="${cy}" r="${(R + r0) / 2}" fill="none" stroke="${CROP_COLOR[it.c]}" stroke-width="${R - r0}" data-c="${it.c}" opacity="${dim ? 0.3 : 1}"/>`
      } else {
        const p = (rr: number, a: number): [number, number] => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]
        const [x1, y1] = p(R, a0)
        const [x2, y2] = p(R, a1)
        const [x3, y3] = p(r0, a1)
        const [x4, y4] = p(r0, a0)
        const laf = ang > Math.PI ? 1 : 0
        s += `<path class="cr-slice" data-c="${it.c}" fill="${CROP_COLOR[it.c]}" opacity="${dim ? 0.3 : 1}" d="M${x1.toFixed(1)},${y1.toFixed(1)}A${R},${R} 0 ${laf} 1 ${x2.toFixed(1)},${y2.toFixed(1)}L${x3.toFixed(1)},${y3.toFixed(1)}A${r0},${r0} 0 ${laf} 0 ${x4.toFixed(1)},${y4.toFixed(1)}Z"/>`
      }
      a0 = a1
    })
    const head = crop === 'All' ? pieTotal : model.pieItems.find((i) => i.c === crop)?.v ?? 0
    s += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="22" font-weight="700" fill="#0C3F2C">${short(head)}</text>`
    s += `<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="#7FA491">${crop === 'All' ? 'toneladas' : cropLabel(crop)}</text></svg>`
    return s
  }, [model, crop])

  const onPieAction = (e: React.MouseEvent<HTMLDivElement>, moveOnly = false) => {
    const t = e.target as SVGElement
    const c = t.getAttribute('data-c')
    if (!c || !model) return
    if (moveOnly) {
      const it = model.pieItems.find((i) => i.c === c)
      if (!it) return
      showTip(
        `<div style="font-weight:700;margin-bottom:4px">${cropLabel(c)}</div><div class="r"><span>${isAvg ? 'Média' : 'Produção'}</span><b>${fmt(it.v)} t</b></div><div class="r"><span>Quota</span><b>${((it.v / model.pieTotal) * 100).toFixed(1)}%</b></div>`,
        e.clientX,
        e.clientY
      )
    } else {
      setCrop(crop === c ? 'All' : c)
    }
  }

  const radarHtml = useMemo(() => {
    if (!model) return ''
    const axes = model.yearsAsc
    const live = model.trend.filter((t) => t.peak > 0)
    const W = 440
    const H = 316
    const cx = W / 2
    const cy = H / 2 - 6
    const R = Math.min(W, H) / 2 - 24
    const ang = (i: number) => -Math.PI / 2 + (i / axes.length) * 2 * Math.PI
    const pt = (i: number, t: number): [number, number] => [cx + R * t * Math.cos(ang(i)), cy + R * t * Math.sin(ang(i))]
    let s = `<svg class="cr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Radar da produção nacional por cultura">`
    ;[0.25, 0.5, 0.75, 1].forEach((t) => {
      s += `<polygon class="cr-axis" points="${axes.map((_, i) => pt(i, t).map((v) => v.toFixed(1)).join(',')).join(' ')}"/>`
    })
    axes.forEach((y, i) => {
      const [x2, y2] = pt(i, 1)
      s += `<line class="cr-axis" x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`
      const [lx, ly] = pt(i, 1.13)
      const anchor = Math.abs(lx - cx) < 6 ? 'middle' : lx > cx ? 'start' : 'end'
      const sel = y === year
      s += `<text class="cr-tick" x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="${anchor}" font-weight="700" fill="${sel ? '#0C3F2C' : '#5C8574'}" style="cursor:pointer" data-y="${y}">${y}</text>`
    })
    live.forEach((t) => {
      const dim = crop !== 'All' && crop !== t.c
      const pts = axes.map((_, i) => pt(i, t.peak ? t.series[i] / t.peak : 0))
      s += `<polygon points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="${CROP_COLOR[t.c]}" fill-opacity="${dim ? 0.05 : 0.16}" stroke="${CROP_COLOR[t.c]}" stroke-width="${dim ? 1.2 : 2.4}" stroke-opacity="${dim ? 0.32 : 1}" stroke-linejoin="round"/>`
      pts.forEach((p, i) => {
        if (t.series[i] > 0)
          s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${dim ? 2 : 3.4}" fill="${CROP_COLOR[t.c]}" opacity="${dim ? 0.35 : 1}" data-c="${t.c}" data-y="${axes[i]}" data-v="${t.series[i]}" style="cursor:pointer"/>`
      })
    })
    s += '</svg>'
    return s
  }, [model, crop, year])

  const onRadarAction = (e: React.MouseEvent<HTMLDivElement>, moveOnly = false) => {
    const t = e.target as SVGElement
    const c = t.getAttribute('data-c')
    const y = t.getAttribute('data-y')
    if (!y) return
    if (moveOnly) {
      if (!c || !model) return
      const v = t.getAttribute('data-v')
      const peak = model.trend.find((tr) => tr.c === c)?.peak ?? 1
      showTip(
        `<div style="font-weight:700;margin-bottom:4px">${cropLabel(c)} · ${y}</div><div class="r"><span>Nacional</span><b>${fmt(Number(v))} t</b></div><div class="r"><span>Do pico</span><b>${((Number(v) / peak) * 100).toFixed(0)}%</b></div>`,
        e.clientX,
        e.clientY
      )
    } else {
      setYear(Number(y))
    }
  }

  const maxWlAbs = model?.wl ? Math.max(...model.wl.rows.map((o) => Math.abs(o.d)), 1) : 1
  const wlHtml = useMemo(() => {
    if (!model?.wl) return ''
    const rs = model.wl.rows
    const W = 440
    const rowH = 21
    const L = 104
    const Rr = 58
    const T = 8
    const H = T + rs.length * rowH + 16
    const xw = W - L - Rr
    const mid = L + xw / 2
    const half = xw / 2
    const maxAbs = Math.max(...rs.map((o) => Math.abs(o.d)), 1)
    let s = `<svg class="cr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Variação da produção por província">`
    rs.forEach((o, i) => {
      const y = T + i * rowH
      const w = half * (Math.abs(o.d) / maxAbs)
      const pos = o.d >= 0
      const x = pos ? mid : mid - w
      const sel = prov === o.p
      s += `<text class="cr-wllab" x="${L - 8}" y="${y + 12}" text-anchor="end">${provLabel(o.p)}</text>`
      s += `<rect class="cr-wlbar" x="${x.toFixed(1)}" y="${y + 3}" width="${Math.max(w, 1).toFixed(1)}" height="13" fill="${pos ? '#1D6E4B' : '#C0392B'}" opacity="${sel ? 1 : 0.88}" stroke="${sel ? '#F2C21A' : 'none'}" stroke-width="${sel ? 2 : 0}" data-p="${o.p}"/>`
      s += `<text class="cr-wlval" x="${(pos ? mid + w + 6 : mid - w - 6).toFixed(1)}" y="${y + 13}" text-anchor="${pos ? 'start' : 'end'}" fill="${pos ? '#1D6E4B' : '#C0392B'}">${pos ? '+' : '−'}${short(Math.abs(o.d))}</text>`
    })
    s += `<line class="cr-wlaxis" x1="${mid}" y1="${T}" x2="${mid}" y2="${T + rs.length * rowH}"/>`
    s += `<text class="cr-tick" x="${mid}" y="${H - 3}" text-anchor="middle">variação em toneladas</text></svg>`
    return s
  }, [model, prov])

  const onWlAction = (e: React.MouseEvent<HTMLDivElement>, moveOnly = false) => {
    const t = e.target as SVGElement
    const n = t.getAttribute('data-p')
    if (!n || !model?.wl) return
    if (moveOnly) {
      const o = model.wl.rows.find((r) => r.p === n)
      if (!o) return
      showTip(
        `<div style="font-weight:700;margin-bottom:4px">${provLabel(n)}</div><div class="r"><span>${model.wl.yA}</span><b>${fmt(o.a)} t</b></div><div class="r"><span>${model.wl.yB}</span><b>${fmt(o.b)} t</b></div><div class="r"><span>Variação</span><b>${o.d >= 0 ? '+' : '−'}${fmt(Math.abs(o.d))} t${o.pct != null ? ` (${o.pct >= 0 ? '+' : ''}${o.pct.toFixed(0)}%)` : ''}</b></div>`,
        e.clientX,
        e.clientY
      )
    } else {
      setProv(prov === n ? 'All' : n)
    }
  }

  if (loadError) {
    return (
      <div className="cr-root">
        <div className="cr-scroll p-8 text-center text-red-700">{loadError}</div>
      </div>
    )
  }
  if (!bundle || !geo || !model) {
    return (
      <div className="cr-root">
        <div className="cr-scroll p-8 text-center text-[var(--cr-muted)]">A carregar dashboard de cereais…</div>
      </div>
    )
  }

  const rankSorted = bundle.provinces.slice().filter((p) => model.out[p] > 0).sort((a, b) => model.out[b] - model.out[a])
  const tableMax = rankSorted.length ? model.out[rankSorted[0]] : 0
  const tableTotal = rankSorted.reduce((a, p) => a + model.out[p], 0)

  return (
    <div className="cr-root">
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

      <div className="cr-scroll">
        <div className="cr-toolbar">
          <div className="filters">
            <div className="f">
              <label htmlFor="cr-fc">Cultura</label>
              <select id="cr-fc" value={crop} onChange={(e) => setCrop(e.target.value)}>
                <option value="All">Todas as culturas</option>
                {bundle.crops.map((c) => (
                  <option key={c} value={c}>
                    {cropLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="f">
              <label htmlFor="cr-fy">Ano</label>
              <select id="cr-fy" value={String(year)} onChange={(e) => setYear(e.target.value === 'All' ? 'All' : Number(e.target.value))}>
                <option value="All">Todos os anos (média)</option>
                {bundle.years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="f">
              <label htmlFor="cr-fp">Província</label>
              <select id="cr-fp" value={prov} onChange={(e) => setProv(e.target.value)}>
                <option value="All">Todas as províncias</option>
                {bundle.provinces.map((p) => (
                  <option key={p} value={p}>
                    {provLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="reset"
              onClick={() => {
                setCrop('All')
                setYear('All')
                setProv('All')
              }}
            >
              Repor
            </button>
          </div>
        </div>

        <section className="cr-kpis">
          <div className="cr-kpi">
            <div className="n">
              {fmt(model.scopeTotal)}
              <small>t</small>
            </div>
            <div className="l">
              {isAvg ? 'Média de ' : ''}
              {prov === 'All' ? 'produção nacional' : 'produção seleccionada'}
            </div>
          </div>
          <div className="cr-kpi">
            <div className="n">
              {model.area ? fmt(model.area) : '—'}
              {model.area ? <small>ha</small> : null}
            </div>
            <div className="l">{isAvg ? 'Média de ' : ''}área cultivada</div>
          </div>
          <div className="cr-kpi">
            <div className="n">
              {model.yieldKgHa ? fmt(model.yieldKgHa) : '—'}
              {model.yieldKgHa ? <small>kg/ha</small> : null}
            </div>
            <div className="l">Rendimento</div>
          </div>
          <div className="cr-kpi">
            <div className="n">{model.share != null ? `${model.share.toFixed(1)}%` : provLabel(model.leadingProvince)}</div>
            <div className="l">{model.share != null ? 'Quota nacional' : 'Província líder'}</div>
          </div>
        </section>

        <main className="cr-main">
          <section className="cr-card cr-cMap">
            <h2>
              Produção por província
              <span>
                {crop === 'All' ? 'Todas as culturas' : cropLabel(crop)} · {isAvg ? 'média de todas as rondas' : year}
              </span>
            </h2>
            <div className="body">
              <div id="crMapWrap" style={{ aspectRatio: proj ? `${proj.MW} / ${proj.MH}` : undefined }}>
                {showTiles && proj && (
                  <div id="crTiles">
                    {proj.tiles.map((t) => (
                      <img
                        key={t.url}
                        src={t.url}
                        alt=""
                        style={{
                          left: `${(t.left / proj.MW) * 100}%`,
                          top: `${(t.top / proj.MH) * 100}%`,
                          width: `${(256 / proj.MW) * 100}%`,
                          height: `${(256 / proj.MH) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                )}
                <div
                  style={{ position: 'relative', zIndex: 1 }}
                  dangerouslySetInnerHTML={{ __html: mapHtml }}
                  onClick={(e) => onMapAction(e)}
                  onMouseMove={(e) => onMapAction(e, true)}
                  onMouseLeave={hideTip}
                />
              </div>
            </div>
            <div className="cr-legend">
              <span>0</span>
              <div className="cr-ramp" style={{ background: `linear-gradient(90deg,${[0, 0.25, 0.5, 0.75, 1].map(ramp).join(',')})` }} />
              <span>{fmt(tableMax)} t</span>
              <span className="cr-swatch" title="Sem dados" />
              <span>sem dados</span>
              <button type="button" className="reset" style={{ marginLeft: 'auto', color: '#0C3F2C', borderColor: 'rgba(12,63,44,.3)' }} onClick={() => setShowTiles((v) => !v)}>
                {showTiles ? 'Ocultar satélite' : 'Mostrar satélite'}
              </button>
            </div>
          </section>

          <section className="cr-card cr-cPie">
            <h2>
              Mistura de culturas
              <span>
                {prov === 'All' ? 'Nacional' : provLabel(prov)} · {isAvg ? 'média' : year}
              </span>
            </h2>
            <div className="body">
              {model.pieTotal > 0 ? (
                <div dangerouslySetInnerHTML={{ __html: pieHtml }} onClick={(e) => onPieAction(e)} onMouseMove={(e) => onPieAction(e, true)} onMouseLeave={hideTip} />
              ) : (
                <div className="cr-empty">Sem dados de cereais registados para {year}</div>
              )}
            </div>
            {model.pieItems.length > 0 && (
              <div className="cr-chips">
                {model.pieItems.map((it) => (
                  <span
                    key={it.c}
                    className={`cr-chip${crop !== 'All' && crop !== it.c ? ' off' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setCrop(crop === it.c ? 'All' : it.c)}
                  >
                    <span className="dot" style={{ background: CROP_COLOR[it.c] }} />
                    {cropLabel(it.c)}
                    <b>{((it.v / model.pieTotal) * 100).toFixed(1)}%</b>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="cr-card cr-cRadar">
            <h2>
              Produção nacional por cultura, por ronda <span>cada cultura à escala do seu próprio pico</span>
            </h2>
            <div className="body">
              <div dangerouslySetInnerHTML={{ __html: radarHtml }} onClick={(e) => onRadarAction(e)} onMouseMove={(e) => onRadarAction(e, true)} onMouseLeave={hideTip} />
            </div>
            <div className="cr-chips">
              {model.trend
                .filter((t) => t.peak > 0)
                .map((t) => (
                  <span
                    key={t.c}
                    className={`cr-chip${crop !== 'All' && crop !== t.c ? ' off' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setCrop(crop === t.c ? 'All' : t.c)}
                  >
                    <span className="dot" style={{ background: CROP_COLOR[t.c] }} />
                    {cropLabel(t.c)}
                    <b>pico {short(t.peak)} t</b>
                  </span>
                ))}
            </div>
          </section>

          <section className="cr-card cr-cYield">
            <h2>
              Ganhos e perdas
              <span>
                {crop === 'All' ? 'Todas as culturas' : cropLabel(crop)} · {model.wl ? `${model.wl.yA} → ${model.wl.yB}` : ''}
              </span>
            </h2>
            <div className="body">
              {model.wl ? (
                <div dangerouslySetInnerHTML={{ __html: wlHtml }} onClick={(e) => onWlAction(e)} onMouseMove={(e) => onWlAction(e, true)} onMouseLeave={hideTip} />
              ) : (
                <div className="cr-empty">
                  {crop === 'All' ? 'Cereais' : cropLabel(crop)} tem apenas uma ronda de inquérito — sem alteração para comparar.
                </div>
              )}
            </div>
            {model.wl && (
              <div className="cr-wlbig">
                {(() => {
                  const net = model.wl.rows.reduce((a, b) => a + b.d, 0)
                  const up = model.wl.rows.filter((o) => o.d > 0)
                  const dn = model.wl.rows.filter((o) => o.d < 0)
                  return (
                    <>
                      <b style={{ color: net >= 0 ? '#1D6E4B' : '#C0392B' }}>
                        {net >= 0 ? '+' : '−'}
                        {short(Math.abs(net))} t
                      </b>
                      <span>
                        líquido · {up.length} em alta, {dn.length} em baixa
                      </span>
                    </>
                  )
                })()}
              </div>
            )}
          </section>

          <section className="cr-card cr-cTbl">
            <h2>
              Produção por província
              <span>
                {crop === 'All' ? 'Todas as culturas' : cropLabel(crop)} · {isAvg ? 'média por ronda' : year}
              </span>
            </h2>
            <div className="body">
              {rankSorted.length === 0 ? (
                <div className="cr-empty">Sem dados de {crop === 'All' ? 'cereais' : cropLabel(crop).toLowerCase()} registados para {year}</div>
              ) : (
                <table className="cr-table">
                  <thead>
                    <tr>
                      <th className="c-prov">Província</th>
                      <th className="c-val">{isAvg ? 'Média t' : 'Toneladas'}</th>
                      <th className="c-pct">%</th>
                      {isAvg && <th className="c-rnd">Rondas</th>}
                      <th className="cr-barcell" />
                    </tr>
                  </thead>
                  <tbody>
                    {rankSorted.map((p) => (
                      <tr key={p} className={prov === p ? 'sel' : ''} onClick={() => setProv(prov === p ? 'All' : p)}>
                        <td className="c-prov">{provLabel(p)}</td>
                        <td className="c-val">{fmt(model.out[p])}</td>
                        <td className="c-pct">{((model.out[p] / tableTotal) * 100).toFixed(1)}</td>
                        {isAvg && <td className="c-rnd">{model.rounds[p]}</td>}
                        <td className="cr-barcell">
                          <span className="cr-bartrack" style={{ display: 'block' }}>
                            <span className="cr-bar" style={{ width: `${(model.out[p] / tableMax) * 100}%` }} />
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700, background: 'var(--cr-paper)', cursor: 'default' }}>
                      <td className="c-prov">Total</td>
                      <td className="c-val">{fmt(tableTotal)}</td>
                      <td className="c-pct">100.0</td>
                      {isAvg && <td className="c-rnd" />}
                      <td className="cr-barcell" />
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </main>

        <p className="cr-footer">
          Fonte: {bundle.fonte} · fronteiras: shapefile de províncias fornecido, EPSG:4326 · imagem de satélite: Esri World Imagery. As rondas são
          periódicas, não anuais — anos ausentes do filtro nunca foram inquiridos, pelo que a &quot;média&quot; é a média das rondas com dados, não de
          cada ano civil. O sorgo e o milheto têm dados provinciais apenas para a ronda de 2023.
        </p>
      </div>

      <div ref={tooltipRef} className="cr-tooltip" style={{ position: 'fixed', pointerEvents: 'none', background: '#062B1E', color: '#fff', padding: '8px 11px', borderRadius: 8, fontSize: 13, opacity: 0, transition: 'opacity .1s', zIndex: 99, boxShadow: '0 6px 20px rgba(6,43,30,.34)', maxWidth: 240 }} />
    </div>
  )
}
