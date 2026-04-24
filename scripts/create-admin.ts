import bcrypt from 'bcryptjs'
import { isStrongPassword, normalizeEmail, normalizeText } from '../lib/security'
import { db } from '../lib/db'

async function main() {
  const email = normalizeEmail(process.argv[2] || 'admin@data4moz.com')
  const password = normalizeText(process.argv[3], 256)
  const name = normalizeText(process.argv[4] || 'Administrador Principal', 120)

  if (!password) {
    throw new Error('Informe a senha forte no segundo argumento.')
  }

  if (!isStrongPassword(password)) {
    throw new Error('A senha deve ter no mínimo 12 caracteres, maiúscula, minúscula, número e símbolo.')
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await db.execute(
    `INSERT INTO User (email, password, name, createdAt, updatedAt)
     VALUES (?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE updatedAt = NOW()`,
    [email, hashedPassword, name]
  )

  const [rows] = await db.execute('SELECT id, email, name FROM User WHERE email = ? LIMIT 1', [email]) as any
  const user = rows[0]

  console.log('Usuário criado/atualizado:', {
    id: user.id,
    email: user.email,
    name: user.name,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {})













