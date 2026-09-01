import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

let auditTableEnsured = false

async function ensureAuditLogTable() {
  if (auditTableEnsured) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS AuditLog (
      id INT NOT NULL AUTO_INCREMENT,
      actorEmail VARCHAR(254) NOT NULL,
      action VARCHAR(60) NOT NULL,
      entityType VARCHAR(40) NOT NULL,
      entityId VARCHAR(60) NULL,
      details TEXT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX auditlog_created_idx (createdAt)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  auditTableEnsured = true
}

/**
 * Regista uma acção administrativa (quem, o quê, sobre qual registo). Nunca deve impedir a acção
 * principal de completar: uma falha aqui só fica registada nos logs do servidor, isolada.
 */
export async function logAudit(entry: {
  actorEmail: string
  action: string
  entityType: string
  entityId?: string | number
  details?: string
}): Promise<void> {
  try {
    await ensureAuditLogTable()
    await db.execute(
      'INSERT INTO AuditLog (actorEmail, action, entityType, entityId, details) VALUES (?, ?, ?, ?, ?)',
      [
        entry.actorEmail,
        entry.action,
        entry.entityType,
        entry.entityId != null ? String(entry.entityId) : null,
        entry.details || null,
      ]
    )
  } catch (error) {
    logger.error('error_writing_audit_log', { error, entry })
  }
}

export type AuditLogRow = {
  id: number
  actorEmail: string
  action: string
  entityType: string
  entityId: string | null
  details: string | null
  createdAt: Date | string
}

export async function findAuditLog(limit = 200): Promise<AuditLogRow[]> {
  await ensureAuditLogTable()
  const tecto = Math.min(Math.max(Math.trunc(limit) || 200, 1), 1000)
  const [rows] = (await db.execute(`SELECT * FROM AuditLog ORDER BY createdAt DESC LIMIT ${tecto}`)) as [
    AuditLogRow[],
    unknown,
  ]
  return rows
}
