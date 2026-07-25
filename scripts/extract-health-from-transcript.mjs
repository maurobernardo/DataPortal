/**
 * Extrai GeoJSON do HTML guardado na conversa Cursor (agent transcript).
 * Uso quando ainda não tem o ficheiro .html guardado em disco.
 *
 *   node scripts/extract-health-from-transcript.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outPath = path.join(root, 'public', 'data', 'health-adm3.geojson')

const transcriptPath =
  process.argv[2] ||
  'C:\\Users\\Mauro Zibane\\.cursor\\projects\\d-VersaoProData-DataPortal-DataPortal\\agent-transcripts\\8cbc00e6-09af-4a5e-9f09-3676bf679ad4\\8cbc00e6-09af-4a5e-9f09-3676bf679ad4.jsonl'

if (!fs.existsSync(transcriptPath)) {
  console.error('Transcript não encontrado:', transcriptPath)
  process.exit(1)
}

const marker = 'const DATA = '
let html = ''

for (const line of fs.readFileSync(transcriptPath, 'utf8').split('\n')) {
  if (!line.includes(marker) || !line.includes('FeatureCollection')) continue
  try {
    const row = JSON.parse(line)
    const text = row?.message?.content?.find((c) => c.type === 'text')?.text
    if (!text || !text.includes(marker)) continue
    const idx = text.indexOf('<!DOCTYPE html>')
    html = idx >= 0 ? text.slice(idx) : text
    if (html.includes(marker)) break
  } catch {
    /* linha inválida */
  }
}

if (!html.includes(marker)) {
  console.error('HTML com const DATA não encontrado no transcript.')
  process.exit(1)
}

const start = html.indexOf(marker)
let i = start + marker.length
while (i < html.length && html[i] !== '{') i++

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

const data = JSON.parse(html.slice(i, end))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(data))
console.log(`Gravado ${outPath} (${data.features?.length ?? 0} features)`)
