'use client'

import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  Database,
  Download,
  Filter,
  Layers,
  MapPin,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
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
import {
  ACCENT,
  ACCENT_LIGHT,
  CONDITION_COLOR,
  MATERIAL_COLOR,
  computeHotspots,
  decodePolesData,
  type HotspotCell,
  emptySelection,
  fmt,
  isAnySelected,
  passesFilter,
  pct,
  toggleSet,
  type PoleRecord,
  type PolesRawBundle,
  type PolesSelection,
} from './poles-map-utils'
import '@/app/maps/health-map.css'
import '@/app/maps/poles-map.css'

import type { LayerGroup, Map as LeafletMap, TileLayer } from 'leaflet'

type LModule = typeof import('leaflet')

const TILE_KEYS = ['osm', 'topo', 'dark', 'sat'] as const
type TileKey = (typeof TILE_KEYS)[number]

const TILE_LABELS: Record<TileKey, string> = {
  osm: 'OpenStreetMap',
  topo: 'Topográfico',
  dark: 'Escuro',
  sat: 'Satélite',
}

const PIE_COLORS = [ACCENT, '#0d9488', '#ca8a04', '#dc2626', ACCENT_LIGHT]

const PM_TOOLTIP_STYLE = {
  contentStyle: {
    background: '#161b22',
    border: `1px solid ${ACCENT}`,
    borderRadius: 8,
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
    padding: '8px 12px',
  },
  labelStyle: {
    color: ACCENT_LIGHT,
    fontWeight: 700,
    fontSize: 12,
    marginBottom: 4,
  },
  itemStyle: {
    color: '#e6edf3',
    fontSize: 11,
  },
  cursor: { fill: 'rgba(6, 78, 44, 0.2)', stroke: ACCENT, strokeWidth: 1 },
}

function PmChartTooltip({
  formatter,
  ...rest
}: React.ComponentProps<typeof Tooltip>) {
  return <Tooltip {...PM_TOOLTIP_STYLE} formatter={formatter} {...rest} />
}

type Props = {
  dataPath: string
  title: string
  subtitle: string
  badges?: string[]
}

function FilterChips({
  sel,
  onRemove,
  onClearAll,
}: {
  sel: PolesSelection
  onRemove: (dim: keyof PolesSelection, val: string | number) => void
  onClearAll: () => void
}) {
  const chips: { kind: keyof PolesSelection; val: string | number; label: string }[] = []
  sel.prov.forEach((v) => chips.push({ kind: 'prov', val: v, label: 'Província' }))
  sel.state.forEach((v) => chips.push({ kind: 'state', val: v, label: 'Estado' }))
  sel.mat.forEach((v) => chips.push({ kind: 'mat', val: v, label: 'Material' }))
  sel.volt.forEach((v) => chips.push({ kind: 'volt', val: v, label: 'Tensão' }))
  sel.lines.forEach((v) => chips.push({ kind: 'lines', val: v, label: 'Linhas' }))
  sel.flags.forEach((v) =>
    chips.push({
      kind: 'flags',
      val: v,
      label: v === 'def' ? 'Defeituosos' : v === 'ov' ? 'Sobrecarregados' : 'Madeira',
    })
  )

  if (chips.length === 0) return null

  return (
    <div className="pm-filter-bar">
      <Filter size={14} style={{ color: ACCENT_LIGHT }} />
      <span className="text-xs font-semibold" style={{ color: ACCENT_LIGHT }}>
        {chips.length} {chips.length === 1 ? 'filtro activo' : 'filtros activos'}
      </span>
      {chips.map((c, i) => (
        <span key={i} className="pm-chip">
          <span style={{ color: 'var(--hm-muted)' }}>{c.label}:</span>
          {c.kind === 'flags' ? c.label : String(c.val)}
          <button type="button" onClick={() => onRemove(c.kind, c.val)} aria-label="Remover filtro">
            <X size={12} />
          </button>
        </span>
      ))}
      <button
        type="button"
        className="ml-auto text-xs px-3 py-1 rounded-full font-medium"
        style={{ background: '#dc2626', color: '#fff' }}
        onClick={onClearAll}
      >
        Limpar tudo
      </button>
    </div>
  )
}

function HeatmapMatrix({
  data,
  sel,
  onCellClick,
}: {
  data: PoleRecord[]
  sel: PolesSelection
  onCellClick: (mat: string | null, state: string | null) => void
}) {
  const materials = ['Madeira', 'Betão', 'Metal']
  const conditions = ['Bom', 'Inclinado', 'Danificado', 'Partido']

  const matrix = useMemo(() => {
    const m: Record<string, Record<string, number> & { total: number }> = {}
    materials.forEach((mat) => {
      m[mat] = { total: 0 }
      conditions.forEach((c) => {
        m[mat][c] = 0
      })
    })
    data.forEach((d) => {
      if (m[d.mat]) {
        m[d.mat][d.state] = (m[d.mat][d.state] || 0) + 1
        m[d.mat].total += 1
      }
    })
    return m
  }, [data])

  const maxCell = Math.max(
    1,
    ...materials.flatMap((mat) => conditions.map((c) => matrix[mat][c] as number))
  )

  return (
    <div className="pm-matrix overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th className="text-left">Material ↓ / Estado →</th>
            {conditions.map((c) => (
              <th
                key={c}
                className="cursor-pointer hover:underline"
                onClick={() => onCellClick(null, c)}
              >
                <span className="pm-dot inline-block mr-1" style={{ background: CONDITION_COLOR[c] }} />
                {c}
              </th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((mat) => (
            <tr key={mat}>
              <td
                className="text-left font-semibold cursor-pointer hover:underline"
                onClick={() => onCellClick(mat, null)}
              >
                <span className="pm-dot inline-block mr-1" style={{ background: MATERIAL_COLOR[mat] }} />
                {mat}
              </td>
              {conditions.map((c) => {
                const v = matrix[mat][c] as number
                const intensity = v / maxCell
                const rowPct = matrix[mat].total > 0 ? (v / matrix[mat].total) * 100 : 0
                const active = sel.mat.has(mat) && sel.state.has(c)
                return (
                  <td key={c}>
                    <div
                      className="rounded-md p-2 cursor-pointer transition-transform"
                      style={{
                        background:
                          c === 'Bom'
                            ? `rgba(22,163,74,${0.15 + intensity * 0.5})`
                            : `rgba(220,38,38,${0.15 + intensity * 0.5})`,
                        border: active ? `2px solid ${ACCENT_LIGHT}` : '2px solid transparent',
                        transform: active ? 'scale(1.03)' : 'none',
                      }}
                      onClick={() => onCellClick(mat, c)}
                    >
                      <div className="font-bold tabular-nums">{fmt(v)}</div>
                      <div className="text-xs" style={{ color: 'var(--hm-muted)' }}>
                        {rowPct.toFixed(1)}%
                      </div>
                    </div>
                  </td>
                )
              })}
              <td className="tabular-nums" style={{ color: 'var(--hm-muted)' }}>
                {fmt(matrix[mat].total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PolesMapDashboard({ dataPath, title, subtitle, badges = [] }: Props) {
  const [allData, setAllData] = useState<PoleRecord[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sel, setSel] = useState<PolesSelection>(emptySelection())
  const [showHeat, setShowHeat] = useState(false)
  const [showHotspots, setShowHotspots] = useState(true)
  const [selected, setSelected] = useState<PoleRecord | null>(null)
  const [tileKey, setTileKey] = useState<TileKey>('osm')
  const [mapReady, setMapReady] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const leafletRef = useRef<LModule | null>(null)
  const inLayerRef = useRef<LayerGroup | null>(null)
  const outLayerRef = useRef<LayerGroup | null>(null)
  const hotspotLayerRef = useRef<LayerGroup | null>(null)
  const heatLayerRef = useRef<LayerGroup | null>(null)
  const tilesRef = useRef<Record<TileKey, TileLayer | null>>({
    osm: null,
    topo: null,
    dark: null,
    sat: null,
  })

  useEffect(() => {
    let cancelled = false
    fetch(dataPath)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json() as Promise<PolesRawBundle>
      })
      .then((raw) => {
        if (!cancelled) setAllData(decodePolesData(raw))
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Erro ao carregar dados')
      })
    return () => {
      cancelled = true
    }
  }, [dataPath])

  const toggleDim = useCallback((dim: keyof PolesSelection, val: string | number) => {
    setSel((s) => ({ ...s, [dim]: toggleSet(s[dim] as Set<string | number>, val) }))
  }, [])

  const removeChip = useCallback((dim: keyof PolesSelection, val: string | number) => {
    setSel((s) => {
      const next = new Set(s[dim] as Set<string | number>)
      next.delete(val)
      return { ...s, [dim]: next }
    })
  }, [])

  const clearAll = useCallback(() => {
    setSel(emptySelection())
    setSelected(null)
  }, [])

  const filtered = useMemo(
    () => allData.filter((d) => passesFilter(d, sel)),
    [allData, sel]
  )

  const filterActive = isAnySelected(sel)

  const kpis = useMemo(() => {
    const total = filtered.length
    const defective = filtered.filter((d) => d.def).length
    const wood = filtered.filter((d) => d.mat === 'Madeira').length
    const overload = filtered.filter((d) => d.ov).length
    const provs = new Set(filtered.map((d) => d.prov)).size
    return {
      total,
      defective,
      wood,
      overload,
      provs,
      defectRate: pct(defective, total),
      woodPct: pct(wood, total),
    }
  }, [filtered])

  const hotspots = useMemo(
    () => (showHotspots ? computeHotspots(filtered) : []),
    [filtered, showHotspots]
  )

  const onHotspotClick = useCallback((h: HotspotCell) => {
    const provs = new Set(h.poles.map((p) => p.prov))
    setSel((s) => ({
      ...s,
      prov: provs,
      flags: new Set([...Array.from(s.flags), 'def']),
    }))
  }, [])

  const condByProv = useMemo(() => {
    const provs = Array.from(new Set(filtered.map((d) => d.prov)))
    return provs
      .map((p) => {
        const rows = filtered.filter((d) => d.prov === p)
        const t = rows.length
        return {
          province: p,
          Bom: pct(rows.filter((r) => r.state === 'Bom').length, t),
          Inclinado: pct(rows.filter((r) => r.state === 'Inclinado').length, t),
          Danificado: pct(rows.filter((r) => r.state === 'Danificado').length, t),
          Partido: pct(rows.filter((r) => r.state === 'Partido').length, t),
        }
      })
      .sort(
        (a, b) =>
          b.Inclinado + b.Danificado + b.Partido - (a.Inclinado + a.Danificado + a.Partido)
      )
  }, [filtered])

  const matByProv = useMemo(() => {
    const provs = Array.from(new Set(filtered.map((d) => d.prov)))
    return provs.map((p) => {
      const rows = filtered.filter((d) => d.prov === p)
      return {
        province: p,
        Madeira: rows.filter((r) => r.mat === 'Madeira').length,
        ['Betão']: rows.filter((r) => r.mat === 'Betão').length,
        Metal: rows.filter((r) => r.mat === 'Metal').length,
      }
    })
  }, [filtered])

  const linesHist = useMemo(() => {
    const buckets: Record<number, number> = {}
    for (let i = 0; i <= 22; i++) buckets[i] = 0
    filtered.forEach((d) => {
      const v = Math.min(d.lines, 22)
      buckets[v] = (buckets[v] || 0) + 1
    })
    return Object.entries(buckets).map(([k, v]) => ({
      lines: +k,
      count: v,
      overload: +k > 8,
    }))
  }, [filtered])

  const voltMix = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach((d) => {
      const v = d.volt || 'N/A'
      counts[v] = (counts[v] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filtered])

  const scatterByProv = useMemo(() => {
    const grouped: Record<string, { x: number; y: number; z: number; prov: string; pid: number }[]> =
      {}
    filtered.forEach((d) => {
      if (!grouped[d.prov]) grouped[d.prov] = []
      grouped[d.prov].push({
        x: d.lines,
        y: d.risk,
        z: d.def ? 60 : 20,
        prov: d.prov,
        pid: d.pid,
      })
    })
    return grouped
  }, [filtered])

  const top20 = useMemo(
    () => [...filtered].sort((a, b) => b.risk - a.risk).slice(0, 20),
    [filtered]
  )

  const weekly = useMemo(() => {
    const buckets = new Map<string, number>()
    filtered.forEach((d) => {
      if (!d.date) return
      const start = new Date(d.date)
      start.setHours(0, 0, 0, 0)
      start.setDate(start.getDate() - start.getDay())
      const key = start.toISOString().slice(0, 10)
      buckets.set(key, (buckets.get(key) || 0) + 1)
    })
    return Array.from(buckets.entries())
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week))
  }, [filtered])

  const narratives = useMemo(() => {
    if (filtered.length === 0) return []
    const provDef: Record<string, number> = {}
    filtered.forEach((d) => {
      if (d.def) provDef[d.prov] = (provDef[d.prov] || 0) + 1
    })
    const totalDef = Object.values(provDef).reduce((a, b) => a + b, 0)
    const topProv = Object.entries(provDef).sort((a, b) => b[1] - a[1])[0]
    const topProvName = topProv ? topProv[0] : 'N/D'
    const topProvShare = topProv ? pct(topProv[1], totalDef) : 0
    const topProvRows = filtered.filter((d) => d.prov === topProvName && d.def)
    const matCounts: Record<string, number> = {}
    topProvRows.forEach((r) => {
      matCounts[r.mat] = (matCounts[r.mat] || 0) + 1
    })
    const dominantMat =
      Object.entries(matCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/D'
    const reductionPotential = pct(topProv ? topProv[1] : 0, filtered.length)

    const wood = filtered.filter((d) => d.mat === 'Madeira')
    const concrete = filtered.filter((d) => d.mat === 'Betão')
    const woodFail = wood.length ? pct(wood.filter((d) => d.def).length, wood.length) : 0
    const concFail = concrete.length
      ? pct(concrete.filter((d) => d.def).length, concrete.length)
      : 0
    const ratio = concFail > 0 ? woodFail / concFail : 0
    const topQuartileN = Math.round(wood.filter((d) => d.def).length * 0.25)

    const ov = filtered.filter((d) => d.ov)
    const ovDefPct = ov.length ? pct(ov.filter((d) => d.def).length, ov.length) : 0

    return [
      {
        title: 'Risco de Concentração',
        body: `${topProvShare.toFixed(0)}% dos postes defeituosos concentrados em ${topProvName}, predominantemente postes de ${dominantMat}. Substituição direcionada poderia reduzir a taxa em ~${reductionPotential.toFixed(1)} p.p.`,
        accent: '#dc2626',
      },
      {
        title: 'Acoplamento Material-Falha',
        body: `Madeira falha a ${woodFail.toFixed(1)}% vs ${concFail.toFixed(1)}% para betão (${ratio.toFixed(1)}× maior). Programa focado no quartil superior endereçaria ~${fmt(topQuartileN)} postes.`,
        accent: '#ea580c',
      },
      {
        title: 'Gargalos de Sobrecarga',
        body: `${fmt(ov.length)} postes carregam >8 linhas, dos quais ${ovDefPct.toFixed(0)}% já degradados. Candidatos a falha catastrófica.`,
        accent: '#ca8a04',
      },
    ]
  }, [filtered])

  const exportCsv = () => {
    const cols = ['pid', 'prov', 'state', 'mat', 'volt', 'lines', 'risk', 'x', 'y'] as const
    const head = ['ID', 'Província', 'Estado', 'Material', 'Tensão', 'Linhas', 'Risk', 'Lon', 'Lat']
    const rows = top20.map((r) =>
      cols.map((c) => `"${String(r[c] ?? '')}"`).join(',')
    )
    const csv = [head.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'top20_postes_risco.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Leaflet init — só após dados e DOM do mapa (evita init com ref null no loading)
  useEffect(() => {
    if (!allData.length || !mapContainerRef.current || mapRef.current) return
    let cancelled = false

    import('leaflet').then((mod) => {
      const L = (mod as { default?: LModule }).default ?? (mod as LModule)
      if (cancelled || !mapContainerRef.current || mapRef.current) return

      leafletRef.current = L
      const map = L.map(mapContainerRef.current, {
        center: [-18.5, 35.5],
        zoom: 6,
        zoomControl: true,
        preferCanvas: true,
      })

      tilesRef.current = {
        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }),
        topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenTopoMap',
          maxZoom: 17,
        }),
        dark: L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          { attribution: '© Esri', maxZoom: 16 }
        ),
        // maxNativeZoom: o satélite da Esri não tem imagem de alta resolução acima do zoom 17 em
        // grande parte de Moçambique; sem isto, dar zoom além do que existe mostrava quadrados
        // cinzentos "Map data not yet available" em vez de esticar o último tile real.
        sat: L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { attribution: '© Esri', maxZoom: 18, maxNativeZoom: 17 }
        ),
      }
      tilesRef.current.osm!.addTo(map)

      outLayerRef.current = L.layerGroup().addTo(map)
      heatLayerRef.current = L.layerGroup().addTo(map)
      hotspotLayerRef.current = L.layerGroup().addTo(map)
      inLayerRef.current = L.layerGroup().addTo(map)

      mapRef.current = map
      requestAnimationFrame(() => map.invalidateSize(true))
      setTimeout(() => map.invalidateSize(true), 200)
      setMapReady(true)
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      inLayerRef.current = null
      outLayerRef.current = null
      hotspotLayerRef.current = null
      heatLayerRef.current = null
      leafletRef.current = null
      setMapReady(false)
    }
  }, [allData.length])

  useEffect(() => {
    const el = mapContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      mapRef.current?.invalidateSize(true)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [allData.length])

  useEffect(() => {
    const tiles = tilesRef.current
    const map = mapRef.current
    if (!map || !tiles.osm) return
    TILE_KEYS.forEach((k) => {
      if (tiles[k] && map.hasLayer(tiles[k]!)) map.removeLayer(tiles[k]!)
    })
    const next = tiles[tileKey]
    if (next) next.addTo(map)
  }, [tileKey])

  // Markers
  useEffect(() => {
    if (!mapReady || !leafletRef.current) return
    const L = leafletRef.current
    const inLayer = inLayerRef.current
    const outLayer = outLayerRef.current
    if (!inLayer || !outLayer) return

    inLayer.clearLayers()
    outLayer.clearLayers()

    if (filterActive) {
      const visibleSet = new Set(filtered)
      allData.forEach((d) => {
        if (visibleSet.has(d)) return
        L.circleMarker([d.y, d.x], {
          radius: 2,
          fillColor: '#64748b',
          fillOpacity: 0.35,
          stroke: false,
          interactive: false,
        }).addTo(outLayer)
      })
    }

    filtered.forEach((d) => {
      const isSel = selected?.pid === d.pid
      const radius = isSel ? 9 : 3 + Math.min(d.lines / 4, 5)
      const marker = L.circleMarker([d.y, d.x], {
        radius,
        fillColor: CONDITION_COLOR[d.state] || '#999',
        fillOpacity: d.def ? 0.95 : 0.7,
        color: isSel ? ACCENT_LIGHT : '#fff',
        weight: isSel ? 3 : 0.6,
      })
      marker.bindTooltip(
        `<strong>Poste #${d.pid}</strong> · ${d.prov}<br/>${d.state} · ${d.mat} · ${d.lines} linhas`,
        { direction: 'top', offset: [0, -4] }
      )
      marker.on('click', () => setSelected(d))
      marker.addTo(inLayer)
    })
  }, [mapReady, filtered, allData, selected, filterActive])

  // Hotspots
  useEffect(() => {
    if (!mapReady || !leafletRef.current) return
    const L = leafletRef.current
    const layer = hotspotLayerRef.current
    if (!layer) return
    layer.clearLayers()
    hotspots.forEach((h, i) => {
      const rect = L.rectangle(
        [
          [h.latMin, h.lonMin],
          [h.latMax, h.lonMax],
        ],
        {
          color: '#dc2626',
          weight: 2,
          dashArray: '4 3',
          fillColor: '#dc2626',
          fillOpacity: 0.08,
        }
      )
      const avg = (h.lines.reduce((a, b) => a + b, 0) / h.lines.length).toFixed(1)
      rect.bindTooltip(
        `<strong>Hotspot #${i + 1}</strong> · ${h.poles[0]?.prov}<br/>` +
          `${h.defects} defeituosos / ${h.poles.length} totais · média ${avg} linhas<br/>` +
          `<em>Clique para filtrar</em>`,
        { direction: 'top' }
      )
      rect.on('click', () => onHotspotClick(h))
      rect.addTo(layer)
    })
  }, [mapReady, hotspots, onHotspotClick])

  // Heat
  useEffect(() => {
    if (!mapReady || !leafletRef.current) return
    const L = leafletRef.current
    const layer = heatLayerRef.current
    if (!layer) return
    layer.clearLayers()
    if (!showHeat) return

    const gx = 0.15
    const cells = new Map<string, number>()
    filtered
      .filter((d) => d.def)
      .forEach((d) => {
        const cx = Math.floor(d.x / gx) * gx
        const cy = Math.floor(d.y / gx) * gx
        const key = `${cx}:${cy}`
        cells.set(key, (cells.get(key) || 0) + 1)
      })
    const counts = Array.from(cells.values())
    const maxHeat = Math.max(1, ...counts)
    cells.forEach((count, key) => {
      const [cx, cy] = key.split(':').map(Number)
      L.circle([cy + gx / 2, cx + gx / 2], {
        radius: 4000 + (count / maxHeat) * 14000,
        stroke: false,
        fillColor: '#dc2626',
        fillOpacity: 0.12 + (count / maxHeat) * 0.35,
        interactive: false,
      }).addTo(layer)
    })
  }, [mapReady, showHeat, filtered])

  if (loadError) {
    return (
      <div className="hm-root">
        <div className="hm-error">
          Não foi possível carregar os dados: {loadError}. Verifique{' '}
          <code>{dataPath}</code>.
        </div>
      </div>
    )
  }

  if (!allData.length) {
    return (
      <div className="hm-root">
        <div className="hm-loading">A carregar dashboard de postes…</div>
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="hm-root">
        <header className="hm-header">
          <Image src="/images/logo.png" alt="" width={44} height={44} className="hm-logo" />
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </header>
        <div className="hm-error" style={{ margin: 24 }}>
          Sem dados para os filtros selecionados.
          <button
            type="button"
            className="hm-btn hm-btn--primary mt-4"
            onClick={clearAll}
          >
            Limpar todos os filtros
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="hm-root">
      <header className="hm-header">
        <Image src="/images/logo.png" alt="Portal de Dados" width={44} height={44} className="hm-logo" />
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

      <div className="pm-scroll">
        <div className="pm-analytics">
          <p className="pm-hint mb-3">
            Clique em KPIs, gráficos ou no mapa para filtrar toda a vista (cross-filter).
          </p>

          <FilterChips sel={sel} onRemove={removeChip} onClearAll={clearAll} />

          <div className="pm-kpi-grid">
            <div className="pm-kpi">
              <div className="pm-kpi-label">Postes visíveis / Visible poles</div>
              <div className="pm-kpi-value">{fmt(kpis.total)}</div>
              <div className="pm-kpi-sub">{fmt(allData.length)} no total</div>
            </div>
            <div
              className={`pm-kpi pm-kpi--clickable ${sel.flags.has('def') ? 'pm-kpi--active' : ''}`}
              onClick={() => toggleDim('flags', 'def')}
            >
              <div className="pm-kpi-label">Taxa de defeitos</div>
              <div className="pm-kpi-value" style={{ color: kpis.defectRate > 15 ? '#f87171' : undefined }}>
                {kpis.defectRate.toFixed(1)}%
              </div>
              <div className="pm-kpi-sub">{fmt(kpis.defective)} defeituosos</div>
            </div>
            <div
              className={`pm-kpi pm-kpi--clickable ${sel.flags.has('wood') ? 'pm-kpi--active' : ''}`}
              onClick={() => toggleDim('flags', 'wood')}
            >
              <div className="pm-kpi-label">Postes de madeira</div>
              <div className="pm-kpi-value">{kpis.woodPct.toFixed(0)}%</div>
              <div className="pm-kpi-sub">{fmt(kpis.wood)} postes</div>
            </div>
            <div
              className={`pm-kpi pm-kpi--clickable ${sel.flags.has('ov') ? 'pm-kpi--active' : ''}`}
              onClick={() => toggleDim('flags', 'ov')}
            >
              <div className="pm-kpi-label">Sobrecarregados (&gt;8 linhas)</div>
              <div className="pm-kpi-value">{fmt(kpis.overload)}</div>
            </div>
            <div className="pm-kpi">
              <div className="pm-kpi-label">Províncias activas</div>
              <div className="pm-kpi-value">
                {kpis.provs}/4
              </div>
            </div>
          </div>

          {narratives.length > 0 && (
            <div className="pm-narrative-grid">
              {narratives.map((n, i) => (
                <div key={i} className="pm-narrative" style={{ borderLeftColor: n.accent }}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} style={{ color: n.accent }} />
                    <span className="font-semibold text-sm">{n.title}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--hm-text)' }}>
                    {n.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="pm-panel pm-panel--map">
            <div className="pm-panel-title">
              <MapPin size={18} style={{ color: ACCENT_LIGHT }} />
              Inteligência geoespacial · {fmt(filtered.length)} postes
            </div>
            <div className="hm-controls">
              <label>
                Camada base
                <select value={tileKey} onChange={(e) => setTileKey(e.target.value as TileKey)}>
                  {TILE_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {TILE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showHeat}
                  onChange={(e) => setShowHeat(e.target.checked)}
                />
                Mapa de calor
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showHotspots}
                  onChange={(e) => setShowHotspots(e.target.checked)}
                />
                Hotspots
              </label>
            </div>

            <div className="pm-map-row">
              <div className="hm-map-wrap">
                <div ref={mapContainerRef} className="hm-map" />
                <div className="pm-map-legend">
                  <div className="font-semibold mb-1">Estado / Condition</div>
                  {Object.entries(CONDITION_COLOR).map(([k, c]) => (
                    <div key={k} className="pm-map-legend-row">
                      <span className="pm-dot" style={{ background: c }} />
                      {k}
                    </div>
                  ))}
                  <p className="text-[10px] mt-2" style={{ color: 'var(--hm-muted)' }}>
                    Tamanho do marcador = nº de linhas ligadas
                  </p>
                  {hotspots.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--hm-border)] text-[#f87171]">
                      {hotspots.length} hotspots · clique p/ filtrar
                    </div>
                  )}
                </div>
              </div>
              <aside className="pm-map-sidebar">
                {selected ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <strong>Poste #{selected.pid}</strong>
                      <button type="button" onClick={() => setSelected(null)}>
                        <X size={14} />
                      </button>
                    </div>
                    {(
                      [
                        ['Província', selected.prov, () => toggleDim('prov', selected.prov)],
                        ['Estado', selected.state, () => toggleDim('state', selected.state)],
                        ['Material', selected.mat, () => toggleDim('mat', selected.mat)],
                        [
                          'Tensão',
                          selected.volt ?? 'N/D',
                          selected.volt ? () => toggleDim('volt', selected.volt!) : undefined,
                        ],
                        ['Linhas', selected.lines, () => toggleDim('lines', selected.lines)],
                        ['Área', selected.area ?? 'N/D', undefined],
                        ['Proximidade', selected.prox ?? 'N/D', undefined],
                        ['Técnico', selected.tech ?? 'N/D', undefined],
                        [
                          'Data',
                          selected.date
                            ? selected.date.toLocaleDateString('pt-PT')
                            : 'N/D',
                          undefined,
                        ],
                        ['Risk score', selected.risk, undefined],
                        [
                          'Coordenadas',
                          `${selected.y.toFixed(4)}, ${selected.x.toFixed(4)}`,
                          undefined,
                        ],
                      ] as const
                    ).map(([k, v, click]) => (
                      <div
                        key={k}
                        className="flex justify-between py-1.5 text-sm border-b border-[var(--hm-border)]"
                      >
                        <span style={{ color: 'var(--hm-muted)' }}>{k}</span>
                        {click ? (
                          <button
                            type="button"
                            className="font-medium hover:underline"
                            style={{ color: ACCENT_LIGHT }}
                            onClick={click}
                          >
                            {v} →
                          </button>
                        ) : (
                          <span className="font-medium">{v}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : hotspots.length > 0 ? (
                  <div>
                    <div className="font-semibold mb-2 flex items-center gap-2 text-[#f87171]">
                      <AlertTriangle size={16} />
                      {hotspots.length} Hotspots Detectados
                    </div>
                    <p className="text-xs mb-2" style={{ color: 'var(--hm-muted)' }}>
                      Células ~1 km² com ≥5 defeituosos e média &gt;4 linhas. Clique no rectângulo no
                      mapa para filtrar.
                    </p>
                    {hotspots.slice(0, 8).map((h, i) => (
                      <button
                        key={i}
                        type="button"
                        className="w-full text-left rounded-lg p-2 mb-2 border border-[var(--hm-border)] hover:border-[#f87171]"
                        onClick={() => onHotspotClick(h)}
                      >
                        <div className="text-xs font-semibold">
                          Hotspot #{i + 1} · {h.poles[0]?.prov}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--hm-muted)' }}>
                          {h.defects} defeituosos / {h.poles.length} totais · média{' '}
                          {(h.lines.reduce((a, b) => a + b, 0) / h.lines.length).toFixed(1)} linhas
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--hm-muted)' }}>
                    Clique num poste no mapa para ver detalhes e filtrar por atributo.
                  </p>
                )}
              </aside>
            </div>
          </div>

          <div className="pm-chart-grid">
            <div className="pm-panel">
              <div className="pm-panel-title">
                <Activity size={16} /> Estado por província
              </div>
              <p className="pm-hint">Clique num segmento da barra para filtrar</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={condByProv} layout="vertical" stackOffset="expand">
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis type="number" tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`} stroke="#8b949e" fontSize={10} />
                  <YAxis dataKey="province" type="category" stroke="#8b949e" fontSize={10} width={110} />
                  <PmChartTooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                  <Legend wrapperStyle={{ fontSize: 10, cursor: 'pointer' }} onClick={(e) => toggleDim('state', String(e.dataKey))} />
                  <Bar
                    dataKey="Bom"
                    stackId="a"
                    fill="#16a34a"
                    style={{ cursor: 'pointer' }}
                    onClick={(d) => {
                      toggleDim('prov', d.province)
                      toggleDim('state', 'Bom')
                    }}
                    opacity={sel.state.size === 0 || sel.state.has('Bom') ? 1 : 0.3}
                  />
                  <Bar
                    dataKey="Inclinado"
                    stackId="a"
                    fill="#f59e0b"
                    style={{ cursor: 'pointer' }}
                    onClick={(d) => {
                      toggleDim('prov', d.province)
                      toggleDim('state', 'Inclinado')
                    }}
                    opacity={sel.state.size === 0 || sel.state.has('Inclinado') ? 1 : 0.3}
                  />
                  <Bar
                    dataKey="Danificado"
                    stackId="a"
                    fill="#ea580c"
                    style={{ cursor: 'pointer' }}
                    onClick={(d) => {
                      toggleDim('prov', d.province)
                      toggleDim('state', 'Danificado')
                    }}
                    opacity={sel.state.size === 0 || sel.state.has('Danificado') ? 1 : 0.3}
                  />
                  <Bar
                    dataKey="Partido"
                    stackId="a"
                    fill="#dc2626"
                    style={{ cursor: 'pointer' }}
                    onClick={(d) => {
                      toggleDim('prov', d.province)
                      toggleDim('state', 'Partido')
                    }}
                    opacity={sel.state.size === 0 || sel.state.has('Partido') ? 1 : 0.3}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pm-panel">
              <div className="pm-panel-title">
                <Layers size={16} /> Material por província
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={matByProv} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis type="number" stroke="#8b949e" fontSize={10} />
                  <YAxis dataKey="province" type="category" stroke="#8b949e" fontSize={10} width={110} />
                  <PmChartTooltip formatter={(v) => fmt(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 10, cursor: 'pointer' }} onClick={(e) => toggleDim('mat', String(e.dataKey))} />
                  <Bar
                    dataKey="Madeira"
                    stackId="b"
                    fill={MATERIAL_COLOR.Madeira}
                    style={{ cursor: 'pointer' }}
                    onClick={(d) => {
                      toggleDim('prov', d.province)
                      toggleDim('mat', 'Madeira')
                    }}
                    opacity={sel.mat.size === 0 || sel.mat.has('Madeira') ? 1 : 0.3}
                  />
                  <Bar
                    dataKey="Betão"
                    stackId="b"
                    fill={MATERIAL_COLOR['Betão']}
                    style={{ cursor: 'pointer' }}
                    onClick={(d) => {
                      toggleDim('prov', d.province)
                      toggleDim('mat', 'Betão')
                    }}
                    opacity={sel.mat.size === 0 || sel.mat.has('Betão') ? 1 : 0.3}
                  />
                  <Bar
                    dataKey="Metal"
                    stackId="b"
                    fill={MATERIAL_COLOR.Metal}
                    style={{ cursor: 'pointer' }}
                    onClick={(d) => {
                      toggleDim('prov', d.province)
                      toggleDim('mat', 'Metal')
                    }}
                    opacity={sel.mat.size === 0 || sel.mat.has('Metal') ? 1 : 0.3}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pm-panel">
              <div className="pm-panel-title">
                <Zap size={16} /> Distribuição de linhas ligadas
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={linesHist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="lines" stroke="#8b949e" fontSize={10} />
                  <YAxis stroke="#8b949e" fontSize={10} />
                  <PmChartTooltip formatter={(v) => fmt(Number(v))} />
                  <Bar
                    dataKey="count"
                    style={{ cursor: 'pointer' }}
                    onClick={(d) => toggleDim('lines', d.lines)}
                  >
                    {linesHist.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.overload ? '#dc2626' : ACCENT}
                        opacity={sel.lines.size === 0 || sel.lines.has(d.lines) ? 1 : 0.3}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pm-panel">
              <div className="pm-panel-title">Mix de tensão</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={voltMix}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    style={{ cursor: 'pointer' }}
                    onClick={(d) => toggleDim('volt', d.name)}
                  >
                    {voltMix.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        opacity={sel.volt.size === 0 || sel.volt.has(entry.name) ? 1 : 0.3}
                        stroke={sel.volt.has(entry.name) ? ACCENT_LIGHT : 'none'}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <PmChartTooltip formatter={(v) => fmt(Number(v))} />
                  <Legend
                    wrapperStyle={{ fontSize: 10, cursor: 'pointer' }}
                    onClick={(e) => toggleDim('volt', String(e.value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pm-panel">
            <div className="pm-panel-title">
              <AlertTriangle size={16} /> Matriz de padrões de falha
            </div>
            <div className="pm-duo-grid">
              <HeatmapMatrix
                data={filtered}
                sel={sel}
                onCellClick={(mat, c) => {
                  setSel((s) => ({
                    ...s,
                    mat: mat ? toggleSet(s.mat, mat) : s.mat,
                    state: c ? toggleSet(s.state, c) : s.state,
                  }))
                }}
              />
              <div>
                <p className="pm-hint">Linhas × risk score · clique no ponto para seleccionar poste</p>
                <ResponsiveContainer width="100%" height={240}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis type="number" dataKey="x" name="Linhas" stroke="#8b949e" fontSize={10} />
                    <YAxis type="number" dataKey="y" name="Risk" stroke="#8b949e" fontSize={10} />
                    <ZAxis dataKey="z" range={[20, 80]} />
                    <PmChartTooltip cursor={{ strokeDasharray: '3 3', stroke: ACCENT }} />
                    {Object.entries(scatterByProv).map(([prov, points], i) => (
                      <Scatter
                        key={prov}
                        name={prov}
                        data={points}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        fillOpacity={0.5}
                        onClick={(p) => {
                          const pole = filtered.find(
                            (d) => d.pid === p.pid && d.prov === p.prov
                          )
                          if (pole) setSelected(pole)
                        }}
                      />
                    ))}
                    <Legend
                      wrapperStyle={{ fontSize: 10, cursor: 'pointer' }}
                      onClick={(e) => toggleDim('prov', String(e.value))}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

            <div className="pm-panel">
              <div className="flex items-center justify-between mb-3">
                <div className="pm-panel-title mb-0">Top-20 postes de maior risco</div>
                <button
                  type="button"
                  className="hm-btn hm-btn--primary text-xs flex items-center gap-1"
                  onClick={exportCsv}
                >
                  <Download size={12} /> CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="pm-top-table">
                  <thead>
                    <tr>
                      {['ID', 'Província', 'Estado', 'Material', 'Linhas', 'Tensão', 'Risk', 'Coord.'].map(
                        (h) => (
                          <th key={h}>{h}</th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {top20.map((r, i) => (
                      <tr key={i} onClick={() => setSelected(r)}>
                        <td className="font-mono">{r.pid}</td>
                        <td
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleDim('prov', r.prov)
                          }}
                        >
                          {r.prov}
                        </td>
                        <td>
                          <span
                            className="px-2 py-0.5 rounded text-white text-[10px] cursor-pointer"
                            style={{ background: CONDITION_COLOR[r.state] }}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleDim('state', r.state)
                            }}
                          >
                            {r.state}
                          </span>
                        </td>
                        <td>{r.mat}</td>
                        <td className="tabular-nums">{r.lines}</td>
                        <td>{r.volt}</td>
                        <td style={{ color: '#f87171', fontWeight: 600 }}>{r.risk}</td>
                        <td style={{ color: 'var(--hm-muted)' }}>
                          {r.y.toFixed(3)}, {r.x.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          <div className="pm-row-weekly">
            <div className="pm-panel" style={{ marginBottom: 0 }}>
              <div className="pm-panel-title">
                <Users size={16} /> Progresso semanal do levantamento
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="week" stroke="#8b949e" fontSize={10} />
                  <YAxis stroke="#8b949e" fontSize={10} />
                  <PmChartTooltip formatter={(v) => fmt(Number(v))} />
                  <Line type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2} dot={{ fill: ACCENT, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="pm-panel" style={{ marginBottom: 0 }}>
              <div className="pm-panel-title">
                <CheckCircle2 size={16} /> Qualidade dos dados
              </div>
              {(() => {
                const reqFields = ['prov', 'state', 'mat', 'volt', 'lines', 'x', 'y'] as const
                const complete = filtered.filter((r) =>
                  reqFields.every(
                    (f) => r[f] !== null && r[f] !== undefined && r[f] !== ''
                  )
                ).length
                const score = pct(complete, filtered.length)
                return (
                  <>
                    <div className="text-3xl font-bold" style={{ color: score > 95 ? '#4ade80' : '#fbbf24' }}>
                      {score.toFixed(1)}%
                    </div>
                    <p className="text-xs mt-1 mb-3" style={{ color: 'var(--hm-muted)' }}>
                      {fmt(complete)} / {fmt(filtered.length)} registos completos
                    </p>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Técnicos activos</span>
                        <span className="font-medium">
                          {new Set(filtered.map((r) => r.tech).filter(Boolean)).size}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Províncias com dados</span>
                        <span className="font-medium">{kpis.provs} de 4</span>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

          <p className="text-xs text-center pt-4" style={{ color: 'var(--hm-muted)' }}>
            Data4Moz · Diagnóstico da Rede de Postes · Levantamento Jun–Out 2025
          </p>
        </div>
      </div>
    </div>
  )
}
