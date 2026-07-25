import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let loaded = false

/** Carrega `.env` e `.env.local` fora do Next.js (scripts tsx, etc.). */
export function loadEnvFiles() {
  if (loaded) return
  loaded = true

  for (const [file, override] of [
    ['.env', false],
    ['.env.local', true],
  ] as const) {
    const filePath = resolve(process.cwd(), file)
    if (!existsSync(filePath)) continue

    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const eq = trimmed.indexOf('=')
      if (eq === -1) continue

      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      if (override || process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }
}

loadEnvFiles()
