/**
 * Descarrega/actualiza a base de dados GeoLite2-City da MaxMind (PLANO-ORIGEM-UTILIZADORES.md).
 *
 * A MaxMind actualiza a GeoLite2 semanalmente; este script corre à mão (ou por cron mensal) para
 * puxar a versão mais recente. Não corre automaticamente no arranque do servidor: descarregar 66MB
 * a cada deploy seria lento e desnecessário — o ficheiro só precisa de ser trocado de vez em
 * quando, não em cada arranque.
 */
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from 'fs'
import { pipeline } from 'stream/promises'
import path from 'path'
import { execSync } from 'child_process'

const DESTINO_DIR = path.join(process.cwd(), 'data', 'geoip')
const DESTINO_MMDB = path.join(DESTINO_DIR, 'GeoLite2-City.mmdb')
const TMP_TAR = path.join(DESTINO_DIR, '_download.tar.gz')
const TMP_EXTRACT = path.join(DESTINO_DIR, '_extract')

async function main() {
  const accountId = process.env.MAXMIND_ACCOUNT_ID
  const licenseKey = process.env.MAXMIND_LICENSE_KEY
  if (!accountId || !licenseKey) {
    throw new Error('Defina MAXMIND_ACCOUNT_ID e MAXMIND_LICENSE_KEY no .env.local antes de correr este script.')
  }

  if (!existsSync(DESTINO_DIR)) mkdirSync(DESTINO_DIR, { recursive: true })

  console.log('A descarregar GeoLite2-City...')
  const url = 'https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=tar.gz'
  const auth = Buffer.from(`${accountId}:${licenseKey}`).toString('base64')
  const resposta = await fetch(url, { headers: { Authorization: `Basic ${auth}` }, redirect: 'follow' })
  if (!resposta.ok || !resposta.body) {
    throw new Error(`Falha ao descarregar: HTTP ${resposta.status}`)
  }
  await pipeline(resposta.body as any, createWriteStream(TMP_TAR))

  console.log('A extrair...')
  if (existsSync(TMP_EXTRACT)) rmSync(TMP_EXTRACT, { recursive: true, force: true })
  mkdirSync(TMP_EXTRACT)
  execSync(`tar -xzf "${TMP_TAR}" -C "${TMP_EXTRACT}"`)

  const pastas = execSync(`ls "${TMP_EXTRACT}"`).toString().trim().split('\n')
  const pastaVersao = pastas.find((p) => p.startsWith('GeoLite2-City'))
  if (!pastaVersao) throw new Error('Estrutura do arquivo descarregado inesperada: pasta GeoLite2-City não encontrada.')

  const mmdbOrigem = path.join(TMP_EXTRACT, pastaVersao, 'GeoLite2-City.mmdb')
  renameSync(mmdbOrigem, DESTINO_MMDB)

  rmSync(TMP_TAR, { force: true })
  rmSync(TMP_EXTRACT, { recursive: true, force: true })

  console.log(`Concluído: ${DESTINO_MMDB}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
