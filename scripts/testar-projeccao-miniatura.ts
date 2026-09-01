/**
 * Bateria sobre a projecção das miniaturas.
 *
 * Duas linhas de aritmética que, erradas, produzem um mapa perfeitamente desenhado e errado: a
 * inversão do eixo Y (o norte em baixo) e a correcção de latitude (o país esticado). Nenhuma das
 * duas se vê a olho por quem não conhece a forma do país de cor, e por isso são testadas com
 * números conhecidos em vez de confiadas ao olho.
 *
 * Uso: npx tsx scripts/testar-projeccao-miniatura.ts
 */
import {
  caixaEnvolvente,
  caminhoDaGeometria,
  criarProjeccao,
  paraCadaAnel,
} from '../lib/analysis/projeccao-miniatura'

let passou = 0
const falhas: string[] = []
function verificar(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) passou++
  else falhas.push(`  ${nome}${detalhe ? ': ' + detalhe : ''}`)
}

// Um quadrado sobre Moçambique: 30E a 40E, 26S a 10S.
const QUADRADO = {
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [30, -26],
        [40, -26],
        [40, -10],
        [30, -10],
        [30, -26],
      ],
    ],
  },
}

const caixa = caixaEnvolvente([QUADRADO])!
verificar('a caixa envolvente apanha os quatro cantos', caixa.minX === 30 && caixa.maxX === 40 && caixa.minY === -26 && caixa.maxY === -10)

const proj = criarProjeccao(caixa, 240, 260)

// ------------------------------------------------------------------ inversao do Y
const [, yNorte] = proj(35, -10)
const [, ySul] = proj(35, -26)
verificar(
  'o NORTE fica em cima no SVG',
  yNorte < ySul,
  `norte y=${yNorte.toFixed(1)}, sul y=${ySul.toFixed(1)}: se estiver ao contrario o pais sai espelhado`
)

// ------------------------------------------------------------------ orientacao horizontal
const [xOeste] = proj(30, -18)
const [xLeste] = proj(40, -18)
verificar('o OESTE fica a esquerda', xOeste < xLeste)

// ------------------------------------------------------------------ cabe no quadro
const cantos = [proj(30, -26), proj(40, -26), proj(40, -10), proj(30, -10)]
verificar(
  'todos os cantos caem dentro do quadro',
  cantos.every(([x, y]) => x >= 0 && x <= 240 && y >= 0 && y <= 260),
  JSON.stringify(cantos.map(([x, y]) => [Math.round(x), Math.round(y)]))
)
verificar(
  'a margem e respeitada nos dois eixos',
  cantos.every(([x, y]) => x >= 7.9 && x <= 232.1 && y >= 7.9 && y <= 252.1)
)

// ------------------------------------------------------------------ correccao de latitude
// 10 graus de longitude a 18 graus sul valem cerca de 95% de 10 graus de latitude em distancia.
// Sem a correccao, a razao entre largura e altura desenhadas seria 10/16; com ela, e menor.
const larguraDesenhada = xLeste - xOeste
const alturaDesenhada = ySul - yNorte
const razao = larguraDesenhada / alturaDesenhada
const razaoSemCorreccao = 10 / 16
verificar(
  'a correccao de latitude estreita o desenho, em vez de o esticar',
  razao < razaoSemCorreccao,
  `razao desenhada ${razao.toFixed(3)} contra ${razaoSemCorreccao.toFixed(3)} sem correccao`
)
verificar(
  'a correccao tem a magnitude certa a 18 graus sul (cerca de 0,95)',
  Math.abs(razao / razaoSemCorreccao - Math.cos((18 * Math.PI) / 180)) < 0.01
)

// ------------------------------------------------------------------ geometrias
let aneis = 0
paraCadaAnel(
  { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[2, 2], [3, 2], [3, 3], [2, 2]]]] },
  () => aneis++
)
verificar('MultiPolygon: os dois aneis sao percorridos', aneis === 2)

let nenhum = 0
paraCadaAnel({ type: 'Point', coordinates: [1, 2] }, () => nenhum++)
verificar('um ponto nao tem aneis para desenhar', nenhum === 0)
verificar('geometria nula nao rebenta', (paraCadaAnel(null, () => {}), true))

const d = caminhoDaGeometria(QUADRADO.geometry, proj)
verificar('o caminho comeca em M e fecha em Z', d.startsWith('M') && d.endsWith('Z'))
verificar(
  'um anel com dois vertices nao vira um risco solto',
  caminhoDaGeometria({ type: 'Polygon', coordinates: [[[0, 0], [1, 1]]] }, proj) === ''
)

// ------------------------------------------------------------------ casos limite
verificar('sem feicoes nao ha caixa', caixaEnvolvente([]) === null)
verificar(
  'uma caixa degenerada (um so ponto) e recusada',
  caixaEnvolvente([{ geometry: { type: 'Polygon', coordinates: [[[5, 5], [5, 5], [5, 5]]] } }]) === null,
  'dividir pela amplitude zero daria Infinity e o mapa desaparecia'
)
verificar(
  'coordenadas nao finitas sao ignoradas em vez de contaminarem a caixa',
  caixaEnvolvente([
    { geometry: { type: 'Polygon', coordinates: [[[30, -26], [NaN, -20], [40, -10], [30, -26]]] } },
  ])?.maxX === 40
)

const total = passou + falhas.length
console.log(`\nProjeccao da miniatura: ${passou}/${total}`)
if (falhas.length) {
  console.log('\nFalhas:')
  falhas.forEach((f) => console.log(f))
  process.exit(1)
}
console.log('Tudo certo.\n')
