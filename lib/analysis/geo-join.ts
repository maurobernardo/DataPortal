import { db } from '@/lib/db'
import { paraNumero } from './library/numeric'
import { colunaValores, type NivelAdmin, type ResultadoLigacao, type Tabela } from './dados'

/**
 * Junção espacial: deriva a unidade administrativa a partir de coordenadas.
 *
 * Existe porque a ausência de uma coluna "distrito" não é ausência de nível distrital. Um
 * ficheiro de pontos com Lat/Long contém a informação distrital, apenas não a declara; recusar
 * responder a uma pergunta distrital nesse caso seria falhar R2 e R4 ao mesmo tempo.
 *
 * O teste corre em JavaScript sobre polígonos carregados uma vez, em vez de uma consulta
 * ST_Contains por ponto: com milhares de pontos, o custo das idas à base de dados dominaria
 * completamente o custo do cálculo geométrico.
 */

type Anel = [number, number][]
type PoligonoUnidade = {
  codigo: string
  nome: string
  aneis: Anel[]
  /** Caixa envolvente, para descartar candidatos sem correr o teste completo. */
  bbox: [number, number, number, number]
}

const cachePoligonos = new Map<NivelAdmin, PoligonoUnidade[]>()

function extrairAneis(geometria: any): Anel[] {
  if (!geometria) return []
  if (geometria.type === 'Polygon') return geometria.coordinates as Anel[]
  if (geometria.type === 'MultiPolygon') {
    return (geometria.coordinates as Anel[][]).flat()
  }
  return []
}

function calcularBbox(aneis: Anel[]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const anel of aneis) {
    for (const [x, y] of anel) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  return [minX, minY, maxX, maxY]
}

async function carregarPoligonos(nivel: NivelAdmin): Promise<PoligonoUnidade[]> {
  const emCache = cachePoligonos.get(nivel)
  if (emCache) return emCache

  const [rows] = (await db.execute(
    `SELECT codigo, nome, ST_AsGeoJSON(geometria) AS geo FROM geo_unidades WHERE nivel = ?`,
    [nivel]
  )) as [any[], unknown]

  const poligonos: PoligonoUnidade[] = []
  for (const r of rows) {
    try {
      const aneis = extrairAneis(JSON.parse(r.geo))
      if (aneis.length === 0) continue
      poligonos.push({
        codigo: String(r.codigo),
        nome: String(r.nome),
        aneis,
        bbox: calcularBbox(aneis),
      })
    } catch {
      // Geometria ilegível: a unidade fica de fora e os pontos que lá caíssem contam como
      // não correspondidos, o que é visível no relatório em vez de silencioso.
    }
  }

  cachePoligonos.set(nivel, poligonos)
  return poligonos
}

/** Ray casting: conta cruzamentos de uma semi-recta horizontal com as arestas do anel. */
function pontoNoAnel(x: number, y: number, anel: Anel): boolean {
  let dentro = false
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i]
    const [xj, yj] = anel[j]
    const cruza = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (cruza) dentro = !dentro
  }
  return dentro
}

/**
 * Um MultiPolygon achatado mistura anéis exteriores com buracos. Alternar o estado a cada anel
 * que contém o ponto trata os buracos correctamente: cair no exterior e depois num buraco
 * devolve "fora", que é o comportamento certo para ilhas em lagos e enclaves.
 */
function pontoNaUnidade(x: number, y: number, u: PoligonoUnidade): boolean {
  if (x < u.bbox[0] || x > u.bbox[2] || y < u.bbox[1] || y > u.bbox[3]) return false
  let dentro = false
  for (const anel of u.aneis) {
    if (pontoNoAnel(x, y, anel)) dentro = !dentro
  }
  return dentro
}

const PADRAO_LAT = /^(lat|latitude|y|coord_y|gps_lat)$/i
const PADRAO_LON = /^(lon|long|lng|longitude|x|coord_x|gps_lon|gps_long)$/i

export function detectarColunasCoordenadas(
  tabela: Tabela
): { lat: string; lon: string } | null {
  const lat = tabela.colunas.find((c) => PADRAO_LAT.test(c.trim()))
  const lon = tabela.colunas.find((c) => PADRAO_LON.test(c.trim()))
  if (!lat || !lon) return null

  // Confirma pelos valores: uma coluna chamada "x" pode ser um identificador qualquer, e uma
  // troca entre latitude e longitude produziria pontos no oceano sem dar erro.
  const amostraLat = colunaValores(tabela, lat).slice(0, 200).map(paraNumero).filter((v): v is number => v !== null)
  const amostraLon = colunaValores(tabela, lon).slice(0, 200).map(paraNumero).filter((v): v is number => v !== null)
  if (amostraLat.length < 5 || amostraLon.length < 5) return null

  const latValida = amostraLat.every((v) => v >= -90 && v <= 90)
  const lonValida = amostraLon.every((v) => v >= -180 && v <= 180)
  if (!latValida || !lonValida) return null

  return { lat, lon }
}

/**
 * Ponto representativo de qualquer geometria GeoJSON, para junção espacial quando não há colunas
 * lat/lon separadas — o caso mais comum em shapefiles reais, onde a geometria é a própria
 * localização, não um atributo redundante. Ponto usa-se directamente; para linhas usa-se o
 * vértice do meio (aproximação ao ponto médio, mais estável que o primeiro vértice numa linha
 * comprida que pode começar perto de uma fronteira); para polígonos, o centróide dos vértices do
 * anel exterior (a mesma aproximação que a especificação já assume para E2 quando a sobreposição
 * de área é ambígua). Não é uma intersecção geométrica exacta — uma linha longa pode atravessar
 * mais do que uma unidade e isto só devolve uma — mas é imensamente melhor do que não responder
 * nada, e é o que já é praticado noutros pontos do motor (ex.: MAUP já assume aproximações
 * defensáveis em vez de recusar responder).
 */
export function pontoRepresentativo(geometria: any): [number, number] | null {
  if (!geometria?.type) return null
  const t = geometria.type
  const c = geometria.coordinates

  if (t === 'Point') return Array.isArray(c) && c.length >= 2 ? [c[0], c[1]] : null

  if (t === 'LineString') {
    if (!Array.isArray(c) || c.length === 0) return null
    const meio = c[Math.floor(c.length / 2)]
    return Array.isArray(meio) ? [meio[0], meio[1]] : null
  }
  if (t === 'MultiLineString') {
    if (!Array.isArray(c) || c.length === 0) return null
    return pontoRepresentativo({ type: 'LineString', coordinates: c[0] })
  }

  if (t === 'Polygon') {
    const anelExterior = c?.[0]
    if (!Array.isArray(anelExterior) || anelExterior.length === 0) return null
    let sx = 0, sy = 0
    for (const [x, y] of anelExterior) { sx += x; sy += y }
    return [sx / anelExterior.length, sy / anelExterior.length]
  }
  if (t === 'MultiPolygon') {
    if (!Array.isArray(c) || c.length === 0) return null
    return pontoRepresentativo({ type: 'Polygon', coordinates: c[0] })
  }

  return null
}

/**
 * Liga as linhas de uma tabela a unidades administrativas pela geometria de cada feição (não por
 * colunas lat/lon, que a maioria dos shapefiles reais não tem — a localização já está na
 * geometria). Complementa ligarPorCoordenadas: aquele serve tabelas com lat/lon como atributo
 * explícito; este serve qualquer geometria (ponto, linha ou polígono) directamente.
 */
export async function ligarPorGeometria(
  tabela: Tabela,
  nivel: NivelAdmin
): Promise<ResultadoLigacao | null> {
  if (!tabela.geometrias || tabela.geometrias.length === 0) return null

  const poligonos = await carregarPoligonos(nivel)
  if (poligonos.length === 0) return null

  const ligacoes = new Map<number, string>()
  const foraDoPais: string[] = []
  let comGeometria = 0

  tabela.geometrias.forEach((g, i) => {
    const ponto = pontoRepresentativo(g)
    if (!ponto) return
    comGeometria++
    const [lon, lat] = ponto
    const unidade = poligonos.find((u) => pontoNaUnidade(lon, lat, u))
    if (unidade) {
      ligacoes.set(i, unidade.codigo)
    } else if (foraDoPais.length < 30) {
      foraDoPais.push(`${lat.toFixed(4)}, ${lon.toFixed(4)}`)
    }
  })

  if (comGeometria === 0) return null

  return {
    nivel,
    coluna_usada: '(geometria da feição)',
    ligacoes,
    taxa_correspondencia: ligacoes.size / comGeometria,
    nao_correspondidos: foraDoPais,
    metodo: 'codigo',
  }
}

/**
 * Liga as linhas de uma tabela a unidades administrativas por coordenadas.
 *
 * Devolve o mesmo tipo que a ligação por nome ou código, para que o resto do motor não precise
 * de saber como a ligação foi obtida.
 */
export async function ligarPorCoordenadas(
  tabela: Tabela,
  nivel: NivelAdmin,
  colunas?: { lat: string; lon: string }
): Promise<ResultadoLigacao | null> {
  const cols = colunas || detectarColunasCoordenadas(tabela)
  if (!cols) return null

  const poligonos = await carregarPoligonos(nivel)
  if (poligonos.length === 0) return null

  const lats = colunaValores(tabela, cols.lat).map(paraNumero)
  const lons = colunaValores(tabela, cols.lon).map(paraNumero)

  const ligacoes = new Map<number, string>()
  const foraDoPais: string[] = []
  let comCoordenadas = 0

  for (let i = 0; i < lats.length; i++) {
    const lat = lats[i]
    const lon = lons[i]
    if (lat === null || lon === null) continue
    comCoordenadas++

    const unidade = poligonos.find((u) => pontoNaUnidade(lon, lat, u))
    if (unidade) {
      ligacoes.set(i, unidade.codigo)
    } else if (foraDoPais.length < 30) {
      foraDoPais.push(`${lat.toFixed(4)}, ${lon.toFixed(4)}`)
    }
  }

  return {
    nivel,
    coluna_usada: `${cols.lat}+${cols.lon} (junção espacial)`,
    ligacoes,
    taxa_correspondencia: comCoordenadas > 0 ? ligacoes.size / comCoordenadas : 0,
    nao_correspondidos: foraDoPais,
    metodo: 'codigo',
  }
}
