import { NextRequest } from 'next/server'
import { db, findUserByEmail } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function buildDatasetFilterSql(params: {
  categoryName?: string | null
  datasetFormat?: string | null
  source?: string | null
}) {
  const conditions: string[] = []
  const values: any[] = []

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

function buildStatisticDateFilterSql(params: { startDate?: string | null; endDate?: string | null }) {
  const conditions: string[] = []
  const values: any[] = []
  if (params.startDate) {
    conditions.push('s.createdAt >= ?')
    values.push(new Date(params.startDate))
  }
  if (params.endDate) {
    conditions.push('s.createdAt <= ?')
    values.push(new Date(params.endDate))
  }
  return {
    whereSql: conditions.length ? `AND ${conditions.join(' AND ')}` : '',
    values,
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Acesso não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verificar se o usuário existe no banco de dados e obter informações adicionais
    const dbUser = await findUserByEmail(user.email)
    
    if (!dbUser) {
      return new Response(JSON.stringify({ error: 'Acesso não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'dashboard'
    const format = searchParams.get('format') || 'json'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const categoryName = searchParams.get('category')
    const datasetFormat = searchParams.get('datasetFormat')
    const source = searchParams.get('source')

    let reportData: any = {}

    if (type === 'dashboard') {
      const datasetFilter = buildDatasetFilterSql({ categoryName, datasetFormat, source })
      const dateFilter = buildStatisticDateFilterSql({ startDate, endDate })

      // Obter dados atuais do dashboard
      const [
        totalDatasets,
        totalViews,
        totalDownloads,
        topViewedStats,
        topDownloadedStats,
        conversionStats,
        categoryPerformance,
        categoryStats,
      ] = await Promise.all([
        (async () => {
          const [rows] = await db.execute(
            `SELECT COUNT(*) as total
             FROM Dataset d
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE 1=1 ${datasetFilter.whereSql}`,
            datasetFilter.values
          ) as any
          return rows[0]?.total ?? 0
        })(),
        (async () => {
          const [rows] = await db.execute(
            `SELECT COUNT(*) as total
             FROM Statistic s
             JOIN Dataset d ON s.datasetId = d.id
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE s.type = 'view'
             ${dateFilter.whereSql}
             ${datasetFilter.whereSql}`,
            [...dateFilter.values, ...datasetFilter.values]
          ) as any
          return rows[0]?.total ?? 0
        })(),
        (async () => {
          const [rows] = await db.execute(
            `SELECT COUNT(*) as total
             FROM Statistic s
             JOIN Dataset d ON s.datasetId = d.id
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE s.type = 'download'
             ${dateFilter.whereSql}
             ${datasetFilter.whereSql}`,
            [...dateFilter.values, ...datasetFilter.values]
          ) as any
          return rows[0]?.total ?? 0
        })(),
        (async () => {
          const [rows] = await db.execute(
            `SELECT s.datasetId, COUNT(*) as cnt
             FROM Statistic s
             JOIN Dataset d ON s.datasetId = d.id
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE s.type = 'view'
             ${dateFilter.whereSql}
             ${datasetFilter.whereSql}
             GROUP BY s.datasetId
             ORDER BY cnt DESC
             LIMIT 10`,
            [...dateFilter.values, ...datasetFilter.values]
          ) as any
          return rows as Array<{ datasetId: number; cnt: number }>
        })(),
        (async () => {
          const [rows] = await db.execute(
            `SELECT s.datasetId, COUNT(*) as cnt
             FROM Statistic s
             JOIN Dataset d ON s.datasetId = d.id
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE s.type = 'download'
             ${dateFilter.whereSql}
             ${datasetFilter.whereSql}
             GROUP BY s.datasetId
             ORDER BY cnt DESC
             LIMIT 10`,
            [...dateFilter.values, ...datasetFilter.values]
          ) as any
          return rows as Array<{ datasetId: number; cnt: number }>
        })(),
        (async () => {
          const [rows] = await db.execute(
            `SELECT s.datasetId, s.type, COUNT(*) as cnt
             FROM Statistic s
             JOIN Dataset d ON s.datasetId = d.id
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE 1=1
             ${dateFilter.whereSql}
             ${datasetFilter.whereSql}
             GROUP BY s.datasetId, s.type`,
            [...dateFilter.values, ...datasetFilter.values]
          ) as any
          return rows as Array<{ datasetId: number; type: 'view' | 'download'; cnt: number }>
        })(),
        (async () => {
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
             LEFT JOIN Dataset d
               ON d.categoryId = c.id
               ${datasetFormat ? 'AND d.format = ?' : ''}
               ${source ? 'AND d.source = ?' : ''}
             ${categoryName ? 'WHERE c.name = ?' : ''}
             GROUP BY c.id
             ORDER BY averageConversionRate DESC`,
            [
              ...(datasetFormat ? [datasetFormat] : []),
              ...(source ? [source] : []),
              ...(categoryName ? [categoryName] : []),
            ]
          ) as any
          return rows as Array<{ categoryName: string; totalViews: number; totalDownloads: number; averageConversionRate: number }>
        })(),
        (async () => {
          const [rows] = await db.execute(
            `SELECT c.name as categoryName, COUNT(d.id) as count
             FROM Category c
             LEFT JOIN Dataset d
               ON d.categoryId = c.id
               ${datasetFormat ? 'AND d.format = ?' : ''}
               ${source ? 'AND d.source = ?' : ''}
             ${categoryName ? 'WHERE c.name = ?' : ''}
             GROUP BY c.id`,
            [
              ...(datasetFormat ? [datasetFormat] : []),
              ...(source ? [source] : []),
              ...(categoryName ? [categoryName] : []),
            ]
          ) as any
          return rows as Array<{ categoryName: string; count: number }>
        })(),
      ])

      const topViewedIds = topViewedStats.map(s => s.datasetId)
      const topViewedCounts = new Map(topViewedStats.map(s => [s.datasetId, s.cnt]))
      const topViewed = topViewedIds.length
        ? await (async () => {
            const placeholders = topViewedIds.map(() => '?').join(',')
            const [rows] = await db.execute(
              `SELECT d.*, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType
               FROM Dataset d
               LEFT JOIN Category c ON d.categoryId = c.id
               WHERE d.id IN (${placeholders}) ${datasetFilter.whereSql}`,
              [...topViewedIds, ...datasetFilter.values]
            ) as any

            return (rows as any[]).map((r) => ({
              ...r,
              category: { id: r.cat_id, name: r.cat_name, description: r.cat_desc, dataType: r.cat_dataType },
              periodViews: topViewedCounts.get(r.id) || 0,
            })).sort((a, b) => (b.periodViews || 0) - (a.periodViews || 0))
          })()
        : []

      const topDownloadedIds = topDownloadedStats.map(s => s.datasetId)
      const topDownloadedCounts = new Map(topDownloadedStats.map(s => [s.datasetId, s.cnt]))
      const topDownloaded = topDownloadedIds.length
        ? await (async () => {
            const placeholders = topDownloadedIds.map(() => '?').join(',')
            const [rows] = await db.execute(
              `SELECT d.*, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType
               FROM Dataset d
               LEFT JOIN Category c ON d.categoryId = c.id
               WHERE d.id IN (${placeholders}) ${datasetFilter.whereSql}`,
              [...topDownloadedIds, ...datasetFilter.values]
            ) as any

            return (rows as any[]).map((r) => ({
              ...r,
              category: { id: r.cat_id, name: r.cat_name, description: r.cat_desc, dataType: r.cat_dataType },
              periodDownloads: topDownloadedCounts.get(r.id) || 0,
            })).sort((a, b) => (b.periodDownloads || 0) - (a.periodDownloads || 0))
          })()
        : []

      const byDataset: Record<string, { views: number; downloads: number }> = {}
      for (const row of conversionStats) {
        const key = String(row.datasetId)
        if (!byDataset[key]) byDataset[key] = { views: 0, downloads: 0 }
        if (row.type === 'view') byDataset[key].views = row.cnt
        if (row.type === 'download') byDataset[key].downloads = row.cnt
      }

      const conversionIds = Object.keys(byDataset).map((id) => parseInt(id))
      const conversionRates = conversionIds.length
        ? await (async () => {
            const placeholders = conversionIds.map(() => '?').join(',')
            const [rows] = await db.execute(
              `SELECT d.id, d.title
               FROM Dataset d
               LEFT JOIN Category c ON d.categoryId = c.id
               WHERE d.id IN (${placeholders}) ${datasetFilter.whereSql}`,
              [...conversionIds, ...datasetFilter.values]
            ) as any

            return (rows as any[])
              .map((r) => {
                const stats = byDataset[String(r.id)] || { views: 0, downloads: 0 }
                const views = stats.views
                const downloads = stats.downloads
                return {
                  datasetId: r.id,
                  datasetTitle: r.title,
                  views,
                  downloads,
                  conversionRate: views > 0 ? (downloads / views) * 100 : 0,
                }
              })
              .filter((r) => r.views > 0)
              .sort((a, b) => b.conversionRate - a.conversionRate)
          })()
        : []

      reportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          reportType: 'dashboard-summary',
          format,
          period: {
            start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: endDate || new Date().toISOString(),
          },
          filters: {
            category: categoryName || '',
            source: source || '',
            datasetFormat: datasetFormat || '',
          },
        },
        summary: {
          totalDatasets,
          totalViews,
          totalDownloads,
          avgConversionRate: totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0,
        },
        topViewed,
        topDownloaded,
        conversionRates,
        categoryPerformance,
        categoryStats,
      }
    }

    // Se o formato solicitado for CSV, converter os dados
    if (format === 'csv') {
      // Converter para CSV
      const csvContent = convertToCSV(reportData)
      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="dashboard-report.csv"',
        },
      })
    }

    // Caso contrário, retornar JSON
    return new Response(JSON.stringify(reportData, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    return new Response(JSON.stringify({ error: 'Erro ao gerar relatório' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Função auxiliar para converter dados para CSV
function convertToCSV(data: any): string {
  // Gerar CSV com base nos dados fornecidos
  let csv = ''
  
  // Adicionar cabeçalhos
  csv += 'Relatório de Dashboard\n'
  csv += `Gerado em: ${data.metadata.generatedAt}\n\n`
  
  // Adicionar sumário
  csv += 'Sumário:\n'
  csv += `Total de Datasets,${data.summary.totalDatasets}\n`
  csv += `Total de Visualizações,${data.summary.totalViews}\n`
  csv += `Total de Downloads,${data.summary.totalDownloads}\n`
  csv += `Taxa de Conversão Média,${data.summary.avgConversionRate}%\n\n`
  
  // Adicionar top visualizados
  csv += 'Top Datasets Visualizados:\n'
  csv += 'Título,Categoria,Visualizações,Downloads\n'
  data.topViewed.forEach((dataset: any) => {
    csv += `"${dataset.title}","${dataset.category.name}",${dataset.views},${dataset.downloads}\n`
  })
  csv += '\n'
  
  // Adicionar top baixados
  csv += 'Top Datasets Baixados:\n'
  csv += 'Título,Categoria,Downloads,Visualizações\n'
  data.topDownloaded.forEach((dataset: any) => {
    csv += `"${dataset.title}","${dataset.category.name}",${dataset.downloads},${dataset.views}\n`
  })
  csv += '\n'
  
  // Adicionar taxas de conversão
  csv += 'Taxas de Conversão:\n'
  csv += 'Dataset,Visualizações,Downloads,Taxa de Conversão (%)\n'
  data.conversionRates.forEach((rate: any) => {
    csv += `"${rate.datasetTitle}",${rate.views},${rate.downloads},${rate.conversionRate.toFixed(2)}%\n`
  })
  csv += '\n'
  
  // Adicionar performance por categoria
  csv += 'Performance por Categoria:\n'
  csv += 'Categoria,Total Visualizações,Total Downloads,Taxa de Conversão Média (%)\n'
  data.categoryPerformance.forEach((perf: any) => {
    csv += `"${perf.categoryName}",${perf.totalViews},${perf.totalDownloads},${perf.averageConversionRate.toFixed(2)}%\n`
  })
  
  return csv
}