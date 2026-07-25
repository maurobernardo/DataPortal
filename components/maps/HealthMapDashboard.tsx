'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { BarChart3, Loader2, Search } from 'lucide-react'
import type { CircleMarker, LayerGroup, Map as LeafletMap, TileLayer } from 'leaflet'
import {
  VAR_META,
  VAR_GROUPS,
  PROVINCES,
  colourScale,
  fmt,
  getRadius,
  type VarMeta,
} from '@/components/maps/health-map-utils'
import '@/app/maps/health-map.css'

type Adm3Props = {
  adm3_id: string
  province: string
  district: string
  post_name: string
  pop_2017?: number
  area_km2?: number
  urban_class?: string
  pop_density?: number
  malaria_ecotype?: string
  coast_dist_km?: number
  [key: string]: string | number | undefined
}

type Adm3Feature = {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: Adm3Props
}

type Adm3Collection = {
  type: 'FeatureCollection'
  features: Adm3Feature[]
  metadata?: Record<string, unknown>
}

type LModule = typeof import('leaflet')

const ACCENT = '#064E2C'
const ACCENT_LIGHT = '#E7F3EB'

const TILE_KEYS = ['osm', 'topo', 'dark', 'sat'] as const
type TileKey = (typeof TILE_KEYS)[number]

export function HealthMapDashboard({
  geojsonPath,
  title = 'Data4Moz — Mapa Inteligente de Saúde',
  subtitle = 'Postos administrativos ADM3 · Moçambique',
  badges = ['204 Postos Admin.', '20 Variáveis', '11 Províncias'],
}: {
  geojsonPath: string
  title?: string
  subtitle?: string
  badges?: string[]
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerGroupRef = useRef<LayerGroup | null>(null)
  const tilesRef = useRef<Record<TileKey, TileLayer | null>>({
    osm: null,
    topo: null,
    dark: null,
    sat: null,
  })
  const activeTileRef = useRef<TileKey>('osm')
  const leafletRef = useRef<LModule | null>(null)

  const [data, setData] = useState<Adm3Collection | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentVar, setCurrentVar] = useState('TECI_adm3')
  const [currentProv, setCurrentProv] = useState('all')
  const [sizeByPop, setSizeByPop] = useState(true)
  const [tileKey, setTileKey] = useState<TileKey>('osm')
  const [search, setSearch] = useState('')
  const [infoOpen, setInfoOpen] = useState(false)
  const [infoTitle, setInfoTitle] = useState('Detalhes do posto')
  const [infoHtml, setInfoHtml] = useState('')
  const [legendTitle, setLegendTitle] = useState('Pontuação TECI')
  const [legendHtml, setLegendHtml] = useState('')
  const [statsHtml, setStatsHtml] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(geojsonPath)
      .then((r) => {
        if (!r.ok) throw new Error(`Ficheiro não encontrado (${r.status})`)
        return r.json()
      })
      .then((json: Adm3Collection) => {
        if (!cancelled) setData(json)
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message || 'Erro ao carregar dados')
      })
    return () => {
      cancelled = true
    }
  }, [geojsonPath])

  const buildPopup = useCallback(
    (p: Adm3Props) => {
      const mv = VAR_META[currentVar]
      const cv = p[currentVar]
      return `<div style="font-family:Segoe UI,sans-serif;font-size:12px;min-width:160px">
    <div style="background:${ACCENT};color:#fff;font-weight:700;padding:5px 8px;margin:-1px -1px 5px;border-radius:4px 4px 0 0">
      ${p.post_name}</div>
    <div style="color:#8b949e;font-size:10px;margin-bottom:4px">${p.district} · ${p.province}</div>
    <div style="background:#21262d;padding:4px 6px;border-radius:4px;margin-bottom:4px">
      <div style="color:${ACCENT_LIGHT};font-size:10px;font-weight:700">${mv ? mv.label : currentVar}</div>
      <div style="color:#e6edf3;font-size:16px;font-weight:700">${fmt(cv, mv ? mv.unit : '')}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;font-size:10px">
      <div style="color:#8b949e">População</div><div style="color:#e6edf3">${(p.pop_2017 || 0).toLocaleString('pt-PT')}</div>
      <div style="color:#8b949e">Área km²</div><div style="color:#e6edf3">${(p.area_km2 || 0).toLocaleString('pt-PT')}</div>
      <div style="color:#8b949e">Classe</div><div style="color:#e6edf3">${p.urban_class || '—'}</div>
      <div style="color:#8b949e">TECI</div><div style="color:#e6edf3">${fmt(p.TECI_adm3)}/10</div>
      <div style="color:#8b949e">HSSI</div><div style="color:#e6edf3">${fmt(p.HSSI_adm3)}/10</div>
      <div style="color:#8b949e">Cascata VIH</div><div style="color:#e6edf3">${fmt(p.HCCR_adm3)}%</div>
      <div style="color:#8b949e">Ecotipo</div><div style="color:#e6edf3;font-size:9px">${p.malaria_ecotype || '—'}</div>
    </div>
  </div>`
    },
    [currentVar]
  )

  const buildInfoBox = useCallback(
    (p: Adm3Props) => {
      const mv = VAR_META[currentVar]
      const cv = p[currentVar]
      setInfoTitle(`${p.post_name} — ${p.district}`)
      const rows: { section?: string; k?: string; v?: string; bar?: boolean; t?: number; col?: string }[] = [
        { section: 'Localização' },
        { k: 'Província', v: p.province },
        { k: 'Distrito', v: p.district },
        { k: 'ID ADM3', v: p.adm3_id },
        { k: 'Classe urbana', v: p.urban_class },
        { k: 'Ecotipo malária', v: p.malaria_ecotype },
        { section: 'Demografia' },
        { k: 'População 2017', v: (p.pop_2017 || 0).toLocaleString('pt-PT') },
        { k: 'Área km²', v: (p.area_km2 || 0).toLocaleString('pt-PT') },
        { k: 'Densidade/km²', v: fmt(p.pop_density) },
        { section: 'Variável seleccionada' },
        {
          k: mv ? mv.label : 'Valor',
          v: fmt(cv, mv ? mv.unit : ''),
          bar: true,
          t: mv ? Math.max(0, Math.min(1, ((Number(cv) || 0) - mv.min) / (mv.max - mv.min))) : 0,
          col: colourScale(Number(cv), mv || { min: 0, max: 10, hi: 'bad', unit: '', label: '', desc: '' }),
        },
        { section: 'Sistema de saúde' },
        {
          k: 'HSSI (Stress)',
          v: `${fmt(p.HSSI_adm3)}/10`,
          bar: true,
          t: (Number(p.HSSI_adm3) || 0) / 10,
          col: colourScale(Number(p.HSSI_adm3), VAR_META.HSSI_adm3),
        },
        {
          k: 'HSER (Eficiência)',
          v: fmt(p.HSER_adm3),
          bar: true,
          t: (Number(p.HSER_adm3) || 0) / 20,
          col: colourScale(Number(p.HSER_adm3), VAR_META.HSER_adm3),
        },
        { section: 'Epidemiologia' },
        {
          k: 'TECI',
          v: `${fmt(p.TECI_adm3)}/10`,
          bar: true,
          t: (Number(p.TECI_adm3) || 0) / 10,
          col: colourScale(Number(p.TECI_adm3), VAR_META.TECI_adm3),
        },
        {
          k: 'Cascata VIH',
          v: `${fmt(p.HCCR_adm3)}%`,
          bar: true,
          t: (Number(p.HCCR_adm3) || 0) / 100,
          col: colourScale(Number(p.HCCR_adm3), VAR_META.HCCR_adm3),
        },
        { section: 'Acesso e clima' },
        { k: 'GHAD (Défice acesso)', v: `${fmt(p.GHAD_adm3)}%` },
        { k: 'CHVI (Clima)', v: `${fmt(p.CHVI_adm3)}/10` },
        { k: 'Dist. costa km', v: fmt(p.coast_dist_km) },
      ]
      let html = ''
      rows.forEach((r) => {
        if (r.section) {
          html += `<div class="hm-info-section">${r.section}</div>`
        } else if (r.bar && r.k) {
          html += `<div class="hm-info-row">
        <span class="hm-info-key">${r.k}</span>
        <div style="display:flex;align-items:center;gap:4px;width:55%">
          <div class="hm-bar-bg"><div class="hm-bar-fill" style="width:${((r.t || 0) * 100).toFixed(0)}%;background:${r.col}"></div></div>
          <span class="hm-info-val" style="width:45px;text-align:right">${r.v}</span>
        </div></div>`
        } else if (r.k) {
          html += `<div class="hm-info-row"><span class="hm-info-key">${r.k}</span><span class="hm-info-val">${r.v}</span></div>`
        }
      })
      setInfoHtml(html)
      setInfoOpen(true)
    },
    [currentVar]
  )

  const renderLegend = useCallback((varKey: string) => {
    const mv: VarMeta = VAR_META[varKey] || {
      label: varKey,
      min: 0,
      max: 10,
      hi: 'bad',
      unit: '',
      desc: '',
    }
    setLegendTitle(mv.label)
    const labels =
      mv.hi === 'both'
        ? ['Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto']
        : mv.hi === 'bad'
          ? ['Melhor', 'Bom', 'Médio', 'Fraco', 'Pior']
          : ['Pior', 'Fraco', 'Médio', 'Bom', 'Melhor']
    let html = ''
    ;[0, 0.25, 0.5, 0.75, 1].forEach((t, i) => {
      const v = (mv.min + (mv.max - mv.min) * t).toFixed(1)
      html += `<div class="hm-legend-row"><div class="hm-legend-dot" style="background:${colourScale(mv.min + (mv.max - mv.min) * t, mv)}"></div>${v}${mv.unit} ${labels[i]}</div>`
    })
    setLegendHtml(html)
  }, [])

  const renderStats = useCallback(
    (features: Adm3Feature[]) => {
      const vals = features
        .map((f) => f.properties[currentVar])
        .filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)))
        .map(Number)
      if (!vals.length) {
        setStatsHtml('<div style="color:#484f58;font-size:.7rem">Sem dados</div>')
        return
      }
      const sorted = [...vals].sort((a, b) => a - b)
      const mean = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
      const med = sorted[Math.floor(sorted.length / 2)].toFixed(2)
      const mn = sorted[0].toFixed(2)
      const mx = sorted[sorted.length - 1].toFixed(2)
      const mv = VAR_META[currentVar] || { unit: '', desc: '' }
      setStatsHtml(
        `<div class="hm-stat-row"><span>Postos visíveis</span><span class="hm-stat-val">${vals.length}</span></div>
     <div class="hm-stat-row"><span>Média</span><span class="hm-stat-val">${mean}${mv.unit}</span></div>
     <div class="hm-stat-row"><span>Mediana</span><span class="hm-stat-val">${med}${mv.unit}</span></div>
     <div class="hm-stat-row"><span>Mín.</span><span class="hm-stat-val">${mn}${mv.unit}</span></div>
     <div class="hm-stat-row"><span>Máx.</span><span class="hm-stat-val">${mx}${mv.unit}</span></div>
     <div style="margin-top:5px;font-size:.62rem;color:#484f58">${mv.desc || ''}</div>`
      )
    },
    [currentVar]
  )

  const redraw = useCallback(() => {
    if (!data || !layerGroupRef.current || !leafletRef.current) return
    const L = leafletRef.current

    layerGroupRef.current.clearLayers()
    const searchLower = search.toLowerCase().trim()
    const filtered =
      currentProv === 'all'
        ? data.features
        : data.features.filter((f) => f.properties.province === currentProv)
    const shown = searchLower
      ? filtered.filter(
          (f) =>
            f.properties.post_name.toLowerCase().includes(searchLower) ||
            f.properties.district.toLowerCase().includes(searchLower)
        )
      : filtered

    const mv = VAR_META[currentVar] || { min: 0, max: 10, hi: 'bad' as const, unit: '', label: '', desc: '' }
    renderLegend(currentVar)
    renderStats(shown as Adm3Feature[])

    shown.forEach((feat) => {
      const p = feat.properties
      const [lng, lat] = feat.geometry.coordinates
      const val = p[currentVar]
      const color = colourScale(Number(val), mv)
      const radius = getRadius(p.pop_2017, sizeByPop)
      const circle: CircleMarker = L.circleMarker([lat, lng], {
        radius,
        color: 'rgba(255,255,255,0.4)',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.85,
      })
      circle.bindPopup(buildPopup(p), { maxWidth: 240 })
      circle.on('click', () => buildInfoBox(p))
      circle.on('mouseover', function (this: CircleMarker) {
        this.setStyle({ weight: 2, color: ACCENT_LIGHT, fillOpacity: 1 })
        this.bringToFront()
      })
      circle.on('mouseout', function (this: CircleMarker) {
        this.setStyle({ weight: 1, color: 'rgba(255,255,255,0.4)', fillOpacity: 0.85 })
      })
      layerGroupRef.current!.addLayer(circle)
    })
  }, [
    data,
    currentVar,
    currentProv,
    sizeByPop,
    search,
    buildPopup,
    buildInfoBox,
    renderLegend,
    renderStats,
  ])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    let cancelled = false

    import('leaflet').then((mod) => {
      const L = (mod as { default?: LModule }).default ?? (mod as LModule)
      if (cancelled || !mapContainerRef.current || mapRef.current) return

      leafletRef.current = L
      const map = L.map(mapContainerRef.current, {
        center: [-18.5, 35.0],
        zoom: 6,
        zoomControl: true,
        attributionControl: true,
      })

      tilesRef.current = {
        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 18,
        }),
        topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenTopoMap',
          maxZoom: 17,
        }),
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© CartoDB',
          maxZoom: 19,
        }),
        sat: L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { attribution: '© Esri', maxZoom: 18 }
        ),
      }
      tilesRef.current.osm!.addTo(map)
      layerGroupRef.current = L.layerGroup().addTo(map)
      mapRef.current = map

      map.on('click', () => setInfoOpen(false))

      const fixSize = () => {
        map.invalidateSize(true)
      }
      requestAnimationFrame(fixSize)
      setTimeout(fixSize, 100)
      setTimeout(fixSize, 400)

      setMapReady(true)
    })

    const onResize = () => mapRef.current?.invalidateSize(true)
    window.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      mapRef.current?.remove()
      mapRef.current = null
      layerGroupRef.current = null
      leafletRef.current = null
      setMapReady(false)
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !data) return
    redraw()
    mapRef.current?.invalidateSize(true)
  }, [mapReady, data, redraw])

  useEffect(() => {
    const el = mapContainerRef.current
    if (!el) return

    const ro = new ResizeObserver(() => {
      mapRef.current?.invalidateSize(true)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const tiles = tilesRef.current
    const map = mapRef.current
    if (!map || !tiles.osm) return
    TILE_KEYS.forEach((k) => {
      if (tiles[k] && map.hasLayer(tiles[k]!)) map.removeLayer(tiles[k]!)
    })
    const next = tiles[tileKey]
    if (next) {
      next.addTo(map)
      activeTileRef.current = tileKey
    }
  }, [tileKey])

  useEffect(() => {
    if (currentProv === 'all' || !data || !mapRef.current) return
    const feats = data.features.filter((f) => f.properties.province === currentProv)
    if (!feats.length) return
    const lats = feats.map((f) => f.geometry.coordinates[1])
    const lngs = feats.map((f) => f.geometry.coordinates[0])
    mapRef.current.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [30, 30] }
    )
  }, [currentProv, data])

  const handleProvChange = (prov: string) => {
    setCurrentProv(prov)
    if (prov === 'all' && mapRef.current) {
      mapRef.current.setView([-18.5, 35.0], 6)
    }
  }

  if (loadError) {
    return (
      <div className="hm-root">
        <div className="hm-error">
          Não foi possível carregar o mapa: {loadError}. Coloque o ficheiro GeoJSON em{' '}
          <code>public/data/health-adm3.geojson</code> (veja <code>scripts/extract-health-map-data.mjs</code>).
        </div>
      </div>
    )
  }

  return (
    <div className="hm-root">
      <header className="hm-header">
        <Image
          src="/images/logo.png"
          alt="Portal de Dados"
          width={44}
          height={44}
          className="hm-logo"
        />
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

      <div className="hm-controls">
        <span className="hm-ctrl-label">Variável</span>
        <select value={currentVar} onChange={(e) => setCurrentVar(e.target.value)} aria-label="Variável">
          {VAR_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <span className="hm-ctrl-label">Província</span>
        <select
          value={currentProv}
          onChange={(e) => handleProvChange(e.target.value)}
          aria-label="Província"
        >
          <option value="all">Todas as províncias</option>
          {PROVINCES.filter((p) => p !== 'all').map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <span className="hm-ctrl-label">Tamanho</span>
        <select
          value={sizeByPop ? 'pop' : 'equal'}
          onChange={(e) => setSizeByPop(e.target.value === 'pop')}
          aria-label="Tamanho dos pontos"
        >
          <option value="pop">População</option>
          <option value="equal">Tamanho igual</option>
        </select>

        <span className="hm-ctrl-label">Tiles</span>
        <select value={tileKey} onChange={(e) => setTileKey(e.target.value as TileKey)} aria-label="Camada base">
          <option value="osm">OpenStreetMap</option>
          <option value="topo">OpenTopoMap</option>
          <option value="dark">CartoDB Dark</option>
          <option value="sat">Esri Satélite</option>
        </select>

        <label className="hm-search-wrap">
          <Search className="hm-search-icon size-3.5" aria-hidden />
          <input
            type="text"
            className="hm-search"
            placeholder="Pesquisar posto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Pesquisar posto"
          />
        </label>
      </div>

      <div className="hm-map-wrap">
        <div ref={mapContainerRef} className="hm-map" id="hm-map" />

        {!mapReady || !data ? (
          <div className="hm-loading-overlay" aria-live="polite">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            A carregar mapa…
          </div>
        ) : null}

        <div className="hm-stats-panel">
          <h4>
            <BarChart3 className="hm-panel-icon size-3.5" aria-hidden />
            Estatísticas resumo
          </h4>
          <div dangerouslySetInnerHTML={{ __html: statsHtml }} />
        </div>

        <div className="hm-legend">
          <h4>{legendTitle}</h4>
          <div dangerouslySetInnerHTML={{ __html: legendHtml }} />
          <div style={{ marginTop: 6, paddingTop: 5, borderTop: '1px solid #30363d' }}>
            <div className="hm-legend-row">
              <span className="hm-legend-dot" style={{ background: '#94a3b8' }} />
              Sem dados
            </div>
          </div>
        </div>

        <div className={`hm-info-box${infoOpen ? ' is-open' : ''}`}>
          <h3>{infoTitle}</h3>
          <div className="hm-info-body" dangerouslySetInnerHTML={{ __html: infoHtml }} />
        </div>
      </div>
    </div>
  )
}
