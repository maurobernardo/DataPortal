import './load-env'
import mysql from 'mysql2/promise'
import { normalizeRole } from '@/lib/session'
import { normalizeEmail } from '@/lib/security'

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
})

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
    console.warn('[db] Category index migration (drop name-only unique):', e)
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
    `SELECT id, name, email, email_verified, role, created_at
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
  }))
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
}) {
  await ensureUsersTable()
  const [result] = (await db.execute(
    `INSERT INTO users (name, email, password_hash, email_verified, verification_token, verification_expires)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.email,
      data.passwordHash,
      data.emailVerified ? 1 : 0,
      data.verificationToken ?? null,
      data.verificationExpires ?? null,
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

// ==================== CATEGORY ====================
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

export async function deleteCategory(id: number) {
  await db.execute('DELETE FROM Category WHERE id = ?', [id])
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
    ? 'ORDER BY relevance DESC, d.downloads DESC, d.views DESC'
    : 'ORDER BY d.downloads DESC, d.views DESC'

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

export async function findDatasetById(id: number) {
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

export async function updateDataset(id: number, data: any) {
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

export async function deleteDataset(id: number) {
  await db.execute('DELETE FROM Dataset WHERE id = ?', [id])
  clearDatasetsCache()
}

export async function incrementDatasetViews(id: number) {
  await db.execute('UPDATE Dataset SET views = views + 1 WHERE id = ?', [id])
}

export async function incrementDatasetDownloads(id: number) {
  await db.execute('UPDATE Dataset SET downloads = downloads + 1 WHERE id = ?', [id])
}

export async function countDatasets() {
  const [rows] = await db.execute('SELECT COUNT(*) as total FROM Dataset') as any
  return rows[0].total
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
export async function findAllReports() {
  const [rows] = await db.execute('SELECT * FROM Report ORDER BY createdAt DESC') as any
  return rows
}

export async function findReportById(id: number) {
  const [rows] = await db.execute('SELECT * FROM Report WHERE id = ? LIMIT 1', [id]) as any
  return rows[0] || null
}

export async function createReport(data: any) {
  const [result] = await db.execute(
    'INSERT INTO Report (title, year, coverage, author, partners, filePath, fileSize, detailsText, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [data.title, data.year, data.coverage, data.author || null, data.partners || null, data.filePath || null, data.fileSize || null, data.detailsText || null]
  ) as any
  return findReportById(result.insertId)
}

export async function updateReport(id: number, data: any) {
  await db.execute(
    'UPDATE Report SET title=?, year=?, coverage=?, author=?, partners=?, filePath=?, fileSize=?, detailsText=?, updatedAt=NOW() WHERE id=?',
    [data.title, data.year, data.coverage, data.author || null, data.partners || null, data.filePath || null, data.fileSize || null, data.detailsText || null, id]
  )
  return findReportById(id)
}

export async function deleteReport(id: number) {
  await db.execute('DELETE FROM Report WHERE id = ?', [id])
}

export async function createReportRequest(reportId: number) {
  await ensureReportRequestTable()
  await db.execute(
    'INSERT INTO ReportRequest (reportId, createdAt) VALUES (?, NOW())',
    [reportId]
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
  reportRequestTableEnsured = true
}

export async function countReportRequests(): Promise<number> {
  await ensureReportRequestTable()
  const [rows] = (await db.execute('SELECT COUNT(*) as total FROM ReportRequest')) as any
  return Number(rows[0]?.total ?? 0)
}

// ==================== CONTACT ====================
export async function createContactMessage(data: { name: string; email: string; subject: string; message: string }) {
  await db.execute(
    'INSERT INTO ContactMessage (name, email, subject, message, createdAt) VALUES (?, ?, ?, ?, NOW())',
    [data.name, data.email, data.subject, data.message]
  )
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
}) {
  await ensureAlphanumericDashboardTable()
  const [result] = await db.execute(
    'INSERT INTO AlphanumericDashboard (name, dashboardUrl, description, previewImagePath, category, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
    [
      data.name,
      data.dashboardUrl,
      data.description || null,
      data.previewImagePath || null,
      data.category || null,
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
  }
) {
  await ensureAlphanumericDashboardTable()
  await db.execute(
    'UPDATE AlphanumericDashboard SET name=?, dashboardUrl=?, description=?, previewImagePath=?, category=?, updatedAt=NOW() WHERE id=?',
    [
      data.name,
      data.dashboardUrl,
      data.description || null,
      data.previewImagePath || null,
      data.category || null,
      id,
    ]
  )
  return findAlphanumericDashboardById(id)
}

export async function deleteAlphanumericDashboard(id: number) {
  await ensureAlphanumericDashboardTable()
  await db.execute('DELETE FROM AlphanumericDashboard WHERE id = ?', [id])
}