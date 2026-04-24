import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { ModernDashboard } from '@/components/ModernDashboard'
import { db } from '@/lib/db'

async function getDashboardData() {
  const today = new Date()
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [
    totalDatasets,
    totalViews,
    totalDownloads,
    totalVisitors,
    totalReports,
    viewsThisMonth,
    downloadsThisMonth,
    viewsLastMonth,
    downloadsLastMonth,
    topViewed,
    topDownloaded,
    statistics,
    datasetsByCategory,
    recentActivity,
  ] = await Promise.all([
    (async () => {
      const [rows] = await db.execute('SELECT COUNT(*) as total FROM Dataset') as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute(`SELECT COUNT(*) as total FROM Statistic WHERE type='view'`) as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute(`SELECT COUNT(*) as total FROM Statistic WHERE type='download'`) as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute(`SELECT COUNT(*) as total FROM Statistic WHERE type='view'`) as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute('SELECT COUNT(*) as total FROM Report') as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as total FROM Statistic WHERE type='view' AND createdAt >= ?`,
        [thisMonthStart]
      ) as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as total FROM Statistic WHERE type='download' AND createdAt >= ?`,
        [thisMonthStart]
      ) as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as total FROM Statistic WHERE type='view' AND createdAt >= ? AND createdAt < ?`,
        [lastMonthStart, thisMonthStart]
      ) as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as total FROM Statistic WHERE type='download' AND createdAt >= ? AND createdAt < ?`,
        [lastMonthStart, thisMonthStart]
      ) as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT d.*, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType
         FROM Dataset d
         LEFT JOIN Category c ON d.categoryId = c.id
         ORDER BY d.views DESC
         LIMIT 10`
      ) as any
      return rows.map((r: any) => ({ ...r, category: { id: r.cat_id, name: r.cat_name, description: r.cat_desc, dataType: r.cat_dataType } }))
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT d.*, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType
         FROM Dataset d
         LEFT JOIN Category c ON d.categoryId = c.id
         ORDER BY d.downloads DESC
         LIMIT 10`
      ) as any
      return rows.map((r: any) => ({ ...r, category: { id: r.cat_id, name: r.cat_name, description: r.cat_desc, dataType: r.cat_dataType } }))
    })(),
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const [rows] = await db.execute(
        `SELECT
           s.*,
           d.id as d_id, d.title as d_title, d.views as d_views, d.downloads as d_downloads, d.categoryId as d_categoryId,
           c.id as c_id, c.name as c_name, c.description as c_desc, c.dataType as c_dataType
         FROM Statistic s
         LEFT JOIN Dataset d ON s.datasetId = d.id
         LEFT JOIN Category c ON d.categoryId = c.id
         WHERE s.createdAt >= ?
         ORDER BY s.createdAt ASC`,
        [since]
      ) as any
      return rows.map((r: any) => ({
        ...r,
        dataset: r.d_id
          ? {
              id: r.d_id,
              title: r.d_title,
              views: r.d_views,
              downloads: r.d_downloads,
              categoryId: r.d_categoryId,
              category: r.c_id ? { id: r.c_id, name: r.c_name, description: r.c_desc, dataType: r.c_dataType } : null,
            }
          : null,
      }))
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT categoryId, COUNT(*) as cnt FROM Dataset GROUP BY categoryId`
      ) as any
      return rows.map((r: any) => ({ categoryId: r.categoryId, _count: { id: r.cnt } }))
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT
           s.*,
           d.id as d_id, d.title as d_title, d.views as d_views, d.downloads as d_downloads, d.categoryId as d_categoryId,
           c.id as c_id, c.name as c_name, c.description as c_desc, c.dataType as c_dataType
         FROM Statistic s
         LEFT JOIN Dataset d ON s.datasetId = d.id
         LEFT JOIN Category c ON d.categoryId = c.id
         ORDER BY s.createdAt DESC
         LIMIT 20`
      ) as any
      return rows.map((r: any) => ({
        ...r,
        dataset: r.d_id
          ? {
              id: r.d_id,
              title: r.d_title,
              views: r.d_views,
              downloads: r.d_downloads,
              categoryId: r.d_categoryId,
              category: r.c_id ? { id: r.c_id, name: r.c_name, description: r.c_desc, dataType: r.c_dataType } : null,
            }
          : null,
      }))
    })(),
  ])

  // Como o modelo ReportRequest é novo, iniciamos o total de requests em 0.
  const totalReportRequests = 0

  // Calcular percentuais de mudança
  const viewsChange = viewsLastMonth > 0
    ? ((viewsThisMonth - viewsLastMonth) / viewsLastMonth) * 100
    : 0
  const downloadsChange = downloadsLastMonth > 0
    ? ((downloadsThisMonth - downloadsLastMonth) / downloadsLastMonth) * 100
    : 0

  // Agrupar datasets por categoria
  const categoryStats = await Promise.all(
    datasetsByCategory.map(async (item: any) => {
      const [rows] = await db.execute('SELECT name FROM Category WHERE id = ? LIMIT 1', [item.categoryId]) as any
      const category = rows[0] || null
      return {
        categoryName: category?.name || 'Desconhecida',
        count: item._count.id,
      }
    })
  )

  // Calcular taxas de conversão por dataset
  const conversionRates = await (async () => {
    const [rows] = await db.execute(
      `SELECT id, title, views, downloads FROM Dataset WHERE views > 0`
    ) as any
    return rows
      .map((dataset: any) => ({
        datasetId: dataset.id,
        datasetTitle: dataset.title,
        views: dataset.views,
        downloads: dataset.downloads,
        conversionRate: (dataset.downloads / dataset.views) * 100,
      }))
      .sort((a: any, b: any) => b.conversionRate - a.conversionRate)
  })()

  // Calcular retenção de usuários
  const userRetention = await (async () => {
    const [rows] = await db.execute(
      `SELECT DATE(createdAt) as day, COUNT(*) as cnt FROM Statistic GROUP BY DATE(createdAt)`
    ) as any
    const uniqueDays = new Set(rows.map((r: any) => String(r.day)))
    const returningUsers = uniqueDays.size
    const total = rows.reduce((sum: number, r: any) => sum + Number(r.cnt || 0), 0)
    const newUsers = Math.max(0, total - returningUsers)
    return {
      returningUsers,
      newUsers,
      retentionRate: returningUsers > 0 ? (returningUsers / (returningUsers + newUsers)) * 100 : 0,
    }
  })()

  // Calcular performance por categoria
  const categoryPerformance = await (async () => {
    const [rows] = await db.execute(
      `SELECT
         c.name as categoryName,
         COALESCE(SUM(d.views), 0) as totalViews,
         COALESCE(SUM(d.downloads), 0) as totalDownloads,
         CASE
           WHEN COALESCE(SUM(d.views), 0) > 0
             THEN (COALESCE(SUM(d.downloads), 0) / COALESCE(SUM(d.views), 0)) * 100
           ELSE 0
         END as averageConversionRate
       FROM Category c
       LEFT JOIN Dataset d ON d.categoryId = c.id
       GROUP BY c.id
       ORDER BY averageConversionRate DESC`
    ) as any
    return rows
  })()

  // Serializar objetos Date para strings para evitar problemas de serialização
  const serializedStatistics = statistics.map((stat: any) => ({
    ...stat,
    createdAt: new Date(stat.createdAt).toISOString(),
  }))

  const serializedRecentActivity = recentActivity.map((activity: any) => ({
    ...activity,
    createdAt: new Date(activity.createdAt).toISOString(),
  }))

  return {
    totalDatasets,
    totalViews,
    totalDownloads,
    totalVisitors,
    totalReports,
    totalReportRequests,
    viewsThisMonth,
    downloadsThisMonth,
    viewsChange,
    downloadsChange,
    topViewed,
    topDownloaded,
    statistics: serializedStatistics,
    categoryStats,
    recentActivity: serializedRecentActivity,
    conversionRates,
    userRetention,
    categoryPerformance,
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/admin/login')
  }

  const data = await getDashboardData()

  return <ModernDashboard data={data} user={user} />
}