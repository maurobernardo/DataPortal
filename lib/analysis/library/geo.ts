/**
 * Geoestatística (Parte 7.6): o núcleo do diferencial do motor.
 *
 * Implementação directa das fórmulas clássicas (Moran, Geary, Getis-Ord), sem dependências
 * externas. Cada função devolve também a interpretação em linguagem natural, porque o produto
 * exige que a estatística chegue ao utilizador explicada, não apenas calculada.
 */
import {
  media,
  normalCdf,
  pValorBilateral,
  soma,
  varianciaPopulacional,
  arredondar,
} from './numeric'

export type Ponto = [number, number]

/**
 * Matriz de pesos espaciais em formato esparso: pesos[i] = { j: w }.
 * Guardada assim porque as matrizes reais são muito esparsas (cada unidade tem poucos vizinhos)
 * e porque as fórmulas só precisam de iterar sobre vizinhos existentes.
 */
export type PesosEspaciais = {
  pesos: Map<number, Map<number, number>>
  n: number
  tipo: string
  /** Unidades sem qualquer vizinho: distorcem as estatísticas e têm de ser reportadas. */
  ilhas: number[]
}

const RAIO_TERRA_KM = 6371

export function distanciaKm(a: Ponto, b: Ponto): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b[1] - a[1])
  const dLon = rad(b[0] - a[0])
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(s)))
}

/**
 * Pesos por k vizinhos mais próximos a partir de centróides.
 *
 * Escolhido como método por defeito em vez de contiguidade queen/rook porque funciona com
 * qualquer geometria (incluindo pontos), não exige topologia limpa, e garante que nenhuma
 * unidade fica sem vizinhos, o que evita ilhas que invalidariam o teste.
 */
export function pesosKnn(centroides: Ponto[], k = 5, estandardizarLinha = true): PesosEspaciais {
  const n = centroides.length
  const pesos = new Map<number, Map<number, number>>()
  const kEfectivo = Math.max(1, Math.min(k, n - 1))

  for (let i = 0; i < n; i++) {
    const distancias: { j: number; d: number }[] = []
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      distancias.push({ j, d: distanciaKm(centroides[i], centroides[j]) })
    }
    distancias.sort((a, b) => a.d - b.d)
    const vizinhos = new Map<number, number>()
    const peso = estandardizarLinha ? 1 / kEfectivo : 1
    for (const { j } of distancias.slice(0, kEfectivo)) {
      vizinhos.set(j, peso)
    }
    pesos.set(i, vizinhos)
  }

  return { pesos, n, tipo: `knn(k=${kEfectivo})`, ilhas: [] }
}

/** Pesos por banda de distância: vizinho é quem estiver a menos de `raioKm`. */
export function pesosDistancia(
  centroides: Ponto[],
  raioKm: number,
  estandardizarLinha = true
): PesosEspaciais {
  const n = centroides.length
  const pesos = new Map<number, Map<number, number>>()
  const ilhas: number[] = []

  for (let i = 0; i < n; i++) {
    const vizinhos = new Map<number, number>()
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      if (distanciaKm(centroides[i], centroides[j]) <= raioKm) vizinhos.set(j, 1)
    }
    if (vizinhos.size === 0) ilhas.push(i)
    if (estandardizarLinha && vizinhos.size > 0) {
      const w = 1 / vizinhos.size
      for (const j of Array.from(vizinhos.keys())) vizinhos.set(j, w)
    }
    pesos.set(i, vizinhos)
  }

  return { pesos, n, tipo: `distancia(${raioKm}km)`, ilhas }
}

export type MoranGlobal = {
  I: number
  esperado: number
  variancia: number
  z: number
  p: number
  significativo: boolean
  padrao: 'agrupado' | 'disperso' | 'aleatorio'
  interpretacao: string
  n: number
  metodo_pesos: string
}

/**
 * Moran's I global com inferência sob hipótese de aleatorização (a mesma que o GeoDa e o PySAL
 * usam por defeito), que não assume normalidade dos dados: relevante aqui porque indicadores
 * socioeconómicos são tipicamente assimétricos.
 */
export function moranGlobal(valores: number[], W: PesosEspaciais): MoranGlobal {
  const n = valores.length
  if (n !== W.n) throw new Error('moranGlobal: dimensão dos valores difere da matriz de pesos')
  if (n < 4) throw new Error('moranGlobal: são necessárias pelo menos 4 unidades')

  const xbar = media(valores)
  const desvios = valores.map((x) => x - xbar)
  const m2 = soma(desvios.map((d) => d * d))

  let numerador = 0
  let S0 = 0
  for (let i = 0; i < n; i++) {
    const vizinhos = W.pesos.get(i)
    if (!vizinhos) continue
    for (const [j, w] of Array.from(vizinhos)) {
      numerador += w * desvios[i] * desvios[j]
      S0 += w
    }
  }

  const I = (n / S0) * (numerador / m2)
  const esperado = -1 / (n - 1)

  // S1 e S2 conforme Cliff & Ord: dependem da simetria da matriz de pesos.
  let S1 = 0
  for (let i = 0; i < n; i++) {
    const vi = W.pesos.get(i) || new Map()
    for (const [j, wij] of Array.from(vi)) {
      const wji = W.pesos.get(j)?.get(i) ?? 0
      S1 += (wij + wji) ** 2
    }
  }
  S1 = S1 / 2

  let S2 = 0
  for (let i = 0; i < n; i++) {
    const linha = soma(Array.from((W.pesos.get(i) || new Map()).values()))
    let coluna = 0
    for (let j = 0; j < n; j++) coluna += W.pesos.get(j)?.get(i) ?? 0
    S2 += (linha + coluna) ** 2
  }

  const m4 = soma(desvios.map((d) => d ** 4))
  const b2 = (n * m4) / (m2 * m2)

  const A = n * ((n * n - 3 * n + 3) * S1 - n * S2 + 3 * S0 * S0)
  const B = b2 * ((n * n - n) * S1 - 2 * n * S2 + 6 * S0 * S0)
  const C = (n - 1) * (n - 2) * (n - 3) * S0 * S0
  const varI = (A - B) / C - esperado * esperado

  const z = varI > 0 ? (I - esperado) / Math.sqrt(varI) : 0
  const p = pValorBilateral(z)
  const significativo = p < 0.05
  const padrao: MoranGlobal['padrao'] = !significativo
    ? 'aleatorio'
    : I > esperado
      ? 'agrupado'
      : 'disperso'

  const interpretacao = significativo
    ? padrao === 'agrupado'
      ? `Os valores estão espacialmente agrupados: unidades vizinhas tendem a ter valores semelhantes (I = ${arredondar(I, 3)}, p = ${arredondar(p, 4)}). Não é um padrão que se obtenha por acaso.`
      : `Os valores estão espacialmente dispersos: unidades vizinhas tendem a ter valores contrastantes (I = ${arredondar(I, 3)}, p = ${arredondar(p, 4)}).`
    : `Não há evidência de padrão espacial: a distribuição é compatível com o acaso (I = ${arredondar(I, 3)}, p = ${arredondar(p, 4)}).`

  return {
    I: arredondar(I, 6),
    esperado: arredondar(esperado, 6),
    variancia: arredondar(varI, 8),
    z: arredondar(z, 4),
    p: arredondar(p, 6),
    significativo,
    padrao,
    interpretacao,
    n,
    metodo_pesos: W.tipo,
  }
}

export type CategoriaLisa = 'alto-alto' | 'baixo-baixo' | 'alto-baixo' | 'baixo-alto' | 'nao_significativo'

export type ResultadoLisa = {
  indice: number
  Ii: number
  z: number
  p: number
  categoria: CategoriaLisa
}

/**
 * Moran local (LISA) com permutação condicional.
 *
 * Usa permutações em vez da aproximação analítica porque a distribuição do Ii local é muito
 * assimétrica em amostras pequenas (o caso típico: 11 províncias, 154 distritos), onde a
 * aproximação normal daria significância a falsos positivos.
 */
export function moranLocalLisa(
  valores: number[],
  W: PesosEspaciais,
  permutacoes = 999,
  semente = 42
): ResultadoLisa[] {
  const n = valores.length
  const xbar = media(valores)
  const desvios = valores.map((x) => x - xbar)
  const m2 = soma(desvios.map((d) => d * d)) / n
  const rng = geradorAleatorio(semente)

  const mediaGlobal = xbar
  const resultados: ResultadoLisa[] = []

  for (let i = 0; i < n; i++) {
    const vizinhos = W.pesos.get(i)
    if (!vizinhos || vizinhos.size === 0) {
      resultados.push({ indice: i, Ii: 0, z: 0, p: 1, categoria: 'nao_significativo' })
      continue
    }

    const lagObservado = soma(Array.from(vizinhos).map(([j, w]) => w * desvios[j]))
    const Ii = (desvios[i] / m2) * lagObservado

    // Permuta os restantes valores mantendo xi fixo (permutação condicional).
    const outros = desvios.filter((_, idx) => idx !== i)
    const k = vizinhos.size
    const pesosLista = Array.from(vizinhos.values())
    let maiores = 0

    for (let p = 0; p < permutacoes; p++) {
      const amostra = amostrarSemReposicao(outros, k, rng)
      const lagSim = soma(amostra.map((d, idx) => pesosLista[idx] * d))
      const IiSim = (desvios[i] / m2) * lagSim
      if (Math.abs(IiSim) >= Math.abs(Ii)) maiores++
    }

    const p = (maiores + 1) / (permutacoes + 1)
    const significativo = p < 0.05

    let categoria: CategoriaLisa = 'nao_significativo'
    if (significativo) {
      const altoProprio = valores[i] > mediaGlobal
      const mediaVizinhos = soma(Array.from(vizinhos).map(([j, w]) => w * valores[j]))
      const somaPesos = soma(Array.from(vizinhos.values()))
      const altoVizinho = somaPesos > 0 ? mediaVizinhos / somaPesos > mediaGlobal : false
      categoria = altoProprio
        ? altoVizinho
          ? 'alto-alto'
          : 'alto-baixo'
        : altoVizinho
          ? 'baixo-alto'
          : 'baixo-baixo'
    }

    resultados.push({
      indice: i,
      Ii: arredondar(Ii, 6),
      z: 0,
      p: arredondar(p, 4),
      categoria,
    })
  }

  return resultados
}

export type ResultadoGiEstrela = {
  indice: number
  z: number
  p: number
  classificacao: 'hotspot_99' | 'hotspot_95' | 'hotspot_90' | 'coldspot_90' | 'coldspot_95' | 'coldspot_99' | 'nao_significativo'
}

/**
 * Getis-Ord Gi* (inclui a própria unidade na vizinhança, ao contrário do Gi simples).
 * É o método usado para identificar hotspots operacionais: onde intervir primeiro.
 */
export function getisOrdGiEstrela(valores: number[], W: PesosEspaciais): ResultadoGiEstrela[] {
  const n = valores.length
  const xbar = media(valores)
  const S = Math.sqrt(varianciaPopulacional(valores))
  const resultados: ResultadoGiEstrela[] = []

  for (let i = 0; i < n; i++) {
    const vizinhos = new Map(W.pesos.get(i) || new Map<number, number>())
    vizinhos.set(i, 1) // Gi* inclui a própria unidade

    const somaW = soma(Array.from(vizinhos.values()))
    const somaW2 = soma(Array.from(vizinhos.values()).map((w) => w * w))
    const somaWx = soma(Array.from(vizinhos).map(([j, w]) => w * valores[j]))

    const numerador = somaWx - xbar * somaW
    const denominador = S * Math.sqrt((n * somaW2 - somaW * somaW) / (n - 1))
    const z = denominador > 0 ? numerador / denominador : 0
    const p = pValorBilateral(z)

    let classificacao: ResultadoGiEstrela['classificacao'] = 'nao_significativo'
    if (p < 0.01) classificacao = z > 0 ? 'hotspot_99' : 'coldspot_99'
    else if (p < 0.05) classificacao = z > 0 ? 'hotspot_95' : 'coldspot_95'
    else if (p < 0.1) classificacao = z > 0 ? 'hotspot_90' : 'coldspot_90'

    resultados.push({ indice: i, z: arredondar(z, 4), p: arredondar(p, 6), classificacao })
  }

  return resultados
}

/** Geary's C: complementar ao Moran, mais sensível a diferenças locais. */
export function gearyC(valores: number[], W: PesosEspaciais) {
  const n = valores.length
  const xbar = media(valores)
  const desvios = valores.map((x) => x - xbar)
  const m2 = soma(desvios.map((d) => d * d))

  let numerador = 0
  let S0 = 0
  for (let i = 0; i < n; i++) {
    for (const [j, w] of Array.from(W.pesos.get(i) || new Map<number, number>())) {
      numerador += w * (valores[i] - valores[j]) ** 2
      S0 += w
    }
  }

  const C = ((n - 1) * numerador) / (2 * S0 * m2)
  return {
    C: arredondar(C, 6),
    esperado: 1,
    interpretacao:
      C < 1
        ? 'Autocorrelação espacial positiva: vizinhos parecidos.'
        : C > 1
          ? 'Autocorrelação espacial negativa: vizinhos contrastantes.'
          : 'Sem autocorrelação espacial detectável.',
  }
}

/**
 * Teste MAUP: a conclusão sobrevive à mudança de nível de agregação?
 * Compara o ranking das unidades entre dois níveis; correlação de ordem baixa significa que a
 * conclusão depende do nível escolhido e tem de ser declarada em "O que isto não diz" (R8).
 */
export function testeMaup(
  rankingNivelA: { nome: string; valor: number }[],
  rankingNivelB: { nome: string; valor: number }[]
): { correlacao_ordem: number; conclusao_estavel: boolean; nota: string } {
  const mapaB = new Map(rankingNivelB.map((r) => [r.nome, r.valor]))
  const pares = rankingNivelA
    .filter((r) => mapaB.has(r.nome))
    .map((r) => ({ a: r.valor, b: mapaB.get(r.nome)! }))

  if (pares.length < 3) {
    return {
      correlacao_ordem: NaN,
      conclusao_estavel: false,
      nota: 'Unidades comuns insuficientes para testar o efeito do nível de agregação.',
    }
  }

  const rho = spearman(
    pares.map((p) => p.a),
    pares.map((p) => p.b)
  )
  const estavel = rho >= 0.8

  return {
    correlacao_ordem: arredondar(rho, 4),
    conclusao_estavel: estavel,
    nota: estavel
      ? 'O ordenamento mantém-se ao mudar de nível de agregação: a conclusão é robusta ao MAUP.'
      : 'O ordenamento muda de forma relevante entre níveis de agregação: a conclusão depende do nível escolhido e não deve ser generalizada.',
  }
}

/** Correlação de Spearman (usada no teste MAUP e em relações não lineares). */
export function spearman(x: number[], y: number[]): number {
  const rank = (v: number[]) => {
    const indexado = v.map((valor, i) => ({ valor, i })).sort((a, b) => a.valor - b.valor)
    const postos = new Array<number>(v.length)
    let k = 0
    while (k < indexado.length) {
      let j = k
      while (j + 1 < indexado.length && indexado[j + 1].valor === indexado[k].valor) j++
      const postoMedio = (k + j) / 2 + 1
      for (let m = k; m <= j; m++) postos[indexado[m].i] = postoMedio
      k = j + 1
    }
    return postos
  }

  const rx = rank(x)
  const ry = rank(y)
  const mx = media(rx)
  const my = media(ry)
  const num = soma(rx.map((r, i) => (r - mx) * (ry[i] - my)))
  const den = Math.sqrt(soma(rx.map((r) => (r - mx) ** 2)) * soma(ry.map((r) => (r - my) ** 2)))
  return den === 0 ? 0 : num / den
}

/** Gerador pseudo-aleatório com semente (mulberry32): garante reprodutibilidade (R11). */
function geradorAleatorio(semente: number): () => number {
  let a = semente >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function amostrarSemReposicao(fonte: number[], k: number, rng: () => number): number[] {
  const copia = [...fonte]
  const out: number[] = []
  for (let i = 0; i < k && copia.length > 0; i++) {
    const idx = Math.floor(rng() * copia.length)
    out.push(copia[idx])
    copia.splice(idx, 1)
  }
  return out
}

export { normalCdf }
