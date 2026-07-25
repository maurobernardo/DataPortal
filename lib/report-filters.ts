/** Filtros SQL partilhados entre exportações JSON/CSV/PDF do dashboard admin. */

type SqlValue = string | Date

export function buildDatasetFilterSql(params: {
  categoryName?: string | null
  datasetFormat?: string | null
  source?: string | null
}) {
  const conditions: string[] = []
  const values: SqlValue[] = []

  if (params.datasetFormat) {
    conditions.push('d.format = ?')
    values.push(params.datasetFormat)
  }
  if (params.source) {
    conditions.push('d.source = ?')
    values.push(params.source)
  }
  if (params.categoryName) {
    conditions.push('c.name = ?')
    values.push(params.categoryName)
  }

  return {
    whereSql: conditions.length ? `AND ${conditions.join(' AND ')}` : '',
    values,
  }
}

export function buildStatisticDateFilterSql(params: {
  startDate?: string | null
  endDate?: string | null
}) {
  const conditions: string[] = []
  const values: Date[] = []

  if (params.startDate) {
    conditions.push('s.createdAt >= ?')
    values.push(new Date(`${params.startDate}T00:00:00.000`))
  }
  if (params.endDate) {
    conditions.push('s.createdAt <= ?')
    values.push(new Date(`${params.endDate}T23:59:59.999`))
  }

  return {
    whereSql: conditions.length ? `AND ${conditions.join(' AND ')}` : '',
    values,
  }
}
