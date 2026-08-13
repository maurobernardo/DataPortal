/**
 * Carrega geo_unidades (A2 da Parte 18) a partir dos próprios datasets de limites do portal.
 *
 * O spec sugere descarregar o COD-AB do HDX. Usam-se antes os shapefiles já publicados no
 * portal porque (a) são a fonte que o portal considera oficial, (b) têm pcodes hierárquicos
 * consistentes entre os três níveis, e (c) evita depender de rede e de uma versão de fronteiras
 * diferente da que os utilizadores vêem no catálogo.
 *
 * Hierarquia de códigos verificada nos dados reais:
 *   admin1 província  ProvCodigo  "02"
 *   admin2 distrito   ID_Distrit  "0215"  (pai = CodProvinc "02")
 *   admin3 posto      CODIGO      "021503" (pai = DISTCODE "0215")
 */
import { db, findDatasetById } from '../lib/db'
import { getDatasetPreview } from '../lib/dataset-preview'

type Nivel = 'admin1' | 'admin2' | 'admin3'

type Config = {
  datasetId: number
  nivel: Nivel
  campoCodigo: string
  campoNome: string
  campoCodigoPai: string | null
}

const CONFIGS: Config[] = [
  { datasetId: 23, nivel: 'admin1', campoCodigo: 'ProvCodigo', campoNome: 'Provincia', campoCodigoPai: null },
  { datasetId: 3, nivel: 'admin2', campoCodigo: 'ID_Distrit', campoNome: 'Distrito', campoCodigoPai: 'CodProvinc' },
  { datasetId: 17, nivel: 'admin3', campoCodigo: 'CODIGO', campoNome: 'POSTO', campoCodigoPai: 'DISTCODE' },
]

const RAIO_TERRA_KM = 6371

function semAcentos(s: string): string {
  return s.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
}

/** Variantes de escrita para reconciliação de nomes (Parte 3.3). */
function variantesNome(nome: string): string[] {
  const limpo = nome.trim().replace(/\s+/g, ' ')
  const variantes = new Set<string>([
    limpo,
    limpo.toUpperCase(),
    semAcentos(limpo),
    semAcentos(limpo).toUpperCase(),
    semAcentos(limpo).toLowerCase(),
  ])
  return Array.from(variantes)
}

/**
 * Simplificação Douglas-Peucker.
 *
 * Necessária porque as províncias em resolução total excedem o max_allowed_packet do MySQL. A
 * geometria guardada em geo_unidades serve para junções espaciais, contenção e centróides, não
 * para renderização de alta fidelidade: a tolerância abaixo (~110 m) preserva a forma o
 * suficiente para essas operações. A área é calculada na geometria original, antes de
 * simplificar, para não perder exactidão onde ela importa.
 */
function distanciaPerpendicular(p: number[], a: number[], b: number[]): number {
  const [px, py] = p
  const [ax, ay] = a
  const [bx, by] = b
  const dx = bx - ax
  const dy = by - ay
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay)
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
  const tc = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + tc * dx), py - (ay + tc * dy))
}

function douglasPeucker(pontos: number[][], tolerancia: number): number[][] {
  if (pontos.length <= 2) return pontos
  let maxDist = 0
  let indice = 0
  for (let i = 1; i < pontos.length - 1; i++) {
    const d = distanciaPerpendicular(pontos[i], pontos[0], pontos[pontos.length - 1])
    if (d > maxDist) {
      maxDist = d
      indice = i
    }
  }
  if (maxDist <= tolerancia) return [pontos[0], pontos[pontos.length - 1]]
  const esq = douglasPeucker(pontos.slice(0, indice + 1), tolerancia)
  const dir = douglasPeucker(pontos.slice(indice), tolerancia)
  return esq.slice(0, -1).concat(dir)
}

/** Simplifica um anel mantendo-o fechado e com o mínimo de 4 pontos que o WKT exige. */
function simplificarAnel(anel: number[][], tolerancia: number): number[][] | null {
  if (anel.length < 4) return anel
  let simplificado = douglasPeucker(anel, tolerancia)
  if (simplificado.length < 4) return null
  const primeiro = simplificado[0]
  const ultimo = simplificado[simplificado.length - 1]
  if (primeiro[0] !== ultimo[0] || primeiro[1] !== ultimo[1]) simplificado.push(primeiro)
  return simplificado.length >= 4 ? simplificado : null
}

function simplificarGeometria(geom: any, tolerancia: number): any {
  if (!geom) return geom
  if (geom.type === 'Polygon') {
    const aneis = geom.coordinates
      .map((a: number[][]) => simplificarAnel(a, tolerancia))
      .filter((a: number[][] | null) => a !== null)
    return aneis.length > 0 ? { ...geom, coordinates: aneis } : null
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates
      .map((p: number[][][]) =>
        p.map((a: number[][]) => simplificarAnel(a, tolerancia)).filter((a: number[][] | null) => a !== null)
      )
      .filter((p: number[][][]) => p.length > 0)
    return polys.length > 0 ? { ...geom, coordinates: polys } : null
  }
  return geom
}

function anelParaWkt(anel: number[][]): string {
  return anel.map((c) => `${c[0]} ${c[1]}`).join(', ')
}

function poligonoParaWkt(coords: number[][][]): string {
  return `(${coords.map((anel) => `(${anelParaWkt(anel)})`).join(', ')})`
}

function geometriaParaWkt(geom: any): string | null {
  if (!geom) return null
  if (geom.type === 'Polygon') return `POLYGON(${geom.coordinates.map((a: number[][]) => `(${anelParaWkt(a)})`).join(', ')})`
  if (geom.type === 'MultiPolygon')
    return `MULTIPOLYGON(${geom.coordinates.map((p: number[][][]) => poligonoParaWkt(p)).join(', ')})`
  return null
}

/** Área por projecção equirectangular na latitude média: precisão suficiente à escala nacional. */
function areaAnelKm2(anel: number[][]): number {
  if (anel.length < 3) return 0
  const latMedia = anel.reduce((s, c) => s + c[1], 0) / anel.length
  const kmLon = 111.32 * Math.cos((latMedia * Math.PI) / 180)
  const kmLat = 110.57
  let area = 0
  for (let i = 0; i < anel.length; i++) {
    const [x1, y1] = anel[i]
    const [x2, y2] = anel[(i + 1) % anel.length]
    area += x1 * kmLon * (y2 * kmLat) - x2 * kmLon * (y1 * kmLat)
  }
  return Math.abs(area / 2)
}

function areaGeometriaKm2(geom: any): number {
  if (!geom) return 0
  if (geom.type === 'Polygon') {
    const [exterior, ...buracos] = geom.coordinates
    return areaAnelKm2(exterior) - buracos.reduce((s: number, b: number[][]) => s + areaAnelKm2(b), 0)
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.reduce((total: number, poly: number[][][]) => {
      const [exterior, ...buracos] = poly
      return total + areaAnelKm2(exterior) - buracos.reduce((s: number, b: number[][]) => s + areaAnelKm2(b), 0)
    }, 0)
  }
  return 0
}

/** Centróide ponderado pela área dos anéis exteriores (não o centro da bbox, que sai fora em formas côncavas). */
function centroide(geom: any): [number, number] | null {
  const aneis: number[][][] =
    geom?.type === 'Polygon'
      ? [geom.coordinates[0]]
      : geom?.type === 'MultiPolygon'
        ? geom.coordinates.map((p: number[][][]) => p[0])
        : []
  if (aneis.length === 0) return null

  let somaX = 0
  let somaY = 0
  let somaPeso = 0
  for (const anel of aneis) {
    const peso = areaAnelKm2(anel)
    if (peso <= 0) continue
    const cx = anel.reduce((s, c) => s + c[0], 0) / anel.length
    const cy = anel.reduce((s, c) => s + c[1], 0) / anel.length
    somaX += cx * peso
    somaY += cy * peso
    somaPeso += peso
  }
  if (somaPeso === 0) return null
  return [somaX / somaPeso, somaY / somaPeso]
}

function bboxGeometria(geom: any): [number, number, number, number] | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const visitar = (c: any) => {
    if (typeof c[0] === 'number') {
      if (c[0] < minX) minX = c[0]
      if (c[1] < minY) minY = c[1]
      if (c[0] > maxX) maxX = c[0]
      if (c[1] > maxY) maxY = c[1]
      return
    }
    for (const sub of c) visitar(sub)
  }
  if (!geom?.coordinates) return null
  visitar(geom.coordinates)
  return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null
}

/**
 * Nomes de distrito recuperados a partir da camada de postos.
 *
 * Necessário porque a camada de distritos tem registos com nome vazio (confirmado: 0510
 * Moatize). Em vez de codificar o nome à mão, deriva-se do atributo DISTRITO dos postos filhos,
 * que é a mesma fonte oficial e mantém a correcção verificável.
 */
async function nomesDistritoPelosPostos(): Promise<Map<string, string>> {
  const mapa = new Map<string, string>()
  const postos = await findDatasetById(17)
  if (!postos) return mapa
  const preview = await getDatasetPreview(postos, { maxFeatures: 5000 })
  if (!('type' in preview) || preview.type !== 'geo') return mapa
  for (const f of preview.geojson?.features || []) {
    const p = f?.properties || {}
    const cod = String(p.DISTCODE ?? '').trim()
    const nome = String(p.DISTRITO ?? '').trim()
    if (cod && nome && !mapa.has(cod)) mapa.set(cod, nome)
  }
  return mapa
}

type Anomalia = { nivel: string; codigo: string; problema: string; resolucao: string }
const anomalias: Anomalia[] = []

async function carregarNivel(cfg: Config, nomesRecuperados: Map<string, string>) {
  const dataset = await findDatasetById(cfg.datasetId)
  if (!dataset) {
    console.log(`  dataset ${cfg.datasetId} não encontrado, ignorado`)
    return { inseridos: 0, ignorados: 0 }
  }

  const preview = await getDatasetPreview(dataset, { maxFeatures: 5000 })
  if (!('type' in preview) || preview.type !== 'geo') {
    console.log(`  ${dataset.title}: sem geometria utilizável`)
    return { inseridos: 0, ignorados: 0 }
  }

  const features: any[] = preview.geojson?.features || []
  let inseridos = 0
  let ignorados = 0

  for (const f of features) {
    const props = f?.properties || {}
    let codigo = String(props[cfg.campoCodigo] ?? '').trim()
    let nome = String(props[cfg.campoNome] ?? '').trim()
    let nivel: Nivel = cfg.nivel
    let campoPai = cfg.campoCodigoPai

    // Massas de água aparecem nas camadas administrativas sem código: não são unidades.
    if (!codigo || codigo === '0000') {
      if (nome) {
        anomalias.push({
          nivel: cfg.nivel,
          codigo: codigo || '(vazio)',
          problema: `Feição "${nome}" sem código administrativo`,
          resolucao: 'Excluída: massa de água ou feição não administrativa.',
        })
      }
      ignorados++
      continue
    }

    // Na camada de distritos há um registo de nível provincial (Cidade de Maputo, ID de 2
    // dígitos) que a camada de províncias não contém. É promovido a admin1 em vez de descartado,
    // senão os seus 7 distritos ficariam órfãos e a hierarquia incompleta.
    if (cfg.nivel === 'admin2' && codigo.length === 2) {
      nivel = 'admin1'
      campoPai = null
      nome = nome || String(props.Provincia ?? '').trim()
      anomalias.push({
        nivel: 'admin1',
        codigo,
        problema: `Província "${nome}" ausente da camada de províncias`,
        resolucao: 'Recuperada do registo de nível provincial presente na camada de distritos.',
      })
    }

    // Nome em falta na camada de distritos: recupera-se pelo nome que os postos filhos declaram.
    if (!nome && cfg.nivel === 'admin2') {
      const recuperado = nomesRecuperados.get(codigo)
      if (recuperado) {
        nome = recuperado
        anomalias.push({
          nivel: cfg.nivel,
          codigo,
          problema: 'Nome do distrito vazio na origem',
          resolucao: `Recuperado da camada de postos administrativos: "${recuperado}".`,
        })
      }
    }

    if (!nome) {
      anomalias.push({
        nivel: cfg.nivel,
        codigo,
        problema: 'Nome vazio e não recuperável',
        resolucao: 'Excluída da hierarquia.',
      })
      ignorados++
      continue
    }

    // Área, centróide e bbox na geometria original; só a geometria guardada é simplificada.
    const area = areaGeometriaKm2(f.geometry)
    const cent = centroide(f.geometry)
    const bbox = bboxGeometria(f.geometry)

    // ~0,001 grau ≈ 110 m. Se ainda assim exceder o limite do pacote, degrada a tolerância.
    let wkt: string | null = null
    for (const tolerancia of [0.001, 0.005, 0.02, 0.05]) {
      const simplificada = simplificarGeometria(f.geometry, tolerancia)
      const candidato = geometriaParaWkt(simplificada)
      if (!candidato) continue // tolerância colapsou os anéis: guarda o melhor válido anterior
      wkt = candidato
      if (candidato.length < 900_000) break
    }

    if (!wkt || !cent || !bbox) {
      ignorados++
      continue
    }

    const codigoPai = campoPai ? String(props[campoPai] ?? '').trim() || null : null

    await db.execute(
      `INSERT INTO geo_unidades
         (nivel, codigo, codigo_pai, nome, nome_alt, area_km2, geometria, centroide, bbox)
       VALUES (?, ?, ?, ?, ?, ?, ST_GeomFromText(?), ST_GeomFromText(?), ?)
       ON DUPLICATE KEY UPDATE
         nome = VALUES(nome),
         nome_alt = VALUES(nome_alt),
         codigo_pai = VALUES(codigo_pai),
         area_km2 = VALUES(area_km2),
         geometria = VALUES(geometria),
         centroide = VALUES(centroide),
         bbox = VALUES(bbox)`,
      [
        nivel,
        codigo,
        codigoPai,
        nome,
        JSON.stringify(variantesNome(nome)),
        Math.round(area * 100) / 100,
        wkt,
        `POINT(${cent[0]} ${cent[1]})`,
        JSON.stringify(bbox),
      ]
    )
    inseridos++
  }

  console.log(`  ${dataset.title}: ${inseridos} unidades, ${ignorados} ignoradas`)
  return { inseridos, ignorados }
}

/**
 * Reconstrói a geometria de unidades-pai cuja área é muito inferior à soma dos filhos.
 *
 * Detecta o caso em que a camada de origem traz apenas um fragmento no lugar do polígono
 * completo (verificado: Cidade de Maputo entra com 7 km² quando os seus 7 distritos somam
 * 334 km²). A geometria passa a ser o MULTIPOLYGON dos filhos: para contenção espacial, área e
 * centróide isso é equivalente ao polígono dissolvido, e evita depender de ST_Union agregado,
 * que o MariaDB não oferece.
 *
 * O limiar de 50% é conservador de propósito: diferenças pequenas entre pai e filhos são
 * normais (generalização cartográfica diferente por camada) e não devem accionar reconstrução.
 *
 * Exige-se também um mínimo de 2 filhos. Um pai com um único filho que o "cobre" não acrescenta
 * informação, e nesse caso a discrepância é mais provavelmente um erro na geometria do filho do
 * que uma falha no pai. Verificado nos dados: a camada de postos traz os distritos urbanos de
 * Maputo com áreas muito superiores às reais (184 km² para o Distrito Urbano Nº1, quando a
 * camada de distritos dá os 13 km² correctos); sem esta condição, a reconstrução propagaria o
 * erro para o pai em vez de o corrigir.
 */
async function reconstruirPaisIncompletos() {
  const [candidatos] = (await db.execute(
    `SELECT p.codigo, p.nivel, p.nome, p.area_km2 AS area_pai,
            SUM(f.area_km2) AS area_filhos, COUNT(*) AS n_filhos
     FROM geo_unidades p
     JOIN geo_unidades f ON f.codigo_pai = p.codigo
     GROUP BY p.codigo, p.nivel, p.nome, p.area_km2
     HAVING area_pai < 0.5 * area_filhos AND n_filhos >= 2`
  )) as [any[], unknown]

  for (const c of candidatos) {
    const [filhos] = (await db.execute(
      `SELECT ST_AsText(geometria) AS wkt, area_km2, ST_X(centroide) AS cx, ST_Y(centroide) AS cy, bbox
       FROM geo_unidades WHERE codigo_pai = ?`,
      [c.codigo]
    )) as [any[], unknown]

    // Extrai os polígonos de cada filho, seja POLYGON ou MULTIPOLYGON, para um único MULTIPOLYGON.
    const partes: string[] = []
    for (const f of filhos) {
      const wkt: string = f.wkt || ''
      if (wkt.startsWith('MULTIPOLYGON')) {
        const interior = wkt.slice(wkt.indexOf('(') + 1, wkt.lastIndexOf(')'))
        partes.push(interior)
      } else if (wkt.startsWith('POLYGON')) {
        partes.push(wkt.slice(wkt.indexOf('(')))
      }
    }
    if (partes.length === 0) continue

    const novoWkt = `MULTIPOLYGON(${partes.join(', ')})`
    const areaTotal = filhos.reduce((s: number, f: any) => s + Number(f.area_km2 || 0), 0)
    const pesoTotal = areaTotal || filhos.length
    const cx = filhos.reduce((s: number, f: any) => s + Number(f.cx) * Number(f.area_km2 || 1), 0) / pesoTotal
    const cy = filhos.reduce((s: number, f: any) => s + Number(f.cy) * Number(f.area_km2 || 1), 0) / pesoTotal

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const f of filhos) {
      const b = typeof f.bbox === 'string' ? JSON.parse(f.bbox) : f.bbox
      if (!Array.isArray(b)) continue
      minX = Math.min(minX, b[0]); minY = Math.min(minY, b[1])
      maxX = Math.max(maxX, b[2]); maxY = Math.max(maxY, b[3])
    }

    await db.execute(
      `UPDATE geo_unidades
       SET geometria = ST_GeomFromText(?), area_km2 = ?, centroide = ST_GeomFromText(?), bbox = ?
       WHERE codigo = ? AND nivel = ?`,
      [
        novoWkt,
        Math.round(areaTotal * 100) / 100,
        `POINT(${cx} ${cy})`,
        JSON.stringify([minX, minY, maxX, maxY]),
        c.codigo,
        c.nivel,
      ]
    )

    anomalias.push({
      nivel: c.nivel,
      codigo: c.codigo,
      problema: `Geometria de "${c.nome}" cobria ${Math.round(c.area_pai)} km², mas os ${c.n_filhos} filhos somam ${Math.round(c.area_filhos)} km²`,
      resolucao: `Reconstruída como agregação das geometrias dos filhos (${Math.round(areaTotal)} km²).`,
    })
  }
}

async function main() {
  console.log('A carregar unidades administrativas a partir dos datasets do portal\n')
  const nomesRecuperados = await nomesDistritoPelosPostos()
  let total = 0
  for (const cfg of CONFIGS) {
    console.log(`${cfg.nivel}:`)
    const r = await carregarNivel(cfg, nomesRecuperados)
    total += r.inseridos
  }

  // Verificação de integridade da hierarquia: todo o filho tem de ter pai existente.
  const [orfaos] = (await db.execute(
    `SELECT u.nivel, COUNT(*) AS n
     FROM geo_unidades u
     WHERE u.codigo_pai IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM geo_unidades p WHERE p.codigo = u.codigo_pai)
     GROUP BY u.nivel`
  )) as [any[], unknown]

  await reconstruirPaisIncompletos()

  const [porNivel] = (await db.execute(
    `SELECT nivel, COUNT(*) AS n FROM geo_unidades GROUP BY nivel ORDER BY nivel`
  )) as [any[], unknown]

  console.log(`\nTotal: ${total} unidades`)
  for (const n of porNivel) console.log(`  ${n.nivel}: ${n.n}`)

  if (anomalias.length > 0) {
    console.log(`\nAnomalias de origem reconciliadas (${anomalias.length}):`)
    for (const a of anomalias) {
      console.log(`  [${a.nivel} ${a.codigo}] ${a.problema}`)
      console.log(`      ${a.resolucao}`)
    }
  }

  if (orfaos.length > 0) {
    console.log('\nAVISO, unidades sem pai correspondente:')
    for (const o of orfaos) console.log(`  ${o.nivel}: ${o.n}`)
  } else {
    console.log('\nHierarquia íntegra: todas as unidades filhas têm pai correspondente.')
  }
}

main()
  .then(() => db.end())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
