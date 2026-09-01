/**
 * Projecção para as miniaturas dos múltiplos pequenos.
 *
 * Não é uma projecção cartográfica a sério, e para um quadro de 240 pixeis não precisa de ser.
 * Precisa de duas coisas: não deformar o país ao ponto de o tornar irreconhecível, e não o desenhar
 * ao contrário. A segunda é a que se erra sem dar por isso.
 *
 * Vive fora do componente para poder ser testada. A inversão do eixo Y e a correcção de latitude
 * são duas linhas de aritmética que, erradas, produzem um mapa perfeitamente desenhado e errado, e
 * a única forma de as verificar é com números conhecidos.
 */

export type Ponto = [number, number]
export type Caixa = { minX: number; minY: number; maxX: number; maxY: number }

/** Percorre os anéis de qualquer geometria GeoJSON poligonal, seja qual for o encaixe de arrays. */
export function paraCadaAnel(geometria: any, visita: (anel: number[][]) => void) {
  if (!geometria) return
  const { type, coordinates } = geometria
  if (!Array.isArray(coordinates)) return
  if (type === 'Polygon') coordinates.forEach((anel: number[][]) => visita(anel))
  else if (type === 'MultiPolygon') coordinates.forEach((p: number[][][]) => p.forEach(visita))
}

export function caixaEnvolvente(features: { geometry: any }[]): Caixa | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const f of features) {
    paraCadaAnel(f.geometry, (anel) => {
      for (const par of anel) {
        const [x, y] = par
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    })
  }
  if (!Number.isFinite(minX) || maxX === minX || maxY === minY) return null
  return { minX, minY, maxX, maxY }
}

/**
 * Constrói a função que leva coordenadas geográficas a pixeis do SVG.
 *
 * A correcção pelo cosseno da latitude central existe porque um grau de longitude vale menos
 * distância do que um grau de latitude em toda a parte excepto no equador. A 18 graus sul, onde
 * Moçambique está, vale cerca de 95%: sem a correcção o país sai esticado na horizontal.
 *
 * A inversão do Y existe porque o eixo vertical do SVG cresce PARA BAIXO e a latitude cresce para
 * cima. Sem ela o mapa sai espelhado na vertical, com o norte em baixo, e continua a parecer um
 * mapa a quem não conhece a forma do país de cor.
 */
export function criarProjeccao(caixa: Caixa, largura: number, altura: number, margem = 8) {
  const cosLat = Math.cos((((caixa.minY + caixa.maxY) / 2) * Math.PI) / 180)
  const larguraGeo = (caixa.maxX - caixa.minX) * cosLat
  const alturaGeo = caixa.maxY - caixa.minY
  const escala = Math.min((largura - margem * 2) / larguraGeo, (altura - margem * 2) / alturaGeo)
  const deslocX = (largura - larguraGeo * escala) / 2
  const deslocY = (altura - alturaGeo * escala) / 2
  return (x: number, y: number): Ponto => [
    deslocX + (x - caixa.minX) * cosLat * escala,
    deslocY + (caixa.maxY - y) * escala,
  ]
}

/** O atributo `d` de um `<path>` para uma feição, ou vazio quando não há anéis desenháveis. */
export function caminhoDaGeometria(geometria: any, projectar: (x: number, y: number) => Ponto): string {
  const partes: string[] = []
  paraCadaAnel(geometria, (anel) => {
    // Menos de três vértices não fecha uma área: desenhar isso daria um risco solto no mapa.
    if (anel.length < 3) return
    const pontos = anel.map((par) => {
      const [px, py] = projectar(par[0], par[1])
      return `${px.toFixed(1)},${py.toFixed(1)}`
    })
    partes.push(`M${pontos.join('L')}Z`)
  })
  return partes.join('')
}
