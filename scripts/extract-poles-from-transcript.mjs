/**
 * Extract POLES_DATA from agent transcript JSONL (parse message text).
 * Usage: node scripts/extract-poles-from-transcript.mjs [transcript.jsonl]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const transcriptFile =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE || '',
    '.cursor/projects/d-VersaoProData-DataPortal-DataPortal/agent-transcripts/8cbc00e6-09af-4a5e-9f09-3676bf679ad4/8cbc00e6-09af-4a5e-9f09-3676bf679ad4.jsonl'
  )

const outFile = path.join(root, 'public/data/poles-network.json')
const marker = 'const POLES_DATA = '

function extractObject(raw, startIdx) {
  let i = startIdx
  while (i < raw.length && raw[i] !== '{') i++
  let depth = 0
  let inString = false
  let escape = false
  for (let end = i; end < raw.length; end++) {
    const c = raw[end]
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
      if (depth === 0) return raw.slice(i, end + 1)
    }
  }
  return null
}

function findPolesDataInText(text) {
  const idx = text.indexOf(marker)
  if (idx < 0) return null
  const jsonStr = extractObject(text, idx + marker.length)
  if (!jsonStr) return null
  const fixed = jsonStr.replace(/:\s*NaN\b/g, ': null').replace(/,\s*NaN\b/g, ', null')
  return JSON.parse(fixed)
}

if (!fs.existsSync(transcriptFile)) {
  console.error('Transcript not found:', transcriptFile)
  process.exit(1)
}

const lines = fs.readFileSync(transcriptFile, 'utf8').split('\n')
let data = null

for (const line of lines) {
  if (!line.includes('POLES_DATA')) continue
  try {
    const row = JSON.parse(line)
    const parts = row?.message?.content
    if (!Array.isArray(parts)) continue
    for (const part of parts) {
      if (part?.type !== 'text' || typeof part.text !== 'string') continue
      try {
        data = findPolesDataInText(part.text)
        if (data?.rows?.length) break
      } catch (e) {
        console.warn('Parse attempt failed:', e.message)
      }
    }
    if (data?.rows?.length) break
  } catch {
    /* not a json line */
  }
}

if (!data?.rows?.length) {
  console.error('POLES_DATA not found or empty in transcript')
  process.exit(1)
}

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(data))
console.log(
  `Wrote ${outFile} — ${data.rows.length} rows, ${data.provs?.length ?? 0} provinces`
)
