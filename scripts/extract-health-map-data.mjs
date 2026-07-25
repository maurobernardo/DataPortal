/**
 * Extrai o GeoJSON embutido (const DATA = {...}) do HTML do mapa de saúde
 * e grava em public/data/health-adm3.geojson
 *
 * Uso:
 *   node scripts/extract-health-map-data.mjs
 *   node scripts/extract-health-map-data.mjs C:\caminho\real\mapa-saude.html
 *
 * Sem argumentos, procura por ordem:
 *   scripts/health-map-source.html
 *   health-map-source.html (raiz do projeto)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outPath = path.join(root, 'public', 'data', 'health-adm3.geojson')

const DEFAULT_CANDIDATES = [
  path.join(__dirname, 'health-map-source.html'),
  path.join(root, 'health-map-source.html'),
  path.join(root, 'mapa-saude.html'),
]

function resolveHtmlPath(arg) {
  if (arg) {
    const resolved = path.resolve(arg)
    if (!fs.existsSync(resolved)) {
      console.error(`Ficheiro não encontrado: ${resolved}`)
      console.error('')
      console.error('Guarde o HTML completo do mapa (o ficheiro .html que enviou no chat)')
      console.error('e passe o caminho real, por exemplo:')
      console.error('  node scripts/extract-health-map-data.mjs "D:\\Downloads\\mapa-saude.html"')
      console.error('')
      console.error('Ou copie o ficheiro para:')
      console.error(`  ${DEFAULT_CANDIDATES[0]}`)
      console.error('e execute sem argumentos:')
      console.error('  node scripts/extract-health-map-data.mjs')
      process.exit(1)
    }
    return resolved
  }
  for (const p of DEFAULT_CANDIDATES) {
    if (fs.existsSync(p)) return p
  }
  console.error('Nenhum ficheiro HTML encontrado.')
  console.error('')
  console.error('Opção A — copie o HTML para:')
  console.error(`  ${DEFAULT_CANDIDATES[0]}`)
  console.error('Depois: node scripts/extract-health-map-data.mjs')
  console.error('')
  console.error('Opção B — indique o caminho do ficheiro .html:')
  console.error('  node scripts/extract-health-map-data.mjs "C:\\caminho\\para\\mapa.html"')
  console.error('')
  console.error('(O texto "caminho/para/o-mapa.html" na documentação era só um exemplo.)')
  process.exit(1)
}

function extractDataJson(html) {
  const marker = 'const DATA = '
  const start = html.indexOf(marker)
  if (start < 0) {
    console.error('Não encontrado "const DATA = " no HTML.')
    console.error('Use o ficheiro HTML original do mapa Data4Moz com o script embutido.')
    process.exit(1)
  }

  let i = start + marker.length
  while (i < html.length && html[i] !== '{') i++
  if (html[i] !== '{') {
    console.error('JSON não encontrado após const DATA =')
    process.exit(1)
  }

  let depth = 0
  let inString = false
  let escape = false
  let end = i
  for (; end < html.length; end++) {
    const c = html[end]
    if (inString) {
      if (escape) escape = false
      else if (c === '\\') escape = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        end++
        break
      }
    }
  }

  return html.slice(i, end)
}

const htmlPath = resolveHtmlPath(process.argv[2])
console.log(`A ler: ${htmlPath}`)
const html = fs.readFileSync(htmlPath, 'utf8')
const jsonText = extractDataJson(html)

let data
try {
  data = JSON.parse(jsonText)
} catch (e) {
  console.error('Falha ao parsear JSON:', e.message)
  process.exit(1)
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(data))
console.log(`Gravado ${outPath} (${data.features?.length ?? 0} features)`)
