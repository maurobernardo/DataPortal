import './load-env'
import crypto from 'crypto'
import mysql from 'mysql2/promise'
import { normalizeRole } from '@/lib/session'
import { normalizeEmail } from '@/lib/security'
import { logger } from '@/lib/logger'

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error(
    'DATABASE_URL não definido. Configure em .env ou .env.local (ex.: mysql://user:pass@127.0.0.1:3306/dataportal).'
  )
}

const globalForDb = globalThis as unknown as {
  db: mysql.Pool | undefined
}

export const db = globalForDb.db ?? mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Evita ligações presas indefinidamente (ex.: servidor aceita TCP mas nunca completa o
  // handshake MySQL) — falha rápido em vez de bloquear pedidos sem limite de tempo.
  connectTimeout: 10_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
})

// A pool emite 'error' para falhas assíncronas em ligações ociosas (ex.: servidor
// reiniciado, ligação caída). Sem este listener, o processo Node derruba com um
// unhandled error; com ele, apenas regista e deixa a pool recuperar na próxima query.
// (mysql2 emite este evento em runtime, mas os tipos de `Pool` não o declaram.)
;(db as unknown as { on(event: 'error', listener: (err: Error) => void): void }).on('error', (err) => {
  logger.error('db.pool.error', { error: err })
})

export async function checkDatabaseHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const conn = await db.getConnection()
    try {
      await conn.query('SELECT 1')
      return { ok: true }
    } finally {
      conn.release()
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

if (process.env.NODE_ENV !== 'production') globalForDb.db = db

/** Permite o mesmo nome de categoria em tipos diferentes (ex.: Agricultura geo + alfanumérico). */
let categoryCompositeUniqueEnsured = false
export async function ensureCategoryCompositeUnique(): Promise<void> {
  if (categoryCompositeUniqueEnsured) return
  categoryCompositeUniqueEnsured = true
  try {
    const [rows] = (await db.execute(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Category' AND INDEX_NAME = 'Category_name_key'
       LIMIT 1`
    )) as [{ INDEX_NAME?: string }[], unknown]
    if (rows?.length) {
      await db.execute('ALTER TABLE Category DROP INDEX Category_name_key')
    }
  } catch (e) {
    logger.warn('db.category_index_migration_drop_name_only_unique', { error: e })
  }
  try {
    await db.execute(
      'ALTER TABLE Category ADD UNIQUE INDEX Category_name_datatype_key (name, dataType)'
    )
  } catch {
    /* já existe ou ambiente sem permissão */
  }
}

type CacheEntry<T> = { expiresAt: number; value: T }
const DATASETS_CACHE_TTL_MS = 60_000
const datasetsQueryCache = new Map<string, CacheEntry<any[]>>()

function getDatasetsCacheKey(params: Record<string, unknown>) {
  return JSON.stringify(params)
}

function clearDatasetsCache() {
  datasetsQueryCache.clear()
}

// ==================== USER (auth) ====================
let usersTableEnsured = false

export async function ensureUsersTable(): Promise<void> {
  if (usersTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(254) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      email_verified TINYINT(1) NOT NULL DEFAULT 0,
      verification_token VARCHAR(64) NULL,
      verification_expires DATETIME(3) NULL,
      otp_code VARCHAR(6) NULL,
      otp_expires DATETIME(3) NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY users_email_key (email),
      INDEX users_verification_token_idx (verification_token)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )

  try {
    await db.execute(
      `ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'`
    )
  } catch {
    /* coluna role já existe */
  }

  try {
    await db.execute(`ALTER TABLE users ADD COLUMN reset_code VARCHAR(6) NULL`)
  } catch {
    /* coluna já existe */
  }

  try {
    await db.execute(`ALTER TABLE users ADD COLUMN reset_expires DATETIME(3) NULL`)
  } catch {
    /* coluna já existe */
  }

  try {
    await db.execute(`ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20) NULL`)
  } catch {
    /* coluna já existe */
  }

  try {
    await db.execute(`ALTER TABLE users ADD COLUMN oauth_id VARCHAR(191) NULL`)
  } catch {
    /* coluna já existe */
  }

  try {
    await db.execute(`ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL`)
  } catch {
    /* já nullable ou ambiente sem permissão */
  }

  try {
    await db.execute(
      `ALTER TABLE users ADD UNIQUE INDEX users_oauth_provider_id_key (oauth_provider, oauth_id)`
    )
  } catch {
    /* índice já existe */
  }

  try {
    await db.execute(`ALTER TABLE users ADD COLUMN pending_email VARCHAR(254) NULL`)
  } catch {
    /* coluna já existe */
  }
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN pending_email_code VARCHAR(6) NULL`)
  } catch {
    /* coluna já existe */
  }
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN pending_email_expires DATETIME(3) NULL`)
  } catch {
    /* coluna já existe */
  }
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64) NULL`)
  } catch {
    /* coluna já existe */
  }
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN totp_enabled TINYINT(1) NOT NULL DEFAULT 0`)
  } catch {
    /* coluna já existe */
  }
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN totp_backup_codes TEXT NULL`)
  } catch {
    /* coluna já existe */
  }

  try {
    await db.execute(`ALTER TABLE users ADD COLUMN profile_category VARCHAR(30) NULL`)
  } catch {
    /* coluna já existe */
  }

  try {
    await db.execute(`ALTER TABLE users ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1`)
  } catch {
    /* coluna já existe */
  }

  try {
    await db.execute(`ALTER TABLE users ADD COLUMN pedido_eliminacao_em DATETIME(3) NULL`)
  } catch {
    /* coluna já existe */
  }

  try {
    const [legacyRows] = (await db.execute('SELECT COUNT(*) as total FROM users')) as [
      { total: number }[],
      unknown,
    ]
    if (Number(legacyRows[0]?.total ?? 0) === 0) {
      await db.execute(
        `INSERT INTO users (name, email, password_hash, email_verified, role, created_at)
         SELECT name, email, password, 1, 'admin', createdAt FROM User
         ON DUPLICATE KEY UPDATE email = email`
      )
    }
    await db.execute(`UPDATE users SET role = 'admin' WHERE email IN (SELECT email FROM User)`)
  } catch {
    /* tabela User legada pode não existir */
  }

  usersTableEnsured = true
}

export async function findUserByEmail(email: string) {
  await ensureUsersTable()
  const [rows] = (await db.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email])) as [any[], unknown]
  const row = rows[0]
  if (!row) return null
  return {
    ...row,
    password: row.password_hash,
    emailVerified: Boolean(row.email_verified),
    role: normalizeRole(row.role),
  }
}

export async function findUserById(id: number) {
  await ensureUsersTable()
  const [rows] = (await db.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id])) as [any[], unknown]
  const row = rows[0]
  if (!row) return null
  return {
    ...row,
    password: row.password_hash,
    emailVerified: Boolean(row.email_verified),
    role: normalizeRole(row.role),
  }
}

/** Resolve perfil admin a partir da BD, lista ADMIN_EMAILS ou tabela User legada. */
export async function resolveUserRole(userId: number, email: string): Promise<'user' | 'admin'> {
  await ensureUsersTable()

  const [rows] = (await db.execute('SELECT role FROM users WHERE id = ? LIMIT 1', [userId])) as [any[], unknown]
  if (normalizeRole(rows[0]?.role) === 'admin') {
    return 'admin'
  }

  const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean)

  if (adminEmails.includes(normalizeEmail(email))) {
    return 'admin'
  }

  try {
    const [legacyRows] = (await db.execute('SELECT id FROM User WHERE LOWER(email) = ? LIMIT 1', [
      normalizeEmail(email),
    ])) as [any[], unknown]
    if (legacyRows[0]) {
      return 'admin'
    }
  } catch {
    /* tabela User legada pode não existir */
  }

  return 'user'
}

export async function updateUserRole(userId: number, role: 'user' | 'admin') {
  await ensureUsersTable()
  await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId])
}

export async function findAllRegisteredUsers() {
  await ensureUsersTable()
  const [rows] = (await db.execute(
    `SELECT id, name, email, email_verified, role, created_at, active
     FROM users
     ORDER BY created_at DESC`
  )) as [any[], unknown]
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: Boolean(row.email_verified),
    role: normalizeRole(row.role),
    createdAt: row.created_at,
    active: row.active === null || row.active === undefined ? true : Boolean(row.active),
  }))
}

/** Activa/desactiva a conta sem apagar dados: uma conta desactivada não consegue iniciar sessão,
 *  mas mantém histórico, favoritos e análises intactos (ver checkAccountActive em lib/auth.ts). */
export async function setUserActive(userId: number, active: boolean) {
  await ensureUsersTable()
  await db.execute('UPDATE users SET active = ? WHERE id = ?', [active ? 1 : 0, userId])
}

export async function isUserActive(userId: number): Promise<boolean> {
  await ensureUsersTable()
  const [rows] = (await db.execute('SELECT active FROM users WHERE id = ?', [userId])) as [any[], unknown]
  if (!rows[0]) return false
  return rows[0].active === null || rows[0].active === undefined ? true : Boolean(rows[0].active)
}

export async function countRegisteredUsers() {
  await ensureUsersTable()
  const [rows] = (await db.execute('SELECT COUNT(*) as total FROM users')) as [
    { total: number }[],
    unknown,
  ]
  return Number(rows[0]?.total ?? 0)
}

export async function createAuthUser(data: {
  name: string
  email: string
  passwordHash: string
  verificationToken?: string | null
  verificationExpires?: Date | null
  emailVerified?: boolean
  profileCategory?: string | null
}) {
  await ensureUsersTable()
  const [result] = (await db.execute(
    `INSERT INTO users (name, email, password_hash, email_verified, verification_token, verification_expires, profile_category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.email,
      data.passwordHash,
      data.emailVerified ? 1 : 0,
      data.verificationToken ?? null,
      data.verificationExpires ?? null,
      data.profileCategory ?? null,
    ]
  )) as [{ insertId: number }, unknown]
  return findUserById(result.insertId)
}

export async function findUserByVerificationToken(token: string) {
  await ensureUsersTable()
  const [rows] = (await db.execute(
    'SELECT * FROM users WHERE verification_token = ? LIMIT 1',
    [token]
  )) as [any[], unknown]
  return rows[0] || null
}

export async function markEmailVerified(userId: number) {
  await ensureUsersTable()
  await db.execute(
    `UPDATE users
     SET email_verified = 1,
         verification_token = NULL,
         verification_expires = NULL,
         otp_code = NULL,
         otp_expires = NULL
     WHERE id = ?`,
    [userId]
  )
}

export async function setUserVerification(userId: number, token: string, expires: Date) {
  await ensureUsersTable()
  await db.execute(
    'UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?',
    [token, expires, userId]
  )
}

export async function setUserOtp(userId: number, code: string, expires: Date) {
  await ensureUsersTable()
  await db.execute('UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?', [code, expires, userId])
}

export async function clearUserOtp(userId: number) {
  await ensureUsersTable()
  await db.execute('UPDATE users SET otp_code = NULL, otp_expires = NULL WHERE id = ?', [userId])
}

export async function deleteAuthUser(userId: number) {
  await ensureUsersTable()
  await db.execute('DELETE FROM users WHERE id = ?', [userId])
}

const DIAS_GRACA_ELIMINACAO_CONTA = 30

/**
 * Pedido de eliminação de conta (PLANO-SEGURANCA.md): em vez de apagar de imediato, marca a conta
 * com um prazo de graça de 30 dias. A pessoa continua a poder iniciar sessão e cancelar o pedido
 * nesse período — só depois de expirado é que os dados são mesmo removidos (ver
 * `purgarContasComPedidoDeEliminacaoExpirado`). Protege sobretudo contra um pedido feito por engano
 * ou sob coação (sessão comprometida a pedir a própria eliminação).
 */
export async function agendarEliminacaoConta(userId: number): Promise<void> {
  await ensureUsersTable()
  await db.execute('UPDATE users SET pedido_eliminacao_em = NOW() WHERE id = ?', [userId])
}

export async function cancelarEliminacaoConta(userId: number): Promise<void> {
  await ensureUsersTable()
  await db.execute('UPDATE users SET pedido_eliminacao_em = NULL WHERE id = ?', [userId])
}

/** Sem infra de agendamento (cron) neste portal: chamado sob pedido (login, carregamento do painel
 *  de utilizadores) em vez de a um horário fixo — cada chamada é uma consulta indexada barata que,
 *  na generalidade das vezes, não encontra nenhuma conta expirada. */
export async function purgarContasComPedidoDeEliminacaoExpirado(): Promise<number> {
  await ensureUsersTable()
  const [linhas] = (await db.execute(
    `SELECT id FROM users WHERE pedido_eliminacao_em IS NOT NULL
     AND pedido_eliminacao_em < DATE_SUB(NOW(), INTERVAL ${DIAS_GRACA_ELIMINACAO_CONTA} DAY)`
  )) as [{ id: number }[], unknown]
  for (const linha of linhas) {
    await deleteUserAccountData(linha.id)
  }
  return linhas.length
}

/** Elimina os dados pessoais do utilizador (análises de IA guardadas, conta) e anonimiza estatísticas de uso. */
export async function deleteUserAccountData(userId: number) {
  await ensureUsersTable()
  try {
    await db.execute('DELETE FROM AIInsightTile WHERE userId = ?', [userId])
  } catch {
    /* tabela pode não existir ainda */
  }
  try {
    await db.execute('DELETE FROM DatasetUpdateSubscription WHERE userId = ?', [userId])
  } catch {
    /* tabela pode não existir ainda */
  }
  try {
    await db.execute('UPDATE Statistic SET userId = NULL WHERE userId = ?', [userId])
  } catch {
    /* coluna/tabela pode não existir */
  }
  await deleteAuthUser(userId)
}

export async function getUserExportData(userId: number) {
  await ensureUsersTable()
  const user = await findUserById(userId)
  if (!user) return null

  let tiles: any[] = []
  try {
    const [rows] = (await db.execute(
      'SELECT title, question, datasetIds, shareToken, createdAt FROM AIInsightTile WHERE userId = ? ORDER BY createdAt DESC',
      [userId]
    )) as [any[], unknown]
    tiles = rows
  } catch {
    /* tabela pode não existir */
  }

  return {
    perfil: {
      nome: user.name,
      email: user.email,
      funcao: user.role,
      emailVerificado: Boolean(user.emailVerified),
      criadaEm: user.created_at,
    },
    analisesGuardadas: tiles,
  }
}

export async function setUserResetCode(userId: number, code: string, expires: Date) {
  await ensureUsersTable()
  await db.execute('UPDATE users SET reset_code = ?, reset_expires = ? WHERE id = ?', [
    code,
    expires,
    userId,
  ])
}

export async function clearUserResetCode(userId: number) {
  await ensureUsersTable()
  await db.execute('UPDATE users SET reset_code = NULL, reset_expires = NULL WHERE id = ?', [userId])
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  await ensureUsersTable()
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId])
}

export async function updateUserName(userId: number, name: string) {
  await ensureUsersTable()
  await db.execute('UPDATE users SET name = ? WHERE id = ?', [name, userId])
}

export async function setPendingEmailChange(
  userId: number,
  newEmail: string,
  code: string,
  expiresAt: Date
) {
  await ensureUsersTable()
  await db.execute(
    'UPDATE users SET pending_email = ?, pending_email_code = ?, pending_email_expires = ? WHERE id = ?',
    [newEmail, code, expiresAt, userId]
  )
}

export async function clearPendingEmailChange(userId: number) {
  await ensureUsersTable()
  await db.execute(
    'UPDATE users SET pending_email = NULL, pending_email_code = NULL, pending_email_expires = NULL WHERE id = ?',
    [userId]
  )
}

export async function confirmPendingEmailChange(userId: number, newEmail: string) {
  await ensureUsersTable()
  await db.execute(
    'UPDATE users SET email = ?, pending_email = NULL, pending_email_code = NULL, pending_email_expires = NULL WHERE id = ?',
    [newEmail, userId]
  )
}

export async function setUserTotpSecret(userId: number, secret: string, backupCodes: string[]) {
  await ensureUsersTable()
  await db.execute('UPDATE users SET totp_secret = ?, totp_backup_codes = ?, totp_enabled = 0 WHERE id = ?', [
    secret,
    JSON.stringify(backupCodes),
    userId,
  ])
}

export async function enableUserTotp(userId: number) {
  await ensureUsersTable()
  await db.execute('UPDATE users SET totp_enabled = 1 WHERE id = ?', [userId])
}

export async function disableUserTotp(userId: number) {
  await ensureUsersTable()
  await db.execute(
    'UPDATE users SET totp_enabled = 0, totp_secret = NULL, totp_backup_codes = NULL WHERE id = ?',
    [userId]
  )
}

export async function consumeUserTotpBackupCode(userId: number, remainingCodes: string[]) {
  await ensureUsersTable()
  await db.execute('UPDATE users SET totp_backup_codes = ? WHERE id = ?', [
    JSON.stringify(remainingCodes),
    userId,
  ])
}

export async function findUserByOAuth(provider: string, oauthId: string) {
  await ensureUsersTable()
  const [rows] = (await db.execute(
    'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ? LIMIT 1',
    [provider, oauthId]
  )) as [any[], unknown]
  const row = rows[0]
  if (!row) return null
  return {
    ...row,
    password: row.password_hash,
    emailVerified: Boolean(row.email_verified),
    role: normalizeRole(row.role),
  }
}

export async function createOAuthUser(data: {
  name: string
  email: string
  provider: string
  oauthId: string
}) {
  await ensureUsersTable()
  const [result] = (await db.execute(
    `INSERT INTO users (name, email, password_hash, email_verified, role, oauth_provider, oauth_id)
     VALUES (?, ?, NULL, 1, 'user', ?, ?)`,
    [data.name, data.email, data.provider, data.oauthId]
  )) as [{ insertId: number }, unknown]
  return findUserById(result.insertId)
}

export async function linkOAuthToUser(userId: number, provider: string, oauthId: string) {
  await ensureUsersTable()
  await db.execute(
    'UPDATE users SET oauth_provider = ?, oauth_id = ?, email_verified = 1 WHERE id = ?',
    [provider, oauthId, userId]
  )
}

// ==================== CATEGORY ====================
/** Quantos datasets existem por categoria (nome), juntando geoespacial + alfanumérico da mesma
 *  categoria — para a página de Serviços mostrar que temas o portal já cobre de facto, em vez de
 *  inventar sectores sem dados por trás. */
export async function contarDatasetsPorCategoria(): Promise<{ nome: string; total: number }[]> {
  const [rows] = (await db.execute(
    `SELECT c.name AS nome, COUNT(d.id) AS total
     FROM Category c
     JOIN Dataset d ON d.categoryId = c.id
     GROUP BY c.name
     HAVING total > 0
     ORDER BY total DESC`
  )) as [any[], unknown]
  return rows.map((r: any) => ({ nome: r.nome, total: Number(r.total) }))
}

export async function findAllCategories() {
  await ensureCategoryCompositeUnique()
  const [rows] = await db.execute('SELECT * FROM Category ORDER BY name ASC') as any
  return rows
}

export async function findCategoriesByDataType(dataType: string) {
  await ensureCategoryCompositeUnique()
  const [rows] = await db.execute('SELECT * FROM Category WHERE dataType = ? ORDER BY name ASC', [
    dataType,
  ]) as any
  return rows
}

export async function findCategoryById(id: number) {
  const [rows] = await db.execute('SELECT * FROM Category WHERE id = ? LIMIT 1', [id]) as any
  return rows[0] || null
}

export async function createCategory(data: { name: string; description?: string | null; dataType?: string }) {
  await ensureCategoryCompositeUnique()
  const [result] = await db.execute(
    'INSERT INTO Category (name, description, dataType, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
    [data.name, data.description || null, data.dataType || 'geoespacial']
  ) as any
  return findCategoryById(result.insertId)
}

export async function updateCategory(id: number, data: { name?: string; description?: string | null; dataType?: string }) {
  await db.execute(
    'UPDATE Category SET name = COALESCE(?, name), description = COALESCE(?, description), dataType = COALESCE(?, dataType), updatedAt = NOW() WHERE id = ?',
    [data.name || null, data.description || null, data.dataType || null, id]
  )
  return findCategoryById(id)
}

/**
 * Nunca apaga uma categoria ainda usada por datasets: sem esta verificação, um dataset ficava com
 * categoryId a apontar para uma categoria inexistente ("órfão"), e a ligação (LEFT JOIN) que traz
 * a categoria em findDatasets() passava a devolver tudo null — em qualquer sítio que mostre a
 * categoria (ex.: a lista de escolha de datasets em "Nova análise"), isso aparecia como "Sem
 * categoria" sem explicação nenhuma. A chave estrangeira na base de dados já bloqueia isto, mas dá
 * um erro SQL cru; esta verificação dá um erro claro antes mesmo de chegar lá.
 */
export async function deleteCategory(id: number): Promise<{ ok: true } | { ok: false; erro: string; totalDatasets: number }> {
  const [rows] = (await db.execute('SELECT COUNT(*) as total FROM Dataset WHERE categoryId = ?', [id])) as [
    { total: number }[],
    unknown,
  ]
  const totalDatasets = Number(rows[0]?.total ?? 0)
  if (totalDatasets > 0) {
    return {
      ok: false,
      erro: `Esta categoria tem ${totalDatasets} dataset(s) associado(s); mude-os de categoria antes de a eliminar.`,
      totalDatasets,
    }
  }
  await db.execute('DELETE FROM Category WHERE id = ?', [id])
  return { ok: true }
}

// ==================== DATASET PREVIEW METADATA (badge, miniatura, mapa geral) ====================
let datasetPreviewColumnsEnsured = false

export async function ensureDatasetPreviewColumns(): Promise<void> {
  if (datasetPreviewColumnsEnsured) return
  datasetPreviewColumnsEnsured = true
  const columns: [string, string][] = [
    ['previewAvailable', 'TINYINT(1) NULL'],
    ['bboxMinX', 'DOUBLE NULL'],
    ['bboxMinY', 'DOUBLE NULL'],
    ['bboxMaxX', 'DOUBLE NULL'],
    ['bboxMaxY', 'DOUBLE NULL'],
    ['certificacao', "VARCHAR(30) NOT NULL DEFAULT 'nao_verificado'"],
    ['resumoIA', 'TEXT NULL'],
    ['resumoIAGeradoEm', 'DATETIME(3) NULL'],
  ]
  for (const [name, def] of columns) {
    try {
      await db.execute(`ALTER TABLE Dataset ADD COLUMN ${name} ${def}`)
    } catch {
      /* coluna já existe */
    }
  }
}

export async function setDatasetPreviewMeta(
  id: number,
  meta: { previewAvailable: boolean; bbox?: [number, number, number, number] | null }
) {
  await ensureDatasetPreviewColumns()
  await db.execute(
    `UPDATE Dataset SET previewAvailable = ?, bboxMinX = ?, bboxMinY = ?, bboxMaxX = ?, bboxMaxY = ? WHERE id = ?`,
    [
      meta.previewAvailable ? 1 : 0,
      meta.bbox?.[0] ?? null,
      meta.bbox?.[1] ?? null,
      meta.bbox?.[2] ?? null,
      meta.bbox?.[3] ?? null,
      id,
    ]
  )
  clearDatasetsCache()
}

// ==================== DATASET ====================
export async function findDatasets(params: {
  dataType?: string
  categoryId?: number
  search?: string
  source?: string
  format?: string
  year?: number
  yearFrom?: number
  yearTo?: number
  sortOrder?: string
  offset?: number
  take?: number
}) {
  await ensureDatasetPreviewColumns()
  const cacheKey = getDatasetsCacheKey(params as Record<string, unknown>)
  const cached = datasetsQueryCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const { dataType, categoryId, search, source, format, year, yearFrom, yearTo, sortOrder, offset = 0, take = 10 } = params
  const conditions: string[] = []
  const values: any[] = []

  if (dataType) { conditions.push('d.dataType = ?'); values.push(dataType) }
  if (categoryId) { conditions.push('d.categoryId = ?'); values.push(categoryId) }
  if (format) { conditions.push('d.format = ?'); values.push(format) }
  if (source) { conditions.push('d.source = ?'); values.push(source) }
  if (year) { conditions.push('d.year = ?'); values.push(year) }
  if (yearFrom) { conditions.push('d.year >= ?'); values.push(yearFrom) }
  if (yearTo) { conditions.push('d.year <= ?'); values.push(yearTo) }
  if (search) {
    conditions.push('(d.title LIKE ? OR d.description LIKE ? OR d.keywords LIKE ?)')
    values.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const hasSearch = !!search?.trim()
  const order = sortOrder === 'oldest' ? 'ORDER BY d.year ASC'
    : sortOrder === 'newest' ? 'ORDER BY d.year DESC'
    : hasSearch
    ? 'ORDER BY relevance DESC, d.views DESC, d.downloads DESC'
    : 'ORDER BY d.views DESC, d.downloads DESC'

  const selectRelevance = hasSearch
    ? `, (
        (CASE WHEN d.title LIKE ? THEN 3 ELSE 0 END) +
        (CASE WHEN d.description LIKE ? THEN 2 ELSE 0 END) +
        (CASE WHEN d.keywords LIKE ? THEN 1 ELSE 0 END)
      ) AS relevance`
    : ''

  const relevanceValues = hasSearch ? [`%${search}%`, `%${search}%`, `%${search}%`] : []

  values.push(offset, take)
  const whereBind = values.slice(0, values.length - 2)
  const limitBind = values.slice(values.length - 2)
  // Os `?` da expressão relevance aparecem no SELECT antes do WHERE; a ordem dos parâmetros tem de seguir o SQL.
  const sqlParams = hasSearch
    ? [...relevanceValues, ...whereBind, ...limitBind]
    : [...whereBind, ...limitBind]

  const [rows] = await db.execute(
    `SELECT d.*${selectRelevance}, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType
     FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id
     ${where} ${order} LIMIT ?, ?`,
    sqlParams
  ) as any

  const mapped = rows.map((r: any) => ({
    ...r,
    category: { id: r.cat_id, name: r.cat_name, description: r.cat_desc, dataType: r.cat_dataType }
  }))

  datasetsQueryCache.set(cacheKey, {
    expiresAt: Date.now() + DATASETS_CACHE_TTL_MS,
    value: mapped,
  })

  return mapped
}

/**
 * Datasets relacionados para sugestão no preview: prioriza a mesma categoria (mais provável de
 * ser cruzável/comparável) e completa com o mesmo tipo de dados quando a categoria tem poucos
 * outros datasets, ordenado por popularidade.
 */
export async function findRelatedDatasets(dataset: { id: number; categoryId?: number | null; dataType: string }, limit = 4) {
  const sameCategory = dataset.categoryId
    ? ((await db.execute(
        `SELECT d.id, d.title, d.format, d.dataType, c.name as cat_name
         FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id
         WHERE d.categoryId = ? AND d.id != ?
         ORDER BY d.views DESC, d.downloads DESC LIMIT ?`,
        [dataset.categoryId, dataset.id, limit]
      )) as any)[0]
    : []

  let related = sameCategory as any[]
  if (related.length < limit) {
    const excludeIds = [dataset.id, ...related.map((r) => r.id)]
    const placeholders = excludeIds.map(() => '?').join(',')
    const [rows] = (await db.execute(
      `SELECT d.id, d.title, d.format, d.dataType, c.name as cat_name
       FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id
       WHERE d.dataType = ? AND d.id NOT IN (${placeholders})
       ORDER BY d.views DESC, d.downloads DESC LIMIT ?`,
      [dataset.dataType, ...excludeIds, limit - related.length]
    )) as any
    related = [...related, ...rows]
  }

  return related.map((r) => ({ id: r.id, title: r.title, format: r.format, dataType: r.dataType, category: r.cat_name }))
}

export async function findDatasetById(id: number) {
  await ensureDatasetPreviewColumns()
  const [rows] = await db.execute(
    `SELECT d.*, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType
     FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id WHERE d.id = ? LIMIT 1`,
    [id]
  ) as any
  if (!rows[0]) return null
  const r = rows[0]
  return { ...r, category: { id: r.cat_id, name: r.cat_name, description: r.cat_desc, dataType: r.cat_dataType } }
}

export async function createDataset(data: any) {
  const [result] = await db.execute(
    `INSERT INTO Dataset (title, description, categoryId, source, year, format, fileSize, filePath, geometry, coverage, minimumUnit, keywords, dataType, views, downloads, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW(), NOW())`,
    [data.title, data.description, data.categoryId, data.source || '', data.year || new Date().getFullYear(),
     data.format, data.fileSize || '', data.filePath || '', data.geometry || null,
     data.coverage || null, data.minimumUnit || null, data.keywords || null, data.dataType || 'geoespacial']
  ) as any
  clearDatasetsCache()
  return findDatasetById(result.insertId)
}

export async function updateDataset(id: number, data: any, editadoPor?: string) {
  // Regista a versão anterior antes de sobrescrever (PLANO-SEGURANCA.md): sem isto, uma edição por
  // engano ou maliciosa some sem deixar rasto de "como era antes". Nunca bloqueia a actualização —
  // é best-effort, tal como a lixeira de eliminação.
  try {
    await ensureDatasetVersaoTable()
    const [antesRows] = (await db.execute('SELECT * FROM Dataset WHERE id = ?', [id])) as [any[], unknown]
    if (antesRows[0]) {
      await db.execute(
        'INSERT INTO DatasetVersao (datasetId, dados, editadoPor) VALUES (?, ?, ?)',
        [id, JSON.stringify(antesRows[0]), editadoPor || 'sistema']
      )
    }
  } catch (erro) {
    logger.error('erro_registar_versao_dataset', { error: erro, id })
  }

  await db.execute(
    `UPDATE Dataset SET title=?, description=?, categoryId=?, source=?, year=?, format=?, fileSize=?, filePath=?,
     geometry=?, coverage=?, minimumUnit=?, keywords=?, dataType=?, updatedAt=NOW() WHERE id=?`,
    [data.title, data.description, data.categoryId, data.source, data.year, data.format,
     data.fileSize, data.filePath, data.geometry || null, data.coverage || null,
     data.minimumUnit || null, data.keywords || null, data.dataType || 'geoespacial', id]
  )
  clearDatasetsCache()
  return findDatasetById(id)
}

// ---------------------------------------------------------------------------
// Versionamento de datasets: histórico de edições, cada uma recuperável.
// ---------------------------------------------------------------------------

let datasetVersaoTableEnsured = false
async function ensureDatasetVersaoTable() {
  if (datasetVersaoTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS DatasetVersao (
      id INT NOT NULL AUTO_INCREMENT,
      datasetId INT NOT NULL,
      dados JSON NOT NULL,
      editadoPor VARCHAR(254) NOT NULL,
      criadoEm DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX datasetversao_datasetid_idx (datasetId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  datasetVersaoTableEnsured = true
}

export async function listarVersoesDataset(datasetId: number) {
  await ensureDatasetVersaoTable()
  const [rows] = (await db.execute(
    `SELECT id, dados, editadoPor, criadoEm FROM DatasetVersao WHERE datasetId = ? ORDER BY criadoEm DESC LIMIT 50`,
    [datasetId]
  )) as [any[], unknown]
  return rows.map((r) => {
    const dados = typeof r.dados === 'string' ? JSON.parse(r.dados) : r.dados
    return {
      versaoId: r.id,
      editadoPor: r.editadoPor,
      criadoEm: r.criadoEm,
      titulo: dados.title,
      descricao: dados.description,
      ano: dados.year,
      filePath: dados.filePath,
    }
  })
}

/** Versão pública do histórico, para a ficha de proveniência no detalhe do dataset (visível a
 *  qualquer visitante, não só ao admin): mostra o que mudou e quando, mas nunca quem editou —
 *  `editadoPor` guarda o email de um administrador e não deve ficar exposto fora do painel admin. */
export async function listarVersoesPublicas(datasetId: number, limite = 10) {
  const versoes = await listarVersoesDataset(datasetId)
  return versoes.slice(0, limite).map((v) => ({
    versaoId: v.versaoId,
    criadoEm: v.criadoEm,
    titulo: v.titulo,
    ano: v.ano,
  }))
}

/** Repõe os campos de uma versão anterior no dataset actual (o próprio restauro fica também
 *  registado como uma nova versão, pela chamada normal a updateDataset). */
export async function restaurarVersaoDataset(versaoId: number, restauradoPor: string) {
  await ensureDatasetVersaoTable()
  const [rows] = (await db.execute('SELECT * FROM DatasetVersao WHERE id = ?', [versaoId])) as [any[], unknown]
  const linha = rows[0]
  if (!linha) return { ok: false as const, erro: 'Versão não encontrada.' }

  const dados = typeof linha.dados === 'string' ? JSON.parse(linha.dados) : linha.dados
  await updateDataset(linha.datasetId, dados, `${restauradoPor} (restauro da versão #${versaoId})`)
  return { ok: true as const, id: linha.datasetId }
}

// ---------------------------------------------------------------------------
// Certificação de proveniência: distingue fonte oficial confirmada de não verificada ainda.
// ---------------------------------------------------------------------------

export type CertificacaoDataset = 'nao_verificado' | 'fonte_oficial_confirmada'

export async function definirCertificacaoDataset(id: number, certificacao: CertificacaoDataset) {
  await ensureDatasetPreviewColumns()
  await db.execute('UPDATE Dataset SET certificacao = ? WHERE id = ?', [certificacao, id])
  clearDatasetsCache()
}

let lixeiraDatasetTableEnsured = false
async function ensureLixeiraDatasetTable() {
  if (lixeiraDatasetTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS LixeiraDataset (
      id INT NOT NULL AUTO_INCREMENT,
      datasetId INT NOT NULL,
      dados JSON NOT NULL,
      eliminadoPor VARCHAR(254) NOT NULL,
      eliminadoEm DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      restauradoEm DATETIME(3) NULL,
      PRIMARY KEY (id),
      INDEX lixeiradataset_datasetid_idx (datasetId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  lixeiraDatasetTableEnsured = true
}

/**
 * Eliminação de dataset passou a ser em duas fases (PLANO-SEGURANCA.md): isto nunca apaga a linha
 * directamente — copia-a primeiro para uma lixeira (`LixeiraDataset`, com o registo completo em
 * JSON) e só depois remove da tabela principal. Um admin comprometido que apague um dataset por
 * engano ou de forma maliciosa deixa sempre uma cópia recuperável, em vez de o dado desaparecer
 * de imediato e sem hipótese de recurso dentro da própria aplicação.
 */
export async function deleteDataset(id: number, eliminadoPor: string) {
  await ensureLixeiraDatasetTable()
  const [rows] = (await db.execute('SELECT * FROM Dataset WHERE id = ?', [id])) as [any[], unknown]
  const registo = rows[0]
  if (!registo) return

  await db.execute(
    'INSERT INTO LixeiraDataset (datasetId, dados, eliminadoPor) VALUES (?, ?, ?)',
    [id, JSON.stringify(registo), eliminadoPor]
  )
  await db.execute('DELETE FROM Dataset WHERE id = ?', [id])
  clearDatasetsCache()
}

export async function listarLixeiraDatasets() {
  await ensureLixeiraDatasetTable()
  const [rows] = (await db.execute(
    `SELECT id, datasetId, dados, eliminadoPor, eliminadoEm
     FROM LixeiraDataset WHERE restauradoEm IS NULL ORDER BY eliminadoEm DESC LIMIT 200`
  )) as [any[], unknown]
  return rows
    .map((r) => {
      // Sem try/catch, uma única linha com "dados" corrompido rebentava a página /admin/lixeira
      // inteira — mesmo padrão de bug já encontrado e corrigido em getAiInsightTendencias.
      let dados: any
      try {
        dados = typeof r.dados === 'string' ? JSON.parse(r.dados) : r.dados
      } catch {
        return null
      }
      return {
        lixeiraId: r.id,
        datasetId: r.datasetId,
        titulo: dados?.title,
        categoriaId: dados?.categoryId,
        dataType: dados?.dataType,
        eliminadoPor: r.eliminadoPor,
        eliminadoEm: r.eliminadoEm,
      }
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
}

/** Repõe um dataset eliminado com o mesmo id e todos os campos originais. Falha (e explica porquê)
 *  se, entretanto, já tiver sido criado outro dataset com esse mesmo id. */
export async function restaurarDatasetDaLixeira(lixeiraId: number): Promise<{ ok: true; id: number } | { ok: false; erro: string }> {
  await ensureLixeiraDatasetTable()
  const [rows] = (await db.execute(
    'SELECT * FROM LixeiraDataset WHERE id = ? AND restauradoEm IS NULL',
    [lixeiraId]
  )) as [any[], unknown]
  const linha = rows[0]
  if (!linha) return { ok: false, erro: 'Registo da lixeira não encontrado (pode já ter sido restaurado).' }

  const dados = typeof linha.dados === 'string' ? JSON.parse(linha.dados) : linha.dados

  const [existente] = (await db.execute('SELECT id FROM Dataset WHERE id = ?', [dados.id])) as [any[], unknown]
  if (existente[0]) {
    return { ok: false, erro: 'Já existe um dataset com este id; não é possível restaurar automaticamente.' }
  }

  await db.execute(
    `INSERT INTO Dataset
     (id, title, description, categoryId, source, year, format, fileSize, filePath, geometry, coverage,
      minimumUnit, keywords, dataType, views, downloads, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      dados.id, dados.title, dados.description, dados.categoryId, dados.source, dados.year, dados.format,
      dados.fileSize, dados.filePath, dados.geometry, dados.coverage, dados.minimumUnit, dados.keywords,
      dados.dataType, dados.views ?? 0, dados.downloads ?? 0, dados.createdAt,
    ]
  )
  await db.execute('UPDATE LixeiraDataset SET restauradoEm = NOW() WHERE id = ?', [lixeiraId])
  clearDatasetsCache()
  return { ok: true, id: dados.id }
}

/** Remoção definitiva e irreversível de um registo já na lixeira — a única acção deste módulo que
 *  não deixa nenhuma cópia recuperável, por isso exige que o admin já tenha passado pela lixeira. */
export async function eliminarDatasetDefinitivamente(lixeiraId: number): Promise<void> {
  await ensureLixeiraDatasetTable()
  await db.execute('DELETE FROM LixeiraDataset WHERE id = ?', [lixeiraId])
}

export async function incrementDatasetViews(id: number) {
  await db.execute('UPDATE Dataset SET views = views + 1 WHERE id = ?', [id])
}

export async function incrementDatasetDownloads(id: number) {
  await db.execute('UPDATE Dataset SET downloads = downloads + 1 WHERE id = ?', [id])
}

// ==================== ESTATÍSTICA DIÁRIA DO PORTAL (alertas de limiar aos admins) ====================
let dailyUsageTableEnsured = false
async function ensureDailyUsageTable() {
  if (dailyUsageTableEnsured) return
  dailyUsageTableEnsured = true
  await db.execute(
    `CREATE TABLE IF NOT EXISTS DailyUsageStat (
      date DATE NOT NULL,
      views INT NOT NULL DEFAULT 0,
      downloads INT NOT NULL DEFAULT 0,
      viewsAlertedThreshold INT NOT NULL DEFAULT 0,
      downloadsAlertedThreshold INT NOT NULL DEFAULT 0,
      PRIMARY KEY (date)
    )`
  )
}

/** Incrementa o contador diário do portal (visualizações ou downloads, agregados de todos os
 * datasets) e devolve o total do dia e o último limiar já alertado, para o chamador decidir se
 * cruzou um novo limiar. */
export async function incrementDailyUsage(
  kind: 'views' | 'downloads'
): Promise<{ count: number; alertedThreshold: number } | null> {
  await ensureDailyUsageTable()

  if (kind === 'views') {
    await db.execute(
      `INSERT INTO DailyUsageStat (date, views) VALUES (CURDATE(), 1)
       ON DUPLICATE KEY UPDATE views = views + 1`
    )
  } else {
    await db.execute(
      `INSERT INTO DailyUsageStat (date, downloads) VALUES (CURDATE(), 1)
       ON DUPLICATE KEY UPDATE downloads = downloads + 1`
    )
  }

  const [rows] = (await db.execute(
    `SELECT views, downloads, viewsAlertedThreshold, downloadsAlertedThreshold FROM DailyUsageStat WHERE date = CURDATE()`
  )) as [any[], unknown]
  const row = rows[0]
  if (!row) return null

  return kind === 'views'
    ? { count: Number(row.views), alertedThreshold: Number(row.viewsAlertedThreshold) }
    : { count: Number(row.downloads), alertedThreshold: Number(row.downloadsAlertedThreshold) }
}

export async function markDailyUsageAlerted(kind: 'views' | 'downloads', threshold: number) {
  await ensureDailyUsageTable()
  if (kind === 'views') {
    await db.execute('UPDATE DailyUsageStat SET viewsAlertedThreshold = ? WHERE date = CURDATE()', [threshold])
  } else {
    await db.execute('UPDATE DailyUsageStat SET downloadsAlertedThreshold = ? WHERE date = CURDATE()', [threshold])
  }
}

export async function countDatasets() {
  const [rows] = await db.execute('SELECT COUNT(*) as total FROM Dataset') as any
  return rows[0].total
}

/** Contagens reais por serviço, para a página /servicos — cada número no directório vem daqui,
 *  nunca escrito à mão. */
export async function contarServicos(): Promise<{
  geoespaciais: number
  alfanumericos: number
  mapas: number
  dashboards: number
  relatorios: number
}> {
  const [[geo], [alfa], [dash], [rel]] = await Promise.all([
    db.execute(`SELECT COUNT(*) as total FROM Dataset WHERE dataType = 'geoespacial'`) as any,
    db.execute(`SELECT COUNT(*) as total FROM Dataset WHERE dataType = 'alfanumerico'`) as any,
    db.execute(`SELECT COUNT(*) as total FROM AlphanumericDashboard`) as any,
    db.execute(`SELECT COUNT(*) as total FROM Report`) as any,
  ])
  return {
    geoespaciais: Number(geo[0]?.total ?? 0),
    alfanumericos: Number(alfa[0]?.total ?? 0),
    mapas: 0, // preenchido no chamador a partir de MAP_CATALOG (fonte real: lib/maps-catalog.ts)
    dashboards: Number(dash[0]?.total ?? 0),
    relatorios: Number(rel[0]?.total ?? 0),
  }
}

export async function findDatasetsByIds(ids: number[]) {
  if (ids.length === 0) return []
  await ensureDatasetPreviewColumns()
  const placeholders = ids.map(() => '?').join(',')
  const [rows] = await db.execute(
    `SELECT d.*, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType
     FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id WHERE d.id IN (${placeholders})`,
    ids
  ) as any
  return rows.map((r: any) => ({
    ...r,
    category: { id: r.cat_id, name: r.cat_name, description: r.cat_desc, dataType: r.cat_dataType },
  }))
}

/** Bbox em cache (colunas bboxMinX/Y/MaxX/Y) para os datasets geoespaciais que já a têm calculada. */
export async function findGeoDatasetFootprints(params: {
  categoryId?: number
  search?: string
  source?: string
  format?: string
  year?: number
  yearFrom?: number
  yearTo?: number
}) {
  await ensureDatasetPreviewColumns()
  const { categoryId, search, source, format, year, yearFrom, yearTo } = params
  const conditions: string[] = ["d.dataType = 'geoespacial'", 'd.bboxMinX IS NOT NULL']
  const values: any[] = []
  if (categoryId) { conditions.push('d.categoryId = ?'); values.push(categoryId) }
  if (format) { conditions.push('d.format = ?'); values.push(format) }
  if (source) { conditions.push('d.source = ?'); values.push(source) }
  if (year) { conditions.push('d.year = ?'); values.push(year) }
  if (yearFrom) { conditions.push('d.year >= ?'); values.push(yearFrom) }
  if (yearTo) { conditions.push('d.year <= ?'); values.push(yearTo) }
  if (search) {
    conditions.push('(d.title LIKE ? OR d.description LIKE ? OR d.keywords LIKE ?)')
    values.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  const [rows] = await db.execute(
    `SELECT d.id, d.title, d.format, d.bboxMinX, d.bboxMinY, d.bboxMaxX, d.bboxMaxY,
            c.name as cat_name
     FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id
     WHERE ${conditions.join(' AND ')}
     LIMIT 500`,
    values
  ) as any
  return rows as {
    id: number
    title: string
    format: string
    bboxMinX: number
    bboxMinY: number
    bboxMaxX: number
    bboxMaxY: number
    cat_name: string
  }[]
}

// ==================== DATASET FAVORITES ====================
let datasetFavoritesTableEnsured = false
async function ensureDatasetFavoritesTable() {
  if (datasetFavoritesTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS DatasetFavorite (
      id INT NOT NULL AUTO_INCREMENT,
      userId INT NOT NULL,
      datasetId INT NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY DatasetFavorite_user_dataset_key (userId, datasetId),
      INDEX DatasetFavorite_userId_idx (userId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  datasetFavoritesTableEnsured = true
}

export async function addDatasetFavorite(userId: number, datasetId: number) {
  await ensureDatasetFavoritesTable()
  await db.execute(
    'INSERT IGNORE INTO DatasetFavorite (userId, datasetId) VALUES (?, ?)',
    [userId, datasetId]
  )
}

export async function removeDatasetFavorite(userId: number, datasetId: number) {
  await ensureDatasetFavoritesTable()
  await db.execute('DELETE FROM DatasetFavorite WHERE userId = ? AND datasetId = ?', [userId, datasetId])
}

export async function findFavoriteDatasetIds(userId: number): Promise<number[]> {
  await ensureDatasetFavoritesTable()
  const [rows] = (await db.execute('SELECT datasetId FROM DatasetFavorite WHERE userId = ?', [
    userId,
  ])) as [{ datasetId: number }[], unknown]
  return rows.map((r) => r.datasetId)
}

export async function findFavoriteDatasets(userId: number) {
  await ensureDatasetFavoritesTable()
  await ensureDatasetPreviewColumns()
  const [rows] = await db.execute(
    `SELECT d.*, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType,
            f.createdAt as favoritedAt
     FROM DatasetFavorite f
     INNER JOIN Dataset d ON d.id = f.datasetId
     LEFT JOIN Category c ON d.categoryId = c.id
     WHERE f.userId = ?
     ORDER BY f.createdAt DESC`,
    [userId]
  ) as any
  return rows.map((r: any) => ({
    ...r,
    category: { id: r.cat_id, name: r.cat_name, description: r.cat_desc, dataType: r.cat_dataType },
  }))
}

// ==================== STATISTIC ====================
let statisticUserIdEnsured = false

export async function ensureStatisticUserIdColumn() {
  if (statisticUserIdEnsured) return
  statisticUserIdEnsured = true
  try {
    await db.execute('ALTER TABLE Statistic ADD COLUMN userId INT NULL')
  } catch {
    /* coluna já existe */
  }
  try {
    await db.execute('CREATE INDEX Statistic_userId_idx ON Statistic (userId)')
  } catch {
    /* índice já existe */
  }
}

export async function createStatistic(
  datasetId: number,
  type: 'view' | 'download',
  userId?: number | null
) {
  await ensureStatisticUserIdColumn()
  await db.execute(
    'INSERT INTO Statistic (datasetId, type, userId, createdAt) VALUES (?, ?, ?, NOW())',
    [datasetId, type, userId ?? null]
  )
}

export async function getAuthenticatedActivity(limit = 50) {
  await ensureStatisticUserIdColumn()
  const [rows] = (await db.execute(
    `SELECT
       s.id,
       s.type,
       s.createdAt,
       u.id as userId,
       u.name as userName,
       u.email as userEmail,
       d.id as datasetId,
       d.title as datasetTitle
     FROM Statistic s
     INNER JOIN users u ON u.id = s.userId
     INNER JOIN Dataset d ON d.id = s.datasetId
     WHERE s.userId IS NOT NULL
     ORDER BY s.createdAt DESC
     LIMIT ?`,
    [limit]
  )) as [any[], unknown]
  return rows
}

// ==================== REPORT ====================
let reportSectorColumnEnsured = false

/** Sector (Saúde, Agricultura, Educação…) para filtrar relatórios por tema — coluna nova,
 *  adicionada de forma idempotente como o resto das colunas opcionais deste ficheiro. */
async function ensureReportSectorColumn(): Promise<void> {
  if (reportSectorColumnEnsured) return
  reportSectorColumnEnsured = true
  try {
    await db.execute(`ALTER TABLE Report ADD COLUMN sector VARCHAR(80) NULL`)
  } catch {
    /* coluna já existe */
  }
}

export async function findAllReports() {
  await ensureReportSectorColumn()
  const [rows] = await db.execute('SELECT * FROM Report ORDER BY createdAt DESC') as any
  return rows
}

export async function findReportById(id: number) {
  await ensureReportSectorColumn()
  const [rows] = await db.execute('SELECT * FROM Report WHERE id = ? LIMIT 1', [id]) as any
  return rows[0] || null
}

export async function createReport(data: any) {
  await ensureReportSectorColumn()
  const [result] = await db.execute(
    'INSERT INTO Report (title, year, coverage, author, partners, filePath, fileSize, detailsText, sector, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [data.title, data.year, data.coverage, data.author || null, data.partners || null, data.filePath || null, data.fileSize || null, data.detailsText || null, data.sector || null]
  ) as any
  return findReportById(result.insertId)
}

export async function updateReport(id: number, data: any) {
  await ensureReportSectorColumn()
  await db.execute(
    'UPDATE Report SET title=?, year=?, coverage=?, author=?, partners=?, filePath=?, fileSize=?, detailsText=?, sector=?, updatedAt=NOW() WHERE id=?',
    [data.title, data.year, data.coverage, data.author || null, data.partners || null, data.filePath || null, data.fileSize || null, data.detailsText || null, data.sector || null, id]
  )
  return findReportById(id)
}

export async function deleteReport(id: number) {
  await db.execute('DELETE FROM Report WHERE id = ?', [id])
}

export async function createReportRequest(
  reportId: number,
  contact?: { name?: string | null; email?: string | null; message?: string | null }
) {
  await ensureReportRequestTable()
  await db.execute(
    'INSERT INTO ReportRequest (reportId, name, email, message, createdAt) VALUES (?, ?, ?, ?, NOW())',
    [reportId, contact?.name || null, contact?.email || null, contact?.message || null]
  )
}

let reportRequestTableEnsured = false
async function ensureReportRequestTable() {
  if (reportRequestTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS ReportRequest (
      id INTEGER NOT NULL AUTO_INCREMENT,
      reportId INTEGER NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX ReportRequest_reportId_idx (reportId),
      INDEX ReportRequest_createdAt_idx (createdAt)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  for (const [name, def] of [
    ['name', 'VARCHAR(120) NULL'],
    ['email', 'VARCHAR(254) NULL'],
    ['message', 'TEXT NULL'],
  ] as [string, string][]) {
    try {
      await db.execute(`ALTER TABLE ReportRequest ADD COLUMN ${name} ${def}`)
    } catch {
      /* coluna já existe */
    }
  }
  reportRequestTableEnsured = true
}

// ==================== ENTITY FAVORITES (dashboards, relatórios, mapas) ====================
export type EntityType = 'dashboard' | 'report' | 'map'

let entityFavoriteTableEnsured = false
async function ensureEntityFavoriteTable() {
  if (entityFavoriteTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS EntityFavorite (
      id INT NOT NULL AUTO_INCREMENT,
      userId INT NOT NULL,
      entityType VARCHAR(20) NOT NULL,
      entityId VARCHAR(64) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY EntityFavorite_user_entity_key (userId, entityType, entityId),
      INDEX EntityFavorite_userId_idx (userId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  entityFavoriteTableEnsured = true
}

export async function addEntityFavorite(userId: number, entityType: EntityType, entityId: string) {
  await ensureEntityFavoriteTable()
  await db.execute(
    'INSERT IGNORE INTO EntityFavorite (userId, entityType, entityId) VALUES (?, ?, ?)',
    [userId, entityType, entityId]
  )
}

export async function removeEntityFavorite(userId: number, entityType: EntityType, entityId: string) {
  await ensureEntityFavoriteTable()
  await db.execute('DELETE FROM EntityFavorite WHERE userId = ? AND entityType = ? AND entityId = ?', [
    userId,
    entityType,
    entityId,
  ])
}

export async function findEntityFavoriteIds(userId: number, entityType: EntityType): Promise<string[]> {
  await ensureEntityFavoriteTable()
  const [rows] = (await db.execute(
    'SELECT entityId FROM EntityFavorite WHERE userId = ? AND entityType = ?',
    [userId, entityType]
  )) as [{ entityId: string }[], unknown]
  return rows.map((r) => r.entityId)
}

/** Objectos completos apenas para os tipos com tabela própria (dashboard/report); 'map' devolve só os ids (o catálogo é estático). */
export async function findEntityFavorites(userId: number, entityType: EntityType) {
  await ensureEntityFavoriteTable()
  if (entityType === 'dashboard') {
    await ensureAlphanumericDashboardTable()
    const [rows] = await db.execute(
      `SELECT d.* FROM EntityFavorite f
       INNER JOIN AlphanumericDashboard d ON d.id = f.entityId
       WHERE f.userId = ? AND f.entityType = 'dashboard'
       ORDER BY f.createdAt DESC`,
      [userId]
    ) as any
    return rows
  }
  if (entityType === 'report') {
    const [rows] = await db.execute(
      `SELECT r.* FROM EntityFavorite f
       INNER JOIN Report r ON r.id = f.entityId
       WHERE f.userId = ? AND f.entityType = 'report'
       ORDER BY f.createdAt DESC`,
      [userId]
    ) as any
    return rows
  }
  return findEntityFavoriteIds(userId, 'map')
}

// ==================== MAPAS INTELIGENTES (catálogo estático — só estatísticas) ====================
let mapStatTableEnsured = false
async function ensureMapStatTable() {
  if (mapStatTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS MapStat (
      id INT NOT NULL AUTO_INCREMENT,
      slug VARCHAR(80) NOT NULL,
      type VARCHAR(20) NOT NULL,
      userId INT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX MapStat_slug_idx (slug),
      INDEX MapStat_slug_type_idx (slug, type)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  mapStatTableEnsured = true
}

export async function recordMapStat(slug: string, type: 'view' | 'request', userId?: number | null) {
  await ensureMapStatTable()
  await db.execute('INSERT INTO MapStat (slug, type, userId) VALUES (?, ?, ?)', [slug, type, userId ?? null])
}

export async function getMapViewCounts(): Promise<Record<string, number>> {
  await ensureMapStatTable()
  const [rows] = (await db.execute(
    `SELECT slug, COUNT(*) as total FROM MapStat WHERE type = 'view' GROUP BY slug`
  )) as [{ slug: string; total: number }[], unknown]
  const out: Record<string, number> = {}
  for (const r of rows) out[r.slug] = Number(r.total)
  return out
}

let mapRequestTableEnsured = false
async function ensureMapRequestTable() {
  if (mapRequestTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS MapRequest (
      id INT NOT NULL AUTO_INCREMENT,
      slug VARCHAR(80) NOT NULL,
      name VARCHAR(120) NULL,
      email VARCHAR(254) NULL,
      message TEXT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX MapRequest_slug_idx (slug)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  mapRequestTableEnsured = true
}

export async function createMapRequest(data: {
  slug: string
  name?: string | null
  email?: string | null
  message?: string | null
}) {
  await ensureMapRequestTable()
  await db.execute('INSERT INTO MapRequest (slug, name, email, message) VALUES (?, ?, ?, ?)', [
    data.slug,
    data.name || null,
    data.email || null,
    data.message || null,
  ])
}

/**
 * Sobreposição editável (via admin) dos metadados dos mapas estáticos definidos em
 * lib/maps-catalog.ts. Não permite criar novos "tipos" de mapa (cada um tem um componente
 * de dashboard próprio) — só editar título/descrição/badges/etc. dos 4 mapas existentes,
 * sem precisar de um novo deploy.
 */
export type MapOverrideRow = {
  slug: string
  title: string | null
  subtitle: string | null
  description: string | null
  coverage: string | null
  category: string | null
  badgesJson: string | null
  highlightsJson: string | null
  featured: number | null
  heroStatValue: string | null
  heroStatLabel: string | null
  updatedAt: string
}

let mapOverrideTableEnsured = false
async function ensureMapOverrideTable() {
  if (mapOverrideTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS MapOverride (
      slug VARCHAR(80) NOT NULL,
      title VARCHAR(255) NULL,
      subtitle VARCHAR(255) NULL,
      description TEXT NULL,
      coverage VARCHAR(255) NULL,
      category VARCHAR(120) NULL,
      badgesJson TEXT NULL,
      highlightsJson TEXT NULL,
      featured TINYINT(1) NULL,
      heroStatValue VARCHAR(40) NULL,
      heroStatLabel VARCHAR(80) NULL,
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (slug)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  mapOverrideTableEnsured = true
}

export async function findAllMapOverrides(): Promise<MapOverrideRow[]> {
  await ensureMapOverrideTable()
  const [rows] = (await db.execute('SELECT * FROM MapOverride')) as [MapOverrideRow[], unknown]
  return rows
}

export async function findMapOverride(slug: string): Promise<MapOverrideRow | null> {
  await ensureMapOverrideTable()
  const [rows] = (await db.execute('SELECT * FROM MapOverride WHERE slug = ? LIMIT 1', [slug])) as [
    MapOverrideRow[],
    unknown
  ]
  return rows[0] || null
}

export async function upsertMapOverride(
  slug: string,
  data: {
    title?: string | null
    subtitle?: string | null
    description?: string | null
    coverage?: string | null
    category?: string | null
    badgesJson?: string | null
    highlightsJson?: string | null
    featured?: boolean | null
    heroStatValue?: string | null
    heroStatLabel?: string | null
  }
) {
  await ensureMapOverrideTable()
  await db.execute(
    `INSERT INTO MapOverride (slug, title, subtitle, description, coverage, category, badgesJson, highlightsJson, featured, heroStatValue, heroStatLabel)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title), subtitle = VALUES(subtitle), description = VALUES(description),
       coverage = VALUES(coverage), category = VALUES(category), badgesJson = VALUES(badgesJson),
       highlightsJson = VALUES(highlightsJson), featured = VALUES(featured),
       heroStatValue = VALUES(heroStatValue), heroStatLabel = VALUES(heroStatLabel)`,
    [
      slug,
      data.title ?? null,
      data.subtitle ?? null,
      data.description ?? null,
      data.coverage ?? null,
      data.category ?? null,
      data.badgesJson ?? null,
      data.highlightsJson ?? null,
      data.featured == null ? null : data.featured ? 1 : 0,
      data.heroStatValue ?? null,
      data.heroStatLabel ?? null,
    ]
  )
}

export async function deleteMapOverride(slug: string) {
  await ensureMapOverrideTable()
  await db.execute('DELETE FROM MapOverride WHERE slug = ?', [slug])
}

export async function countReportRequests(): Promise<number> {
  await ensureReportRequestTable()
  const [rows] = (await db.execute('SELECT COUNT(*) as total FROM ReportRequest')) as any
  return Number(rows[0]?.total ?? 0)
}

// ==================== CONTACT ====================
let contactMessagePurposeColumnEnsured = false
async function ensureContactMessagePurposeColumn(): Promise<void> {
  if (contactMessagePurposeColumnEnsured) return
  contactMessagePurposeColumnEnsured = true
  try {
    await db.execute(`ALTER TABLE ContactMessage ADD COLUMN purpose VARCHAR(60) NULL`)
  } catch {
    /* coluna já existe */
  }
}

export async function createContactMessage(data: { name: string; email: string; subject: string; message: string; purpose?: string | null }) {
  await ensureContactMessagePurposeColumn()
  await db.execute(
    'INSERT INTO ContactMessage (name, email, subject, message, purpose, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
    [data.name, data.email, data.subject, data.message, data.purpose ?? null]
  )
}

export async function findAllContactMessages(limit = 100) {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)))
  const [rows] = await db.execute(
    `SELECT * FROM ContactMessage ORDER BY createdAt DESC LIMIT ${safeLimit}`
  ) as any
  return rows
}

// ==================== ADMIN: LISTAGEM DE SOLICITAÇÕES ====================
export async function findAllReportRequestsWithDetails(limit = 100) {
  await ensureReportRequestTable()
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)))
  const [rows] = await db.execute(
    `SELECT rr.id, rr.reportId, rr.name, rr.email, rr.message, rr.createdAt, r.title as reportTitle, r.year as reportYear
     FROM ReportRequest rr
     LEFT JOIN Report r ON r.id = rr.reportId
     ORDER BY rr.createdAt DESC
     LIMIT ${safeLimit}`
  ) as any
  return rows
}

export async function findAllMapRequests(limit = 100) {
  await ensureMapRequestTable()
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)))
  const [rows] = await db.execute(
    `SELECT * FROM MapRequest ORDER BY createdAt DESC LIMIT ${safeLimit}`
  ) as any
  return rows
}

// ==================== ALPHANUMERIC DASHBOARD ====================
let alphaDashboardTableEnsured = false
async function ensureAlphanumericDashboardTable() {
  if (alphaDashboardTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS AlphanumericDashboard (
      id INTEGER NOT NULL AUTO_INCREMENT,
      name VARCHAR(191) NOT NULL,
      dashboardUrl TEXT NOT NULL,
      description TEXT NULL,
      previewImagePath TEXT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  try {
    await db.execute('ALTER TABLE AlphanumericDashboard ADD COLUMN previewImagePath TEXT NULL')
  } catch {
    // Coluna já existe em ambientes atualizados.
  }
  try {
    await db.execute('ALTER TABLE AlphanumericDashboard ADD COLUMN category VARCHAR(191) NULL')
  } catch {
    // Coluna já existe em ambientes atualizados.
  }
  try {
    await db.execute('ALTER TABLE AlphanumericDashboard ADD COLUMN views INT NOT NULL DEFAULT 0')
  } catch {
    // Coluna já existe em ambientes atualizados.
  }
  try {
    await db.execute('ALTER TABLE AlphanumericDashboard ADD COLUMN lastDataUpdate DATE NULL')
  } catch {
    // Coluna já existe em ambientes atualizados.
  }
  alphaDashboardTableEnsured = true
}

export type AlphanumericDashboardRecord = {
  id: number
  name: string
  dashboardUrl: string
  description: string | null
  previewImagePath: string | null
  category: string | null
  views: number
  lastDataUpdate: string | null
  createdAt: string
  updatedAt: string
}

export async function findAllAlphanumericDashboards() {
  await ensureAlphanumericDashboardTable()
  const [rows] = await db.execute(
    'SELECT * FROM AlphanumericDashboard ORDER BY views DESC, createdAt DESC'
  ) as any
  return rows
}

/** Em destaque: os N dashboards com mais cliques em «Ver mais» (campo views). */
export async function findTopAlphanumericDashboardsByViews(limit = 2) {
  await ensureAlphanumericDashboardTable()
  const safeLimit = Math.max(1, Math.min(20, Math.floor(limit)))
  const [rows] = await db.execute(
    `SELECT * FROM AlphanumericDashboard ORDER BY views DESC, createdAt DESC LIMIT ${safeLimit}`
  ) as any
  return rows
}

/** +1 por clique no botão «Ver mais» (galeria, destaque ou secções). */
export async function incrementAlphanumericDashboardViews(id: number) {
  await ensureAlphanumericDashboardTable()
  await db.execute('UPDATE AlphanumericDashboard SET views = views + 1, updatedAt = NOW() WHERE id = ?', [
    id,
  ])
  return findAlphanumericDashboardById(id)
}

export async function findAlphanumericDashboardById(id: number) {
  await ensureAlphanumericDashboardTable()
  const [rows] = await db.execute('SELECT * FROM AlphanumericDashboard WHERE id = ? LIMIT 1', [id]) as any
  return rows[0] || null
}

export async function createAlphanumericDashboard(data: {
  name: string
  dashboardUrl: string
  description?: string | null
  previewImagePath?: string | null
  category?: string | null
  lastDataUpdate?: string | null
}) {
  await ensureAlphanumericDashboardTable()
  const [result] = await db.execute(
    'INSERT INTO AlphanumericDashboard (name, dashboardUrl, description, previewImagePath, category, lastDataUpdate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [
      data.name,
      data.dashboardUrl,
      data.description || null,
      data.previewImagePath || null,
      data.category || null,
      data.lastDataUpdate || null,
    ]
  ) as any
  return findAlphanumericDashboardById(result.insertId)
}

export async function updateAlphanumericDashboard(
  id: number,
  data: {
    name: string
    dashboardUrl: string
    description?: string | null
    previewImagePath?: string | null
    category?: string | null
    lastDataUpdate?: string | null
  }
) {
  await ensureAlphanumericDashboardTable()
  await db.execute(
    'UPDATE AlphanumericDashboard SET name=?, dashboardUrl=?, description=?, previewImagePath=?, category=?, lastDataUpdate=?, updatedAt=NOW() WHERE id=?',
    [
      data.name,
      data.dashboardUrl,
      data.description || null,
      data.previewImagePath || null,
      data.category || null,
      data.lastDataUpdate || null,
      id,
    ]
  )
  return findAlphanumericDashboardById(id)
}

export async function deleteAlphanumericDashboard(id: number) {
  await ensureAlphanumericDashboardTable()
  await db.execute('DELETE FROM AlphanumericDashboard WHERE id = ?', [id])
}

// ==================== AI INSIGHT TILES (dashboards guardados) ====================
let aiInsightTilesTableEnsured = false
async function ensureAiInsightTilesTable() {
  if (aiInsightTilesTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS AIInsightTile (
      id INT NOT NULL AUTO_INCREMENT,
      userId INT NOT NULL,
      title VARCHAR(191) NOT NULL,
      question TEXT NOT NULL,
      datasetIds TEXT NOT NULL,
      resultJson LONGTEXT NOT NULL,
      shareToken VARCHAR(64) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY AIInsightTile_shareToken_key (shareToken),
      INDEX AIInsightTile_userId_idx (userId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  aiInsightTilesTableEnsured = true
}

export type AIInsightTileRow = {
  id: number
  userId: number
  title: string
  question: string
  datasetIds: string
  resultJson: string
  shareToken: string
  createdAt: string
}

export async function createAiInsightTile(data: {
  userId: number
  title: string
  question: string
  datasetIds: number[]
  result: unknown
}) {
  await ensureAiInsightTilesTable()
  const shareToken = crypto.randomBytes(16).toString('hex')
  const [result] = (await db.execute(
    'INSERT INTO AIInsightTile (userId, title, question, datasetIds, resultJson, shareToken) VALUES (?, ?, ?, ?, ?, ?)',
    [
      data.userId,
      data.title,
      data.question,
      JSON.stringify(data.datasetIds),
      JSON.stringify(data.result),
      shareToken,
    ]
  )) as [{ insertId: number }, unknown]
  return findAiInsightTileById(result.insertId, data.userId)
}

export async function findAiInsightTilesByUser(userId: number): Promise<AIInsightTileRow[]> {
  await ensureAiInsightTilesTable()
  const [rows] = (await db.execute(
    'SELECT * FROM AIInsightTile WHERE userId = ? ORDER BY createdAt DESC',
    [userId]
  )) as [AIInsightTileRow[], unknown]
  return rows
}

export async function findAiInsightTileById(id: number, userId: number): Promise<AIInsightTileRow | null> {
  await ensureAiInsightTilesTable()
  const [rows] = (await db.execute('SELECT * FROM AIInsightTile WHERE id = ? AND userId = ? LIMIT 1', [
    id,
    userId,
  ])) as [AIInsightTileRow[], unknown]
  return rows[0] || null
}

export async function findAiInsightTileByShareToken(token: string): Promise<AIInsightTileRow | null> {
  await ensureAiInsightTilesTable()
  const [rows] = (await db.execute('SELECT * FROM AIInsightTile WHERE shareToken = ? LIMIT 1', [
    token,
  ])) as [AIInsightTileRow[], unknown]
  return rows[0] || null
}

export async function deleteAiInsightTile(id: number, userId: number) {
  await ensureAiInsightTilesTable()
  await db.execute('DELETE FROM AIInsightTile WHERE id = ? AND userId = ?', [id, userId])
}

// ==================== AI INSIGHT QUERIES (registo de utilização) ====================
let aiInsightQueriesTableEnsured = false
async function ensureAiInsightQueriesTable() {
  if (aiInsightQueriesTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS AIInsightQuery (
      id INT NOT NULL AUTO_INCREMENT,
      userId INT NOT NULL,
      question TEXT NOT NULL,
      datasetIds TEXT NOT NULL,
      confidence VARCHAR(20) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX AIInsightQuery_userId_idx (userId),
      INDEX AIInsightQuery_createdAt_idx (createdAt)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  aiInsightQueriesTableEnsured = true
}

export async function logAiInsightQuery(data: {
  userId: number
  question: string
  datasetIds: number[]
  confidence?: string | null
}) {
  await ensureAiInsightQueriesTable()
  await db.execute(
    'INSERT INTO AIInsightQuery (userId, question, datasetIds, confidence) VALUES (?, ?, ?, ?)',
    [data.userId, data.question, JSON.stringify(data.datasetIds), data.confidence || null]
  )
}

/**
 * Junta as duas fontes de consultas de IA: AIInsightQuery (a ferramenta antiga, "/ai-insights",
 * entretanto descontinuada) e `analises` (o motor de análise profunda actual, "/analise/nova").
 * Sem esta união, o painel ficava parado na última data em que alguém usou a ferramenta antiga,
 * mesmo com uso activo todos os dias na nova.
 */
export async function getAiInsightUsageSummary() {
  await ensureAiInsightQueriesTable()

  const [totals] = (await db.execute(
    `SELECT COUNT(*) as totalQueries, COUNT(DISTINCT userId) as totalUsers,
       SUM(CASE WHEN createdAt >= DATE(NOW()) THEN 1 ELSE 0 END) as todayQueries
     FROM (
       SELECT userId, createdAt FROM AIInsightQuery
       UNION ALL
       SELECT utilizador_id as userId, criado_em as createdAt FROM analises WHERE utilizador_id IS NOT NULL
     ) t`
  )) as [{ totalQueries: number; totalUsers: number; todayQueries: number }[], unknown]

  const [byUser] = (await db.execute(
    `SELECT u.id as userId, u.name, u.email,
       COUNT(t.createdAt) as totalQueries,
       SUM(CASE WHEN t.createdAt >= DATE(NOW()) THEN 1 ELSE 0 END) as todayQueries,
       MAX(t.createdAt) as lastQueryAt
     FROM (
       SELECT userId, createdAt FROM AIInsightQuery
       UNION ALL
       SELECT utilizador_id as userId, criado_em as createdAt FROM analises WHERE utilizador_id IS NOT NULL
     ) t
     JOIN users u ON u.id = t.userId
     GROUP BY u.id, u.name, u.email
     ORDER BY totalQueries DESC
     LIMIT 50`
  )) as [any[], unknown]

  const [recent] = (await db.execute(
    `SELECT t.id, t.question, t.createdAt, u.name, u.email FROM (
       SELECT CAST(id AS CHAR) as id, CONVERT(question USING utf8mb4) COLLATE utf8mb4_unicode_ci as question, userId, createdAt FROM AIInsightQuery
       UNION ALL
       SELECT CAST(id AS CHAR) as id, CONVERT(pergunta USING utf8mb4) COLLATE utf8mb4_unicode_ci as question, utilizador_id as userId, criado_em as createdAt FROM analises WHERE utilizador_id IS NOT NULL
     ) t
     JOIN users u ON u.id = t.userId
     ORDER BY t.createdAt DESC
     LIMIT 30`
  )) as [any[], unknown]

  const tendencias = await getAiInsightTendencias()

  return {
    totals: totals[0] ?? { totalQueries: 0, totalUsers: 0, todayQueries: 0 },
    byUser,
    recent,
    tendencias,
  }
}

const ROTULO_ARQUETIPO: Record<string, string> = {
  exploratorio: 'Exploratório',
  comparativo: 'Comparativo',
  temporal: 'Tendência temporal',
  geoespacial: 'Geoespacial',
  ranking: 'Ranking / extremos',
  diagnostico: 'Diagnóstico',
  preditivo: 'Preditivo',
  executivo: 'Resumo executivo',
  monitorizacao: 'Monitorização',
  narrativo: 'Narrativo',
}

/**
 * Tendências de uso do motor de análise por TIPO de pergunta e por CATEGORIA de dataset — não por
 * texto literal repetido (uma tabela de "perguntas iguais" fica quase sempre vazia, porque
 * raramente duas pessoas escrevem a mesma pergunta palavra por palavra). Isto usa classificação
 * que o próprio motor já produz por análise (arquétipo, Parte 1 da compreensão) e os datasets
 * realmente usados — nenhuma instrumentação nova, só agregação melhor do que já existe.
 *
 * `arquetipo` só existe em `analises` (o motor actual) — a ferramenta antiga (AIInsightQuery)
 * nunca classificou a pergunta, por isso entra na contagem por dataset/categoria mas não na de
 * arquétipo, em vez de lhe atribuir uma classificação inventada.
 */
export async function getAiInsightTendencias() {
  const [analisesRows] = (await db.execute(
    `SELECT arquetipo, datasets_ids FROM analises WHERE datasets_ids IS NOT NULL`
  )) as [any[], unknown]
  const [legadoRows] = (await db.execute(
    `SELECT datasetIds FROM AIInsightQuery`
  )) as [any[], unknown]

  const porArquetipo = new Map<string, number>()
  const porDataset = new Map<number, number>()

  for (const r of analisesRows) {
    if (r.arquetipo) porArquetipo.set(r.arquetipo, (porArquetipo.get(r.arquetipo) || 0) + 1)
    // Sem try/catch, uma única linha antiga com datasets_ids malformado (encontrado ao vivo em
    // produção) rebentava a página inteira de /dashboard/ia-utilizacao com "Application error" —
    // o mesmo padrão de defesa já usado no loop de legadoRows logo abaixo.
    let ids: number[] = []
    try {
      ids = typeof r.datasets_ids === 'string' ? JSON.parse(r.datasets_ids) : r.datasets_ids || []
    } catch {
      continue
    }
    for (const id of ids) porDataset.set(id, (porDataset.get(id) || 0) + 1)
  }
  for (const r of legadoRows) {
    let ids: number[] = []
    try {
      ids = JSON.parse(r.datasetIds)
    } catch {
      continue
    }
    for (const id of ids) porDataset.set(id, (porDataset.get(id) || 0) + 1)
  }

  const datasetIdsUnicos = Array.from(porDataset.keys())
  const datasetsInfo = datasetIdsUnicos.length > 0 ? await findDatasetsByIds(datasetIdsUnicos) : []
  const infoPorId = new Map<number, any>(datasetsInfo.map((d: any) => [d.id, d]))

  const porCategoria = new Map<string, number>()
  porDataset.forEach((total, id) => {
    const nomeCategoria = infoPorId.get(id)?.category?.name || 'Sem categoria'
    porCategoria.set(nomeCategoria, (porCategoria.get(nomeCategoria) || 0) + total)
  })

  return {
    porArquetipo: Array.from(porArquetipo.entries())
      .map(([arquetipo, total]) => ({ arquetipo, rotulo: ROTULO_ARQUETIPO[arquetipo] || arquetipo, total }))
      .sort((a, b) => b.total - a.total),
    porCategoriaDataset: Array.from(porCategoria.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total),
    porDataset: Array.from(porDataset.entries())
      .map(([datasetId, total]) => ({
        datasetId,
        titulo: infoPorId.get(datasetId)?.title || `Dataset #${datasetId}`,
        categoria: infoPorId.get(datasetId)?.category?.name || 'Sem categoria',
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15),
  }
}

// ==================== DATASET UPDATE SUBSCRIPTIONS (alertas) ====================
let datasetUpdateSubscriptionTableEnsured = false
async function ensureDatasetUpdateSubscriptionTable() {
  if (datasetUpdateSubscriptionTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS DatasetUpdateSubscription (
      id INT NOT NULL AUTO_INCREMENT,
      userId INT NOT NULL,
      datasetId INT NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY DatasetUpdateSubscription_user_dataset_key (userId, datasetId),
      INDEX DatasetUpdateSubscription_datasetId_idx (datasetId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  datasetUpdateSubscriptionTableEnsured = true
}

export async function subscribeToDatasetUpdates(userId: number, datasetId: number) {
  await ensureDatasetUpdateSubscriptionTable()
  await db.execute('INSERT IGNORE INTO DatasetUpdateSubscription (userId, datasetId) VALUES (?, ?)', [
    userId,
    datasetId,
  ])
}

export async function unsubscribeFromDatasetUpdates(userId: number, datasetId: number) {
  await ensureDatasetUpdateSubscriptionTable()
  await db.execute('DELETE FROM DatasetUpdateSubscription WHERE userId = ? AND datasetId = ?', [
    userId,
    datasetId,
  ])
}

export async function isSubscribedToDatasetUpdates(userId: number, datasetId: number): Promise<boolean> {
  await ensureDatasetUpdateSubscriptionTable()
  const [rows] = (await db.execute(
    'SELECT id FROM DatasetUpdateSubscription WHERE userId = ? AND datasetId = ? LIMIT 1',
    [userId, datasetId]
  )) as [{ id: number }[], unknown]
  return rows.length > 0
}

export async function findDatasetUpdateSubscriberEmails(datasetId: number): Promise<string[]> {
  await ensureDatasetUpdateSubscriptionTable()
  const [rows] = (await db.execute(
    `SELECT u.email FROM DatasetUpdateSubscription s
     JOIN users u ON u.id = s.userId
     WHERE s.datasetId = ?`,
    [datasetId]
  )) as [{ email: string }[], unknown]
  return rows.map((r) => r.email)
}

/**
 * Alertas proactivos (PLANO-INTELIGENCIA-PORTAL.md): quem já fez uma análise de IA usando este
 * dataset, mesmo sem ter subscrito nada explicitamente. Uma pessoa por conta (a análise mais
 * recente sobre o dataset), para não mandar vários emails ao mesmo utilizador na mesma
 * actualização. `datasetIds` é guardado como JSON (`[3,7]`), por isso o filtro é feito em JS
 * depois de carregar as linhas, não com LIKE sobre o texto bruto.
 */
export async function findUsuariosComAnaliseSobreDataset(
  datasetId: number
): Promise<{ email: string; pergunta: string; datasetIdsRaw: string }[]> {
  await ensureAiInsightTilesTable()
  const [rows] = (await db.execute(
    `SELECT t.userId, t.question, t.datasetIds, u.email
     FROM AIInsightTile t JOIN users u ON u.id = t.userId
     ORDER BY t.createdAt DESC`
  )) as [any[], unknown]

  const vistos = new Set<number>()
  const resultado: { email: string; pergunta: string; datasetIdsRaw: string }[] = []
  for (const r of rows) {
    if (vistos.has(r.userId)) continue
    let ids: number[] = []
    try {
      ids = JSON.parse(r.datasetIds)
    } catch {
      continue
    }
    if (!ids.includes(datasetId)) continue
    vistos.add(r.userId)
    resultado.push({ email: r.email, pergunta: r.question, datasetIdsRaw: r.datasetIds })
  }
  return resultado
}