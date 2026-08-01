'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Globe } from 'lucide-react'
import type { GeoJSON as LeafletGeoJSON, Layer, Map, PathOptions, TileLayer } from 'leaflet'
import {
  analyzeGeoFields,
  analyzeGeometryMix,
  colorForCategoryValue,
  colorForValue,
  detectAdminFilters,
  detectCategoryField,
  detectPopulationKey,
  featureSearchText,
  featureTitle,
  formatValue,
  geometryLabelPt,
  getFeatureProperty,
  getFeatureValue,
  getGeometryKind,
  getPathStyle,
  HIGHLIGHT_STYLES,
  labelFromKey,
  normalizeGeoJSON,
  orderedFeatureProperties,
  pointRadiusFromPop,
  sanitizeBbox,
  type BaseMapKind,
  type FieldMeta,
  type GeoFeature,
} from '@/lib/geo-preview-interactive'

const TILES: Record<BaseMapKind, { url: string; attribution: string; maxZoom: number }> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  },
  topo: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, OpenStreetMap',
    maxZoom: 17,
  },
  dark: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    maxZoom: 16,
  },
  sat: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    maxZoom: 18,
  },
}

type ColorMode = 'destaque' | 'categoria' | 'atributo'
type PreviewLayout = 'overlay' | 'detail'

type MapStats =
  | {
      kind: 'numeric'
      count: number
      mean: number
      median: number
      min: number
      max: number
      label: string
      unit: string
    }
  | { kind: 'summary'; count: number; mix: ReturnType<typeof analyzeGeometryMix> }

function MapStatsSummary({
  stats,
  featureCount,
  filteredCount,
  compact = false,
}: {
  stats: MapStats
  featureCount?: number
  filteredCount: number
  compact?: boolean
}) {
  return (
    <>
      <h4 className="geo-interactive-map__stats-title">Resumo dos dados</h4>
      <div
        className={`geo-interactive-map__stats-grid${compact ? ' geo-interactive-map__stats-grid--compact' : ''}`}
      >
        {stats.kind === 'numeric' ? (
          <>
            <div className="geo-interactive-map__stat-chip">
              <span>Elementos</span>
              <strong>{stats.count}</strong>
            </div>
            <div className="geo-interactive-map__stat-chip">
              <span>Média · {stats.label}</span>
              <strong>{formatValue(stats.mean, stats.unit)}</strong>
            </div>
            <div className="geo-interactive-map__stat-chip">
              <span>Mediana</span>
              <strong>{formatValue(stats.median, stats.unit)}</strong>
            </div>
            <div className="geo-interactive-map__stat-chip">
              <span>Mínimo</span>
              <strong>{formatValue(stats.min, stats.unit)}</strong>
            </div>
            <div className="geo-interactive-map__stat-chip">
              <span>Máximo</span>
              <strong>{formatValue(stats.max, stats.unit)}</strong>
            </div>
          </>
        ) : (
          <>
            <div className="geo-interactive-map__stat-chip">
              <span>Elementos visíveis</span>
              <strong>{stats.count}</strong>
            </div>
            {stats.mix.polygon > 0 && (
              <div className="geo-interactive-map__stat-chip">
                <span>{geometryLabelPt('polygon')}</span>
                <strong>{stats.mix.polygon}</strong>
              </div>
            )}
            {stats.mix.line > 0 && (
              <div className="geo-interactive-map__stat-chip">
                <span>{geometryLabelPt('line')}</span>
                <strong>{stats.mix.line}</strong>
              </div>
            )}
            {stats.mix.point > 0 && (
              <div className="geo-interactive-map__stat-chip">
                <span>{geometryLabelPt('point')}</span>
                <strong>{stats.mix.point}</strong>
              </div>
            )}
          </>
        )}
      </div>
      {!compact && typeof featureCount === 'number' && featureCount > filteredCount && (
        <p className="geo-interactive-map__hint geo-interactive-map__hint--footer">
          Ficheiro completo: {featureCount.toLocaleString('pt-BR')} elementos · amostra com{' '}
          {filteredCount.toLocaleString('pt-BR')}
        </p>
      )}
    </>
  )
}

const MAP_MIN_ZOOM = 2
const MAP_MAX_ZOOM = 18
const FIT_MAX_ZOOM = 14

function safeFitMap(
  map: Map,
  bounds: { isValid: () => boolean; getSouthWest: () => { lat: number; lng: number }; getNorthEast: () => { lat: number; lng: number } },
  padding: [number, number] = [28, 28]
) {
  if (!bounds.isValid()) return
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  if (!Number.isFinite(sw.lat) || !Number.isFinite(ne.lat)) return
  const latSpan = Math.abs(ne.lat - sw.lat)
  const lngSpan = Math.abs(ne.lng - sw.lng)
  if (latSpan < 1e-8 && lngSpan < 1e-8) {
    map.setView([sw.lat, sw.lng], Math.min(12, FIT_MAX_ZOOM))
    return
  }
  try {
    map.fitBounds(
      [
        [sw.lat, sw.lng],
        [ne.lat, ne.lng],
      ],
      { padding, maxZoom: FIT_MAX_ZOOM }
    )
    const z = map.getZoom()
    if (!Number.isFinite(z) || z < MAP_MIN_ZOOM) map.setZoom(MAP_MIN_ZOOM)
    if (z > MAP_MAX_ZOOM) map.setZoom(MAP_MAX_ZOOM)
  } catch {
    map.setView([-18.5, 35], 6)
  }
}

function FeatureDetailCard({
  feature,
  categoryField,
  varMeta,
  colorMode,
  onClose,
  floating = false,
}: {
  feature: GeoFeature
  categoryField?: FieldMeta
  varMeta?: FieldMeta
  colorMode: ColorMode
  onClose: () => void
  /** Painel flutuante no mapa (sem botão largo em baixo) */
  floating?: boolean
}) {
  const rows = orderedFeatureProperties(feature, floating ? 8 : 16)
  const catVal = categoryField ? getFeatureProperty(feature, categoryField.key) : ''
  const catColor = catVal ? colorForCategoryValue(catVal) : null

  return (
    <aside
      className={`geo-interactive-map__panel geo-interactive-map__panel--info${floating ? ' geo-interactive-map__panel--info-float' : ''}`}
    >
      <div className="geo-interactive-map__info-head">
        <h3>{featureTitle(feature)}</h3>
        <button type="button" className="geo-interactive-map__info-dismiss" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </div>
      <div className="geo-interactive-map__info-body">
        {colorMode === 'categoria' && categoryField && catVal && (
          <div className="geo-interactive-map__info-highlight" style={{ borderColor: catColor || undefined }}>
            <span className="geo-interactive-map__info-chip" style={{ background: catColor || '#064E2C' }} />
            <div>
              <span>{categoryField.label}</span>
              <strong>{catVal}</strong>
            </div>
          </div>
        )}
        {colorMode === 'atributo' && varMeta && (
          <div className="geo-interactive-map__info-highlight">
            <span>{varMeta.label}</span>
            <strong>{formatValue(getFeatureValue(feature, varMeta.key), varMeta.unit)}</strong>
          </div>
        )}
        <dl className="geo-interactive-map__info-dl">
          {rows.map(([k, v]) => (
            <div key={k} className="geo-interactive-map__info-row">
              <dt>{labelFromKey(k)}</dt>
              <dd>{formatValue(v)}</dd>
            </div>
          ))}
        </dl>
      </div>
      {!floating && (
        <button type="button" className="geo-interactive-map__close" onClick={onClose}>
          Fechar detalhes
        </button>
      )}
    </aside>
  )
}

export function InteractiveGeoMapPreview({
  geojson,
  bbox,
  featureCount,
  className,
  compact = false,
  mapOnly = false,
  previewLayout = 'overlay',
  splitDetailCards = false,
}: {
  geojson: unknown
  bbox?: [number, number, number, number] | null
  featureCount?: number
  className?: string
  /** Painel lateral do catálogo: menos painéis flutuantes, controlos compactos */
  compact?: boolean
  /** Catálogo: só o mapa (sem barra de filtros do mapa) */
  mapOnly?: boolean
  /** Página de detalhe: resumo abaixo do mapa, sem card sobre os filtros */
  previewLayout?: PreviewLayout
  /** Página de detalhe: três cards (mapa, resumo, elemento) */
  splitDetailCards?: boolean
}) {
  const mapElRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const tileRef = useRef<TileLayer | null>(null)
  const layerRef = useRef<LeafletGeoJSON | null>(null)
  const safeBbox = useMemo(() => sanitizeBbox(bbox ?? null), [bbox])
  const features = useMemo(() => normalizeGeoJSON(geojson), [geojson])
  const dataSignature = useMemo(
    () => `${features.length}:${features[0]?.properties ? Object.keys(features[0].properties).join(',') : ''}`,
    [features]
  )
  const hasMapData = features.length > 0
  const fields = useMemo(() => analyzeGeoFields(features), [features])
  const geometryMix = useMemo(() => analyzeGeometryMix(features), [features])

  const numericFields = useMemo(() => fields.filter((f) => f.kind === 'numeric'), [fields])
  const adminFilters = useMemo(() => detectAdminFilters(fields), [fields])
  const categoryField = useMemo(() => detectCategoryField(fields), [fields])
  const popKey = useMemo(() => detectPopulationKey(fields), [fields])

  const [colorMode, setColorMode] = useState<ColorMode>('destaque')
  const [numericVar, setNumericVar] = useState('')
  const [provFilter, setProvFilter] = useState('all')
  const [distFilter, setDistFilter] = useState('all')
  const [postoFilter, setPostoFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [sizeByPop, setSizeByPop] = useState(true)
  const [baseMap, setBaseMap] = useState<BaseMapKind>('osm')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<GeoFeature | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    setSelected(null)
    setProvFilter('all')
    setDistFilter('all')
    setPostoFilter('all')
    setCatFilter('all')
    setSearch('')
    if (numericFields.length > 0) {
      setNumericVar(numericFields[0].key)
      setColorMode('atributo')
    } else if (categoryField) {
      setColorMode('categoria')
    } else {
      setColorMode('destaque')
    }
  }, [dataSignature, numericFields.length, categoryField?.key])

  useEffect(() => {
    if (!numericVar && numericFields[0]) setNumericVar(numericFields[0].key)
  }, [numericFields, numericVar])

  const varMeta = useMemo(
    () => numericFields.find((f) => f.key === numericVar) || numericFields[0],
    [numericFields, numericVar]
  )

  const categoryLegend = useMemo(() => {
    if (!categoryField?.categories) return []
    const cats = categoryField.categories.slice(0, 12)
    return cats.map((c) => ({ label: c, color: colorForCategoryValue(c) }))
  }, [categoryField])

  const distritoOptions = useMemo(() => {
    const field = adminFilters.distrito
    if (!field) return [] as string[]
    let list = features
    if (adminFilters.provincia && provFilter !== 'all') {
      list = list.filter((f) => getFeatureProperty(f, adminFilters.provincia!.key) === provFilter)
    }
    const set = new Set<string>()
    for (const f of list) {
      const v = getFeatureProperty(f, field.key)
      if (v) set.add(v)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [features, adminFilters, provFilter])

  const postoOptions = useMemo(() => {
    const field = adminFilters.posto
    if (!field) return [] as string[]
    let list = features
    if (adminFilters.provincia && provFilter !== 'all') {
      list = list.filter((f) => getFeatureProperty(f, adminFilters.provincia!.key) === provFilter)
    }
    if (adminFilters.distrito && distFilter !== 'all') {
      list = list.filter((f) => getFeatureProperty(f, adminFilters.distrito!.key) === distFilter)
    }
    const set = new Set<string>()
    for (const f of list) {
      const v = getFeatureProperty(f, field.key)
      if (v) set.add(v)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [features, adminFilters, provFilter, distFilter])

  const filteredFeatures = useMemo(() => {
    let list = features
    if (adminFilters.provincia && provFilter !== 'all') {
      list = list.filter((f) => getFeatureProperty(f, adminFilters.provincia!.key) === provFilter)
    }
    if (adminFilters.distrito && distFilter !== 'all') {
      list = list.filter((f) => getFeatureProperty(f, adminFilters.distrito!.key) === distFilter)
    }
    if (adminFilters.posto && postoFilter !== 'all') {
      list = list.filter((f) => getFeatureProperty(f, adminFilters.posto!.key) === postoFilter)
    }
    if (categoryField && catFilter !== 'all') {
      list = list.filter((f) => getFeatureProperty(f, categoryField.key) === catFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((f) => featureSearchText(f).includes(q))
    return list
  }, [features, adminFilters, provFilter, distFilter, postoFilter, catFilter, categoryField, search])

  const stats = useMemo(() => {
    if (colorMode === 'atributo' && varMeta) {
      const vals = filteredFeatures
        .map((f) => getFeatureValue(f, varMeta.key))
        .filter((v): v is number => v !== null)
      if (!vals.length) return null
      const sorted = [...vals].sort((a, b) => a - b)
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length
      return {
        kind: 'numeric' as const,
        count: vals.length,
        mean,
        median: sorted[Math.floor(sorted.length / 2)],
        min: sorted[0],
        max: sorted[sorted.length - 1],
        label: varMeta.label,
        unit: varMeta.unit,
      }
    }
    return {
      kind: 'summary' as const,
      count: filteredFeatures.length,
      mix: analyzeGeometryMix(filteredFeatures),
    }
  }, [filteredFeatures, varMeta, colorMode])

  const legendSteps = useMemo(() => {
    if (colorMode !== 'atributo' || !varMeta) return []
    return [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      t,
      value: varMeta.min + (varMeta.max - varMeta.min) * t,
      color: colorForValue(varMeta.min + (varMeta.max - varMeta.min) * t, varMeta),
    }))
  }, [varMeta, colorMode])

  const featureFillColor = useCallback(
    (feature: GeoFeature) => {
      if (colorMode === 'atributo' && varMeta) {
        return colorForValue(getFeatureValue(feature, varMeta.key), varMeta)
      }
      if (colorMode === 'categoria' && categoryField) {
        return colorForCategoryValue(getFeatureProperty(feature, categoryField.key))
      }
      return null
    },
    [colorMode, varMeta, categoryField]
  )

  const styleForFeature = useCallback(
    (feature: GeoFeature) => {
      const gk = getGeometryKind(feature)
      const dataColor = featureFillColor(feature)
      return getPathStyle(baseMap, gk, {
        choroplethColor: colorMode === 'atributo' ? dataColor : null,
        categoryColor: colorMode === 'categoria' ? dataColor : null,
        highlight: colorMode === 'destaque',
      }) as PathOptions
    },
    [baseMap, colorMode, featureFillColor]
  )

  const buildPopupHtml = useCallback(
    (feature: GeoFeature) => {
      const title = featureTitle(feature)
      const rows = orderedFeatureProperties(feature, 6)
        .map(
          ([k, v]) =>
            `<div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;margin:3px 0;line-height:1.35">
              <span style="color:#4a5a52;flex-shrink:0">${labelFromKey(k)}</span>
              <span style="color:#0b1b14;font-weight:600;text-align:right;word-break:break-word">${formatValue(v)}</span>
            </div>`
        )
        .join('')

      const catVal =
        colorMode === 'categoria' && categoryField
          ? getFeatureProperty(feature, categoryField.key)
          : ''
      const catColor = catVal ? colorForCategoryValue(catVal) : '#064E2C'
      const numVal =
        colorMode === 'atributo' && varMeta ? getFeatureValue(feature, varMeta.key) : null

      return `<div style="font-family:var(--pd-font-sans);font-size:12px;min-width:200px;max-width:280px">
        <div style="background:#064e2c;color:#fff;font-weight:700;padding:8px 10px;margin:-1px -1px 8px;border-radius:8px 8px 0 0">${title}</div>
        ${
          colorMode === 'categoria' && categoryField && catVal
            ? `<div style="display:flex;align-items:center;gap:8px;background:#eef2f0;padding:8px;border-radius:8px;margin-bottom:8px">
                <span style="width:12px;height:12px;border-radius:50%;background:${catColor};flex-shrink:0"></span>
                <div>
                  <div style="font-size:10px;color:#4a5a52">${categoryField.label}</div>
                  <div style="font-size:14px;font-weight:700;color:#064e2c">${catVal}</div>
                </div>
              </div>`
            : ''
        }
        ${
          colorMode === 'atributo' && varMeta
            ? `<div style="background:#eef2f0;padding:8px;border-radius:8px;margin-bottom:8px">
                <div style="font-size:10px;color:#4a5a52">${varMeta.label}</div>
                <div style="font-size:16px;font-weight:700;color:#064e2c">${formatValue(numVal, varMeta.unit)}</div>
              </div>`
            : ''
        }
        ${rows}
      </div>`
    },
    [varMeta, colorMode, categoryField]
  )

  const attachLayer = useCallback(() => {
    if (!mapRef.current || !mapReady || !hasMapData) return

    import('leaflet').then((L) => {
      if (!mapRef.current) return

      if (layerRef.current) {
        layerRef.current.remove()
        layerRef.current = null
      }

      const hs = HIGHLIGHT_STYLES[baseMap]
      const collection = { type: 'FeatureCollection' as const, features: filteredFeatures }

      const geoLayer = L.geoJSON(collection, {
        style: (feature) => styleForFeature(feature as GeoFeature),
        pointToLayer: (feature, latlng) => {
          const gf = feature as GeoFeature
          const fill = featureFillColor(gf) || hs.fill
          const pop = popKey ? getFeatureValue(gf, popKey) : null
          const strokeColor =
            colorMode !== 'destaque' && fill !== hs.fill
              ? fill
              : baseMap === 'sat'
                ? '#ffffff'
                : hs.stroke
          return L.circleMarker(latlng, {
            radius: pointRadiusFromPop(pop, !sizeByPop),
            color: strokeColor,
            weight: colorMode === 'destaque' ? 2 : 2.5,
            fillColor: fill,
            fillOpacity: colorMode === 'destaque' ? 0.82 : 0.88,
          })
        },
        onEachFeature: (feature, layer: Layer) => {
          const gf = feature as GeoFeature
          if (previewLayout !== 'detail') {
            layer.bindPopup(buildPopupHtml(gf), { maxWidth: 300 })
          }
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e)
            if (!mapOnly) setSelected(gf)
          })
          layer.on('mouseover', () => {
            if ('setStyle' in layer && typeof layer.setStyle === 'function') {
              const gk = getGeometryKind(gf)
              const hoverFill = featureFillColor(gf) || '#D4A017'
              if (gk === 'line') {
                layer.setStyle({ weight: 4.5, color: '#D4A017', opacity: 1 })
              } else if (gk === 'point') {
                layer.setStyle({ weight: 3, color: '#D4A017', fillColor: hoverFill, fillOpacity: 0.95 })
              } else {
                layer.setStyle({ weight: 3.5, color: '#D4A017', fillColor: hoverFill, fillOpacity: 0.62 })
              }
            }
          })
          layer.on('mouseout', () => {
            if ('setStyle' in layer && typeof layer.setStyle === 'function') {
              layer.setStyle(styleForFeature(gf))
            }
          })
        },
      })

      geoLayer.addTo(mapRef.current)
      layerRef.current = geoLayer

      if (filteredFeatures.length > 0 && mapRef.current) {
        try {
          const bounds = geoLayer.getBounds()
          safeFitMap(mapRef.current, bounds)
        } catch {
          /* ignore */
        }
      } else if (safeBbox && mapRef.current) {
        safeFitMap(mapRef.current, {
          isValid: () => true,
          getSouthWest: () => ({ lat: safeBbox[1], lng: safeBbox[0] }),
          getNorthEast: () => ({ lat: safeBbox[3], lng: safeBbox[2] }),
        })
      }
    })
  }, [
    filteredFeatures,
    styleForFeature,
    featureFillColor,
    popKey,
    sizeByPop,
    buildPopupHtml,
    safeBbox,
    mapReady,
    baseMap,
    colorMode,
    hasMapData,
    mapOnly,
    previewLayout,
  ])

  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current || !mapElRef.current) return
    let cancelled = false

    import('leaflet').then((L) => {
      if (cancelled || !mapElRef.current || mapRef.current) return

      // @ts-expect-error Leaflet private API
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapElRef.current, {
        scrollWheelZoom: true,
        zoomControl: false,
        attributionControl: true,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
      })

      if (safeBbox) {
        safeFitMap(map, {
          isValid: () => true,
          getSouthWest: () => ({ lat: safeBbox[1], lng: safeBbox[0] }),
          getNorthEast: () => ({ lat: safeBbox[3], lng: safeBbox[2] }),
        })
      } else {
        map.setView([-18.5, 35], 6)
      }

      tileRef.current = L.tileLayer(TILES.osm.url, {
        attribution: TILES.osm.attribution,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: TILES.osm.maxZoom,
      }).addTo(map)

      mapRef.current = map
      setMapReady(true)
      map.on('click', (ev: { originalEvent?: { target?: EventTarget | null } }) => {
        const t = ev.originalEvent?.target
        if (t instanceof Element && t.closest('.geo-interactive-map__controls')) return
        setSelected(null)
      })
      requestAnimationFrame(() => map.invalidateSize())
    })

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        tileRef.current = null
        layerRef.current = null
        setMapReady(false)
      }
    }
  }, [safeBbox]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapElRef.current || !mapReady) return
    const ro = new ResizeObserver(() => {
      mapRef.current?.invalidateSize({ pan: false })
    })
    ro.observe(mapElRef.current)
    return () => ro.disconnect()
  }, [mapReady])

  useEffect(() => {
    attachLayer()
  }, [attachLayer])

  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    import('leaflet').then((L) => {
      const map = mapRef.current
      if (!map) return
      if (tileRef.current) map.removeLayer(tileRef.current)
      const cfg = TILES[baseMap]
      const layerMax = Math.min(cfg.maxZoom, MAP_MAX_ZOOM)
      tileRef.current = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: layerMax,
      }).addTo(map)
      const z = map.getZoom()
      if (Number.isFinite(z) && z > layerMax) map.setZoom(layerMax)
      requestAnimationFrame(() => map.invalidateSize({ pan: false }))
    })
  }, [baseMap, mapReady])

  const zoomIn = () => {
    const map = mapRef.current
    if (!map) return
    const cfg = TILES[baseMap]
    const max = Math.min(cfg.maxZoom, MAP_MAX_ZOOM)
    map.zoomIn()
    if (map.getZoom() > max) map.setZoom(max)
  }

  const zoomOut = () => {
    mapRef.current?.zoomOut()
  }

  const isDetailLayout = previewLayout === 'detail'
  const useSplitCards = splitDetailCards && isDetailLayout

  const rootClass = [
    className?.trim() || 'geo-interactive-map',
    compact ? 'geo-interactive-map--compact' : '',
    mapOnly ? 'geo-interactive-map--map-only' : '',
    isDetailLayout ? 'geo-interactive-map--detail' : '',
    useSplitCards ? 'geo-interactive-map--detail-split' : '',
    isDetailLayout && selected ? 'geo-interactive-map--has-selection' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const controlsBar = !mapOnly && (
    <div
      className="geo-interactive-map__controls"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <label className="geo-interactive-map__ctrl geo-interactive-map__ctrl--primary">
        <span className="geo-interactive-map__ctrl-label">Alterar Visualização</span>
        <select
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value as ColorMode)}
          className="geo-interactive-map__select geo-interactive-map__select--primary"
        >
          <option value="atributo" disabled={numericFields.length === 0}>
            Gradiente numérico
          </option>
          <option value="destaque">Destaque (polígonos/linhas)</option>
          {categoryField && (
            <option value="categoria">Cores por {categoryField.label.toLowerCase()}</option>
          )}
        </select>
      </label>

      {colorMode === 'atributo' && numericFields.length > 0 && (
        <label className="geo-interactive-map__ctrl">
          <span className="geo-interactive-map__ctrl-label">Atributo numérico</span>
          <select
            value={numericVar}
            onChange={(e) => setNumericVar(e.target.value)}
            className="geo-interactive-map__select"
          >
            {numericFields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {categoryField && colorMode === 'categoria' && categoryField.categories && (
        <label className="geo-interactive-map__ctrl">
          <span className="geo-interactive-map__ctrl-label">{categoryField.label}</span>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="geo-interactive-map__select"
          >
            <option value="all">Todos os tipos</option>
            {categoryField.categories.map((c) => (
              <option key={c} value={c}>
                {formatValue(c)}
              </option>
            ))}
          </select>
        </label>
      )}

      {adminFilters.provincia?.categories && (
        <label className="geo-interactive-map__ctrl">
          <span className="geo-interactive-map__ctrl-label">Província</span>
          <select
            value={provFilter}
            onChange={(e) => {
              setProvFilter(e.target.value)
              setDistFilter('all')
              setPostoFilter('all')
            }}
            className="geo-interactive-map__select"
          >
            <option value="all">Todas as províncias</option>
            {adminFilters.provincia.categories.map((p) => (
              <option key={p} value={p}>
                {formatValue(p)}
              </option>
            ))}
          </select>
        </label>
      )}

      {adminFilters.distrito &&
        (distritoOptions.length > 0 || (adminFilters.distrito.categories?.length ?? 0) > 0) && (
          <label className="geo-interactive-map__ctrl">
            <span className="geo-interactive-map__ctrl-label">Distrito</span>
            <select
              value={distFilter}
              onChange={(e) => {
                setDistFilter(e.target.value)
                setPostoFilter('all')
              }}
              className="geo-interactive-map__select"
            >
              <option value="all">Todos os distritos</option>
              {(distritoOptions.length > 0
                ? distritoOptions
                : adminFilters.distrito.categories || []
              ).map((d) => (
                <option key={d} value={d}>
                  {formatValue(d)}
                </option>
              ))}
            </select>
          </label>
        )}

      {adminFilters.posto &&
        (postoOptions.length > 0 || (adminFilters.posto.categories?.length ?? 0) > 0) && (
          <label className="geo-interactive-map__ctrl">
            <span className="geo-interactive-map__ctrl-label">Posto administrativo</span>
            <select
              value={postoFilter}
              onChange={(e) => setPostoFilter(e.target.value)}
              className="geo-interactive-map__select"
            >
              <option value="all">Todos</option>
              {(postoOptions.length > 0 ? postoOptions : adminFilters.posto.categories || []).map(
                (p) => (
                  <option key={p} value={p}>
                    {formatValue(p)}
                  </option>
                )
              )}
            </select>
          </label>
        )}

      {popKey && geometryMix.point > 0 && (
        <label className="geo-interactive-map__ctrl">
          <span className="geo-interactive-map__ctrl-label">Tamanho dos pontos</span>
          <select
            value={sizeByPop ? 'pop' : 'equal'}
            onChange={(e) => setSizeByPop(e.target.value === 'pop')}
            className="geo-interactive-map__select"
          >
            <option value="pop">Proporcional à população</option>
            <option value="equal">Tamanho uniforme</option>
          </select>
        </label>
      )}

      <label className="geo-interactive-map__ctrl">
        <span className="geo-interactive-map__ctrl-label">Mapa base</span>
        <select
          value={baseMap}
          onChange={(e) => setBaseMap(e.target.value as BaseMapKind)}
          className="geo-interactive-map__select"
        >
          <option value="osm">Mapa padrão</option>
          <option value="topo">Topográfico</option>
          <option value="dark">Escuro</option>
          <option value="sat">Satélite</option>
        </select>
      </label>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Pesquisar no mapa…"
        className="geo-interactive-map__search"
        aria-label="Pesquisar no mapa"
      />
    </div>
  )

  const mapBody = (
    <div className="geo-interactive-map__body">
      <div ref={mapElRef} className="geo-interactive-map__canvas" />
      {mapReady && hasMapData && (
        <div className="geo-interactive-map__zoom" aria-label="Controlos de zoom">
          <button type="button" onClick={zoomIn} title="Aumentar zoom" aria-label="Aumentar zoom">
            +
          </button>
          <button type="button" onClick={zoomOut} title="Diminuir zoom" aria-label="Diminuir zoom">
            −
          </button>
        </div>
      )}
      {!hasMapData && (
        <div className="geo-interactive-map__empty">
          <p>Sem geometrias válidas para mostrar no mapa (coordenadas fora de WGS84 ou dados vazios).</p>
        </div>
      )}

      {stats && !compact && !mapOnly && (
        <aside className="geo-interactive-map__panel geo-interactive-map__panel--stats">
          <MapStatsSummary
            stats={stats}
            featureCount={featureCount}
            filteredCount={filteredFeatures.length}
            compact={isDetailLayout}
          />
        </aside>
      )}

      {colorMode === 'categoria' && categoryLegend.length > 0 && !mapOnly && (
        <aside className="geo-interactive-map__panel geo-interactive-map__panel--legend">
          <h4>{categoryField?.label || 'Categorias'}</h4>
          {categoryLegend.map((item) => (
            <div key={item.label} className="geo-interactive-map__legend-row">
              <span className="geo-interactive-map__legend-dot" style={{ background: item.color }} />
              <span title={item.label}>{item.label}</span>
            </div>
          ))}
        </aside>
      )}

      {colorMode === 'atributo' && varMeta && legendSteps.length > 0 && (
        <aside className="geo-interactive-map__panel geo-interactive-map__panel--legend">
          <h4>{varMeta.label}</h4>
          {legendSteps.map((step) => (
            <div key={step.t} className="geo-interactive-map__legend-row">
              <span className="geo-interactive-map__legend-dot" style={{ background: step.color }} />
              <span>{formatValue(step.value, varMeta.unit)}</span>
            </div>
          ))}
          <div className="geo-interactive-map__legend-row geo-interactive-map__legend-muted">
            <span className="geo-interactive-map__legend-dot" style={{ background: '#94a3b8' }} />
            <span>Sem valor</span>
          </div>
        </aside>
      )}

      {colorMode === 'destaque' && !mapOnly && (
        <aside className="geo-interactive-map__panel geo-interactive-map__panel--legend">
          <h4>Destaque</h4>
          <div className="geo-interactive-map__legend-row">
            <span
              className="geo-interactive-map__legend-dot"
              style={{ background: HIGHLIGHT_STYLES[baseMap].fill }}
            />
            <span>Dados geoespaciais</span>
          </div>
          <p className="geo-interactive-map__hint">
            {geometryMix.line > 0 && geometryMix.polygon === 0
              ? 'Linhas e contornos em verde visível sobre o mapa.'
              : 'Polígonos e áreas realçados em verde sobre o mapa base.'}
          </p>
        </aside>
      )}

      {selected && !compact && !mapOnly && (
        <FeatureDetailCard
          feature={selected}
          categoryField={categoryField}
          varMeta={varMeta}
          colorMode={colorMode}
          onClose={() => setSelected(null)}
          floating={isDetailLayout}
        />
      )}
    </div>
  )

  const mapCore = (
    <div className={rootClass}>
      {controlsBar}
      {mapBody}
    </div>
  )

  if (useSplitCards) {
    return (
      <div className="geo-detail-preview-card">
        <div className="geo-detail-preview-card-header">
          <Globe className="size-4" aria-hidden />
          <span>Pré-visualização no mapa</span>
        </div>
        <div className="geo-detail-preview-card-body">{mapCore}</div>
      </div>
    )
  }

  return mapCore
}

export default InteractiveGeoMapPreview
