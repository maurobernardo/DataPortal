import { hashPassword } from '../lib/auth'
import { createAuthUser, db, ensureUsersTable, findUserByEmail } from '../lib/db'
import { isStrongPassword, normalizeEmail, normalizeText } from '../lib/security'

async function main() {
  await ensureUsersTable()

  const email = normalizeEmail(process.argv[2] || 'admin@data4moz.com')
  const password = normalizeText(process.argv[3], 256)
  const name = normalizeText(process.argv[4] || 'Administrador Principal', 120)

  if (!password) {
    throw new Error('Informe a senha forte no segundo argumento.')
  }

  if (!isStrongPassword(password)) {
    throw new Error('A senha deve ter no mínimo 12 caracteres, maiúscula, minúscula, número e símbolo.')
  }

  const passwordHash = await hashPassword(password)
  const existing = await findUserByEmail(email)

  if (existing) {
    await db.execute(
      `UPDATE users SET name = ?, password_hash = ?, email_verified = 1, role = 'admin', verification_token = NULL, verification_expires = NULL WHERE id = ?`,
      [name, passwordHash, existing.id]
    )
  } else {
    await db.execute(
      `INSERT INTO users (name, email, password_hash, email_verified, role, created_at)
       VALUES (?, ?, ?, 1, 'admin', NOW())`,
      [name, email, passwordHash]
    )
  }

  const user = await findUserByEmail(email)

  console.log('Usuário criado/atualizado:', {
    id: user?.id,
    email: user?.email,
    name: user?.name,
    role: user?.role,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
