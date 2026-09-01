import '../lib/load-env'
import { db } from '../lib/db'

async function main() {
  const [rows] = (await db.execute(
    "SELECT id, title, format, filePath, views FROM Dataset WHERE dataType = 'geoespacial' ORDER BY views DESC LIMIT 20"
  )) as [any[], unknown]
  for (const r of rows) console.log(r.id, '|', r.format, '|', r.title, '|', r.filePath)
  await db.end()
}
main()
