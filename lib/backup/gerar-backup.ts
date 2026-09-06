import fs from 'fs'
import { db } from '@/lib/db'

// Pequeno de propósito: há tabelas neste portal com colunas LONGTEXT que guardam narrativas de
// IA Insights inteiras por linha (vistas ao vivo com médias de ~8MB/linha, uma tabela com só 159
// linhas a ocupar 1.3GB no disco) — um lote de 500 dessas linhas tenta hidratar centenas de MB a
// GBs em memória de uma só vez e rebenta o heap do Node (visto ao vivo: "JavaScript heap out of
// memory" a meio de um backup local). Um lote pequeno mantém o pico de memória controlado
// independentemente de quão gorda for uma linha nalguma tabela.
const TAMANHO_LOTE = 25

type LinhaCreateTable = { 'Create Table': string; Table: string }

async function nomesDasTabelas(): Promise<string[]> {
  const [rows] = (await db.query(
    `SELECT table_name AS nome FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name`
  )) as [{ nome: string }[], unknown]
  return rows.map((r) => r.nome)
}

function escrever(stream: fs.WriteStream, texto: string): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.write(texto, (err) => (err ? reject(err) : resolve()))
  })
}

/**
 * Gera um dump SQL completo da base de dados (schema + dados de todas as tabelas) directamente
 * via mysql2, sem depender do binário `mysqldump` — em hosting partilhado (cPanel) não há garantia
 * de que esse binário esteja acessível ao processo Node da aplicação. Escreve em streaming para um
 * ficheiro (nunca junta o dump inteiro em memória) para não rebentar com bases de dados maiores;
 * lê cada tabela em lotes de 500 linhas pela mesma razão.
 */
export async function gerarBackupCompleto(caminhoDestino: string): Promise<{ tabelas: number; tamanhoBytes: number }> {
  const stream = fs.createWriteStream(caminhoDestino, { encoding: 'utf8' })

  await escrever(stream, `-- Backup Data Portal — gerado em ${new Date().toISOString()}\n`)
  await escrever(stream, 'SET FOREIGN_KEY_CHECKS=0;\n\n')

  const tabelas = await nomesDasTabelas()

  for (const tabela of tabelas) {
    const [createRows] = (await db.query(`SHOW CREATE TABLE \`${tabela}\``)) as [LinhaCreateTable[], unknown]
    const createSql = createRows[0]['Create Table']
    await escrever(stream, `-- Tabela: ${tabela}\nDROP TABLE IF EXISTS \`${tabela}\`;\n${createSql};\n\n`)

    let offset = 0
    for (;;) {
      const [linhas] = (await db.query(`SELECT * FROM \`${tabela}\` LIMIT ${TAMANHO_LOTE} OFFSET ${offset}`)) as [
        Record<string, unknown>[],
        unknown,
      ]
      if (linhas.length === 0) break

      const colunas = Object.keys(linhas[0])
      const listaColunas = colunas.map((c) => `\`${c}\``).join(', ')
      // Um INSERT por linha (em vez de agrupar várias linhas num só VALUES): evita reter as
      // strings escapadas de todo o lote em memória ao mesmo tempo que os objectos das linhas.
      for (const linha of linhas) {
        const valoresSql = '(' + colunas.map((c) => db.escape(linha[c])).join(', ') + ')'
        await escrever(stream, `INSERT INTO \`${tabela}\` (${listaColunas}) VALUES ${valoresSql};\n`)
      }

      offset += TAMANHO_LOTE
      if (linhas.length < TAMANHO_LOTE) break
    }
    await escrever(stream, '\n')
  }

  await escrever(stream, 'SET FOREIGN_KEY_CHECKS=1;\n')
  await new Promise<void>((resolve, reject) => stream.end((err?: Error | null) => (err ? reject(err) : resolve())))

  const stats = fs.statSync(caminhoDestino)
  return { tabelas: tabelas.length, tamanhoBytes: stats.size }
}
