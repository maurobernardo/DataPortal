import mysql from 'mysql2/promise'

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

// ==================== USER ====================
export async function findUserByEmail(email: string) {
  const [rows] = await db.execute('SELECT * FROM User WHERE email = ? LIMIT 1', [email]) as any
  return rows[0] || null
}

// ==================== CATEGORY ====================
export async function findAllCategories() {
  const [rows] = await db.execute('SELECT * FROM Category ORDER BY name ASC') as any
  return rows
}

export async function findCategoryById(id: number) {
  const [rows] = await db.execute('SELECT * FROM Category WHERE id = ? LIMIT 1', [id]) as any
  return rows[0] || null
}

export async function createCategory(data: { name: string; description?: string | null; dataType?: string }) {
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
  categoryId?: number
  search?: string
  source?: string
  format?: string
  year?: number
  sortOrder?: string
  offset?: number
  take?: number
}) {
  const { categoryId, search, source, format, year, sortOrder, offset = 0, take = 10 } = params
  const conditions: string[] = []
  const values: any[] = []

  if (categoryId) { conditions.push('d.categoryId = ?'); values.push(categoryId) }
  if (format) { conditions.push('d.format = ?'); values.push(format) }
  if (source) { conditions.push('d.source = ?'); values.push(source) }
  if (year) { conditions.push('d.year = ?'); values.push(year) }
  if (search) {
    conditions.push('(d.title LIKE ? OR d.description LIKE ? OR d.keywords LIKE ?)')
    values.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const order = sortOrder === 'oldest' ? 'ORDER BY d.year ASC'
    : sortOrder === 'newest' ? 'ORDER BY d.year DESC'
    : 'ORDER BY d.downloads DESC, d.views DESC'

  values.push(offset, take)
  const [rows] = await db.execute(
    `SELECT d.*, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType
     FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id
     ${where} ${order} LIMIT ?, ?`,
    values
  ) as any

  return rows.map((r: any) => ({
    ...r,
    category: { id: r.cat_id, name: r.cat_name, description: r.cat_desc, dataType: r.cat_dataType }
  }))
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
  return findDatasetById(id)
}

export async function deleteDataset(id: number) {
  await db.execute('DELETE FROM Dataset WHERE id = ?', [id])
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
export async function createStatistic(datasetId: number, type: 'view' | 'download') {
  await db.execute(
    'INSERT INTO Statistic (datasetId, type, createdAt) VALUES (?, ?, NOW())',
    [datasetId, type]
  )
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
    'INSERT INTO Report (title, year, coverage, author, partners, filePath, fileSize, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [data.title, data.year, data.coverage, data.author || null, data.partners || null, data.filePath || null, data.fileSize || null]
  ) as any
  return findReportById(result.insertId)
}

export async function updateReport(id: number, data: any) {
  await db.execute(
    'UPDATE Report SET title=?, year=?, coverage=?, author=?, partners=?, filePath=?, fileSize=?, updatedAt=NOW() WHERE id=?',
    [data.title, data.year, data.coverage, data.author || null, data.partners || null, data.filePath || null, data.fileSize || null, id]
  )
  return findReportById(id)
}

export async function deleteReport(id: number) {
  await db.execute('DELETE FROM Report WHERE id = ?', [id])
}

export async function createReportRequest(reportId: number) {
  await db.execute(
    'INSERT INTO ReportRequest (reportId, createdAt) VALUES (?, NOW())',
    [reportId]
  )
}

// ==================== CONTACT ====================
export async function createContactMessage(data: { name: string; email: string; subject: string; message: string }) {
  await db.execute(
    'INSERT INTO ContactMessage (name, email, subject, message, createdAt) VALUES (?, ?, ?, ?, NOW())',
    [data.name, data.email, data.subject, data.message]
  )
}