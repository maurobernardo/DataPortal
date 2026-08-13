import { readFile } from 'fs/promises'
import path from 'path'
import type { MapKind } from './maps-catalog'

/**
 * Prévia real dos mapas em /maps (hero + grid do catálogo): antes disto, os cards mostravam um
 * ícone decorativo genérico (o mesmo em todos) em vez de qualquer coisa ligada ao dataset real.
 * Cada função aqui projecta coordenadas REAIS do próprio dataset publicado para um viewBox
 * 0-100/0-80, coloridas por uma categoria/valor real desse mesmo dataset — nunca uma ilustração
 * à parte.
 */
export type PontoPreviewMapa = { x: number; y: number; corIndice: number }
export type LegendaPreview = { cor: string; rotulo: string }
export type PreviewMapa = { pontos: PontoPreviewMapa[]; legenda: LegendaPreview[]; rotuloCamada: string }

/** Escala monocromática verde (institucional): mais claro = valor mais alto, mais escuro = mais
 *  baixo — a mesma linguagem visual em qualquer dataset, para não introduzir cores novas por mapa. */
const ESCALA_VERDE = ['#1F4A32', '#2F6B47', '#4FAE75', '#A8F0C6']

/** Nas miniaturas pequenas do grid do catálogo (não no hero, maior), milhares de pontos SVG
 *  pesam no HTML sem acrescentar nada visível a essa escala — amostra-se uniformemente em vez de
 *  cortar as últimas N linhas, para a amostra continuar espacialmente representativa. */
const MAX_PONTOS_MINIATURA = 300

function amostrar<T>(itens: T[], maximo: number): T[] {
  if (itens.length <= maximo) return itens
  const passo = itens.length / maximo
  const amostrados: T[] = []
  for (let i = 0; i < maximo; i++) amostrados.push(itens[Math.floor(i * passo)])
  return amostrados
}

function projectar(lon: number, lat: number, bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number }) {
  const spanLon = bbox.maxLon - bbox.minLon || 1
  const spanLat = bbox.maxLat - bbox.minLat || 1
  // SVG y cresce para baixo, latitude cresce para norte: inverte-se ao projectar.
  const x = ((lon - bbox.minLon) / spanLon) * 100
  const y = (1 - (lat - bbox.minLat) / spanLat) * 80
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
}

function bboxDe(coords: [number, number][]) {
  const lons = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  return { minLon: Math.min(...lons), maxLon: Math.max(...lons), minLat: Math.min(...lats), maxLat: Math.max(...lats) }
}

let cacheSaude: PreviewMapa | null = null

/** 204 postos ADM3 reais (health-adm3.geojson), coloridos por tercis do HSSI real. */
export async function obterPreviewSaude(): Promise<PreviewMapa | null> {
  if (cacheSaude) return cacheSaude
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'health-adm3.geojson')
    const raw = await readFile(filePath, 'utf-8')
    const gj = JSON.parse(raw) as { features: { geometry: { coordinates: [number, number] }; properties: Record<string, unknown> }[] }
    const feats = gj.features
    if (!Array.isArray(feats) || feats.length === 0) return null

    const coords = feats.map((f) => f.geometry.coordinates)
    const hssi = feats.map((f) => Number(f.properties?.HSSI) || 0)
    const bbox = bboxDe(coords)

    const ordenados = [...hssi].sort((a, b) => a - b)
    const q1 = ordenados[Math.floor(ordenados.length / 3)]
    const q2 = ordenados[Math.floor((ordenados.length * 2) / 3)]

    const pontos: PontoPreviewMapa[] = coords.map(([lon, lat], i) => {
      const v = hssi[i]
      const corIndice = v <= q1 ? 0 : v <= q2 ? 2 : 3
      return { ...projectar(lon, lat, bbox), corIndice }
    })

    cacheSaude = {
      pontos,
      rotuloCamada: 'HSSI por posto administrativo',
      legenda: [
        { cor: ESCALA_VERDE[0], rotulo: 'Baixo' },
        { cor: ESCALA_VERDE[2], rotulo: 'Médio' },
        { cor: ESCALA_VERDE[3], rotulo: 'Alto' },
      ],
    }
    return cacheSaude
  } catch {
    return null
  }
}

let cacheMalaria: PreviewMapa | null = null

/** 11 províncias reais (malaria-provinces.json), coloridas pela categoria de risco real (IIM 2018). */
export async function obterPreviewMalaria(): Promise<PreviewMapa | null> {
  if (cacheMalaria) return cacheMalaria
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'malaria-provinces.json')
    const raw = await readFile(filePath, 'utf-8')
    const data = JSON.parse(raw) as {
      provinces: { lat: number; lon: number; risk_2018: string }[]
    }
    const provincias = data.provinces
    if (!Array.isArray(provincias) || provincias.length === 0) return null

    const coords: [number, number][] = provincias.map((p) => [p.lon, p.lat])
    const bbox = bboxDe(coords)

    const ORDEM_RISCO: Record<string, number> = { Low: 0, Moderate: 1, High: 2, 'Very high': 3 }

    const pontos: PontoPreviewMapa[] = provincias.map((p) => {
      const corIndice = ORDEM_RISCO[p.risk_2018] ?? 1
      return { ...projectar(p.lon, p.lat, bbox), corIndice }
    })

    cacheMalaria = {
      pontos,
      rotuloCamada: 'Risco de malária por província (IIM 2018)',
      legenda: [
        { cor: ESCALA_VERDE[0], rotulo: 'Baixo' },
        { cor: ESCALA_VERDE[1], rotulo: 'Moderado' },
        { cor: ESCALA_VERDE[2], rotulo: 'Alto' },
        { cor: ESCALA_VERDE[3], rotulo: 'Muito alto' },
      ],
    }
    return cacheMalaria
  } catch {
    return null
  }
}

let cachePostes: PreviewMapa | null = null

/** 3 911 postes reais (poles-network.json), amostrados e coloridos pelo estado real do poste. */
export async function obterPreviewPostes(): Promise<PreviewMapa | null> {
  if (cachePostes) return cachePostes
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'poles-network.json')
    const raw = await readFile(filePath, 'utf-8')
    const data = JSON.parse(raw) as { sts: string[]; rows: (number | string)[][] }
    const linhas = data.rows
    if (!Array.isArray(linhas) || linhas.length === 0) return null

    // Formato de cada linha: [provIdx, stIdx, ...outros índices..., dataISO, lon, lat] — índices
    // confirmados a partir de uma amostra real do ficheiro, não documentados no schema.
    const amostradas = amostrar(linhas, MAX_PONTOS_MINIATURA)
    const coords: [number, number][] = amostradas.map((r) => [Number(r[10]), Number(r[11])])
    const bbox = bboxDe(coords)

    // "sts" já vem ordenado por severidade real (Bom < Inclinado < Danificado < Partido); usa-se
    // o próprio índice como nível de cor em vez de recodificar a ordem à mão.
    const pontos: PontoPreviewMapa[] = amostradas.map((r, i) => {
      const stIdx = Number(r[1])
      const corIndice = Math.max(0, Math.min(3, stIdx))
      return { ...projectar(coords[i][0], coords[i][1], bbox), corIndice }
    })

    cachePostes = {
      pontos,
      rotuloCamada: 'Estado do poste (amostra)',
      legenda: (data.sts || ['Bom', 'Inclinado', 'Danificado', 'Partido']).slice(0, 4).map((rotulo, i) => ({
        cor: ESCALA_VERDE[i] ?? ESCALA_VERDE[3],
        rotulo,
      })),
    }
    return cachePostes
  } catch {
    return null
  }
}

let cacheFeeder: PreviewMapa | null = null

/** 25 alimentadores reais (feeder-pulse.json), coloridos pelo nível de risco ciclónico real. */
export async function obterPreviewFeeder(): Promise<PreviewMapa | null> {
  if (cacheFeeder) return cacheFeeder
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'feeder-pulse.json')
    const raw = await readFile(filePath, 'utf-8')
    const data = JSON.parse(raw) as { feeders: { lat: number; lon: number; risk_tier: string }[] }
    const feeders = data.feeders
    if (!Array.isArray(feeders) || feeders.length === 0) return null

    const coords: [number, number][] = feeders.map((f) => [f.lon, f.lat])
    const bbox = bboxDe(coords)

    const ORDEM_RISCO: Record<string, number> = { Low: 0, Moderate: 1, High: 2, Extreme: 3 }

    const pontos: PontoPreviewMapa[] = feeders.map((f) => {
      const corIndice = ORDEM_RISCO[f.risk_tier] ?? 1
      return { ...projectar(f.lon, f.lat, bbox), corIndice }
    })

    cacheFeeder = {
      pontos,
      rotuloCamada: 'Risco ciclónico por alimentador',
      legenda: [
        { cor: ESCALA_VERDE[0], rotulo: 'Baixo' },
        { cor: ESCALA_VERDE[1], rotulo: 'Moderado' },
        { cor: ESCALA_VERDE[2], rotulo: 'Alto' },
        { cor: ESCALA_VERDE[3], rotulo: 'Extremo' },
      ],
    }
    return cacheFeeder
  } catch {
    return null
  }
}

let cacheCereais: PreviewMapa | null = null

/** 10 províncias reais (cereal-production.json), coloridas por quartil da produção total real de
 *  cereais em 2023 (soma de milho, arroz, sorgo e milheto a partir do IAI 2023). */
export async function obterPreviewCereais(): Promise<PreviewMapa | null> {
  if (cacheCereais) return cacheCereais
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'cereal-production.json')
    const raw = await readFile(filePath, 'utf-8')
    const data = JSON.parse(raw) as {
      provinces: { province: string; lat: number; lon: number; total2023: number }[]
    }
    const provincias = data.provinces
    if (!Array.isArray(provincias) || provincias.length === 0) return null

    const coords: [number, number][] = provincias.map((p) => [p.lon, p.lat])
    const bbox = bboxDe(coords)

    const ordenados = [...provincias].map((p) => p.total2023).sort((a, b) => a - b)
    const q1 = ordenados[Math.floor(ordenados.length / 4)]
    const q2 = ordenados[Math.floor((ordenados.length * 2) / 4)]
    const q3 = ordenados[Math.floor((ordenados.length * 3) / 4)]

    const pontos: PontoPreviewMapa[] = provincias.map((p) => {
      const v = p.total2023
      const corIndice = v <= q1 ? 0 : v <= q2 ? 1 : v <= q3 ? 2 : 3
      return { ...projectar(p.lon, p.lat, bbox), corIndice }
    })

    cacheCereais = {
      pontos,
      rotuloCamada: 'Produção total de cereais 2023 (t)',
      legenda: [
        { cor: ESCALA_VERDE[0], rotulo: 'Baixa' },
        { cor: ESCALA_VERDE[1], rotulo: 'Média-baixa' },
        { cor: ESCALA_VERDE[2], rotulo: 'Média-alta' },
        { cor: ESCALA_VERDE[3], rotulo: 'Alta' },
      ],
    }
    return cacheCereais
  } catch {
    return null
  }
}

/** Despacha para a função de prévia certa consoante o tipo de mapa — usado tanto pelo hero como
 *  pelo grid do catálogo, para os dois usarem sempre a mesma fonte de verdade. */
export async function obterPreviewParaMapa(kind: MapKind): Promise<PreviewMapa | null> {
  switch (kind) {
    case 'health':
      return obterPreviewSaude()
    case 'malaria':
      return obterPreviewMalaria()
    case 'poles':
      return obterPreviewPostes()
    case 'feeder':
      return obterPreviewFeeder()
    case 'cereals':
      return obterPreviewCereais()
    default:
      return null
  }
}
