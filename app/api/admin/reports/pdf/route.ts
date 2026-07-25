import { NextRequest } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { db, findUserByEmail } from '@/lib/db'
import { buildDatasetFilterSql, buildStatisticDateFilterSql } from '@/lib/report-filters'
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentAdmin();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Acesso reservado a administradores' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verificar se o usuário existe no banco de dados
    const dbUser = await findUserByEmail(user.email)
    
    if (!dbUser) {
      return new Response(JSON.stringify({ error: 'Acesso não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const categoryName = searchParams.get('category');
    const datasetFormat = searchParams.get('datasetFormat');
    const source = searchParams.get('source');
    const datasetFilter = buildDatasetFilterSql({ categoryName, datasetFormat, source })
    const dateFilter = buildStatisticDateFilterSql({ startDate, endDate })

    // Obter dados do dashboard
    const [
      totalDatasets,
      totalViews,
      totalDownloads,
      topViewedStats,
      topDownloadedStats,
      conversionStats,
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
    ]);

    const topViewedIds = topViewedStats.map(s => s.datasetId)
    const topViewedCounts = new Map(topViewedStats.map(s => [s.datasetId, s.cnt]))
    const topViewed = topViewedIds.length
      ? await (async () => {
          const placeholders = topViewedIds.map(() => '?').join(',')
          const [rows] = await db.execute(
            `SELECT d.*, c.name as categoryName
             FROM Dataset d
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE d.id IN (${placeholders}) ${datasetFilter.whereSql}`,
            [...topViewedIds, ...datasetFilter.values]
          ) as any
          return (rows as any[])
            .map(r => ({ ...r, category: { name: r.categoryName }, periodViews: topViewedCounts.get(r.id) || 0 }))
            .sort((a, b) => (b.periodViews || 0) - (a.periodViews || 0))
        })()
      : []

    const topDownloadedIds = topDownloadedStats.map(s => s.datasetId)
    const topDownloadedCounts = new Map(topDownloadedStats.map(s => [s.datasetId, s.cnt]))
    const topDownloaded = topDownloadedIds.length
      ? await (async () => {
          const placeholders = topDownloadedIds.map(() => '?').join(',')
          const [rows] = await db.execute(
            `SELECT d.*, c.name as categoryName
             FROM Dataset d
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE d.id IN (${placeholders}) ${datasetFilter.whereSql}`,
            [...topDownloadedIds, ...datasetFilter.values]
          ) as any
          return (rows as any[])
            .map(r => ({ ...r, category: { name: r.categoryName }, periodDownloads: topDownloadedCounts.get(r.id) || 0 }))
            .sort((a, b) => (b.periodDownloads || 0) - (a.periodDownloads || 0))
        })()
      : []

    const byDataset: Record<string, { views: number; downloads: number }> = {}
    for (const row of conversionStats) {
      const key = String(row.datasetId)
      if (!byDataset[key]) byDataset[key] = { views: 0, downloads: 0 }
      if (row.type === 'view') byDataset[key].views = row.cnt
      if (row.type === 'download') byDataset[key].downloads = row.cnt
    }

    const topViewedEnriched = topViewed.map((d) => ({
      ...d,
      periodDownloads: byDataset[String(d.id)]?.downloads ?? 0,
    }))
    const topDownloadedEnriched = topDownloaded.map((d) => ({
      ...d,
      periodViews: byDataset[String(d.id)]?.views ?? 0,
    }))

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
            .map(r => {
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
            .filter(r => r.views > 0)
            .sort((a, b) => b.conversionRate - a.conversionRate)
        })()
      : []

    // Calcular taxa de conversão média
    const avgConversionRate = totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0;

    // Criar documento PDF
    const doc = new jsPDF();

    // Configurar cores do sistema
    const primaryColor = '#064E2C'; // verde institucional DataPortal
    const secondaryColor = '#ef4444'; // red-500
    const accentColor = '#eab308'; // yellow-500

    // Cabeçalho
    doc.setFillColor(parseInt(primaryColor.substring(1, 3), 16), 
                     parseInt(primaryColor.substring(3, 5), 16), 
                     parseInt(primaryColor.substring(5, 7), 16));
    doc.rect(0, 0, 210, 40, 'F'); // Fundo colorido

    doc.setTextColor(255, 255, 255); // Branco
    doc.setFontSize(22);
    doc.text('Data Portal- Relatorio', 20, 25);

    // Restaurar cor do texto
    doc.setTextColor(0, 0, 0);

    // Sumário
    doc.setFontSize(16);
    doc.setTextColor(parseInt(accentColor.substring(1, 3), 16), 
                     parseInt(accentColor.substring(3, 5), 16), 
                     parseInt(accentColor.substring(5, 7), 16));
    doc.text('Sumário', 20, 55);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total de Datasets: ${totalDatasets}`, 20, 65);
    doc.text(`Total de Visualizações: ${totalViews.toLocaleString('pt-BR')}`, 20, 72);
    doc.text(`Total de Downloads: ${totalDownloads.toLocaleString('pt-BR')}`, 20, 79);
    doc.text(`Taxa de Conversão Média: ${avgConversionRate.toFixed(2)}%`, 20, 86);
    if (categoryName || datasetFormat || source || startDate || endDate) {
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(
        `Filtros: ${[
          categoryName ? `Categoria=${categoryName}` : null,
          datasetFormat ? `Formato=${datasetFormat}` : null,
          source ? `Fonte=${source}` : null,
          startDate ? `Início=${startDate}` : null,
          endDate ? `Fim=${endDate}` : null,
        ].filter(Boolean).join(' | ')}`,
        20,
        94
      );
      doc.setTextColor(0, 0, 0);
    }

    // Adicionar gráfico de pizza como imagem (representação textual por enquanto)
    doc.setFontSize(16);
    doc.setTextColor(parseInt(accentColor.substring(1, 3), 16), 
                     parseInt(accentColor.substring(3, 5), 16), 
                     parseInt(accentColor.substring(5, 7), 16));
    doc.text('Distribuição por Categoria', 20, 100);

    // Tabela de distribuição por categoria
    const categoryTableData = categoryStats.map(cat => [cat.categoryName, cat.count.toString()]);
    autoTable(doc, {
      startY: 105,
      head: [['Categoria', 'Quantidade']],
      body: categoryTableData,
      theme: 'grid',
      styles: { 
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontSize: 10
      },
      headStyles: {
        fillColor: [parseInt(primaryColor.substring(1, 3), 16), 
                    parseInt(primaryColor.substring(3, 5), 16), 
                    parseInt(primaryColor.substring(5, 7), 16)],
        textColor: [255, 255, 255],
        fontSize: 11
      }
    });

    // Top datasets visualizados
    doc.setFontSize(16);
    doc.setTextColor(parseInt(accentColor.substring(1, 3), 16), 
                     parseInt(accentColor.substring(3, 5), 16), 
                     parseInt(accentColor.substring(5, 7), 16));
    doc.text('Top Datasets Visualizados', 20, (doc as any).lastAutoTable.finalY + 15);

    const hasPeriodFilter = Boolean(startDate || endDate)
    const viewedColLabel = hasPeriodFilter ? 'Visualizações (período)' : 'Visualizações'
    const downloadedColLabel = hasPeriodFilter ? 'Downloads (período)' : 'Downloads'

    const topViewedData = topViewedEnriched.map(dataset => [
      dataset.title.length > 30 ? dataset.title.substring(0, 30) + '...' : dataset.title,
      dataset.category.name,
      String(hasPeriodFilter ? (dataset.periodViews ?? 0) : (dataset.periodViews ?? dataset.views)),
      String(hasPeriodFilter ? (dataset.periodDownloads ?? 0) : (dataset.periodDownloads ?? dataset.downloads)),
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Título', 'Categoria', viewedColLabel, downloadedColLabel]],
      body: topViewedData,
      theme: 'grid',
      styles: { 
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 9
      },
      headStyles: {
        fillColor: [parseInt(secondaryColor.substring(1, 3), 16), 
                    parseInt(secondaryColor.substring(3, 5), 16), 
                    parseInt(secondaryColor.substring(5, 7), 16)],
        textColor: [255, 255, 255],
        fontSize: 10
      }
    });

    // Top datasets baixados
    doc.setFontSize(16);
    doc.setTextColor(parseInt(accentColor.substring(1, 3), 16), 
                     parseInt(accentColor.substring(3, 5), 16), 
                     parseInt(accentColor.substring(5, 7), 16));
    doc.text('Top Datasets Baixados', 20, (doc as any).lastAutoTable.finalY + 15);

    const topDownloadedData = topDownloadedEnriched.map(dataset => [
      dataset.title.length > 30 ? dataset.title.substring(0, 30) + '...' : dataset.title,
      dataset.category.name,
      String(hasPeriodFilter ? (dataset.periodDownloads ?? 0) : (dataset.periodDownloads ?? dataset.downloads)),
      String(hasPeriodFilter ? (dataset.periodViews ?? 0) : (dataset.periodViews ?? dataset.views)),
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Título', 'Categoria', downloadedColLabel, viewedColLabel]],
      body: topDownloadedData,
      theme: 'grid',
      styles: { 
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 9
      },
      headStyles: {
        fillColor: [parseInt(secondaryColor.substring(1, 3), 16), 
                    parseInt(secondaryColor.substring(3, 5), 16), 
                    parseInt(secondaryColor.substring(5, 7), 16)],
        textColor: [255, 255, 255],
        fontSize: 10
      }
    });

    // Informações de rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(10);
      doc.text(`Página ${i} de ${pageCount}`, 20, doc.internal.pageSize.height - 10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, doc.internal.pageSize.width - 70, doc.internal.pageSize.height - 10);
    }

    // Enviar PDF como resposta
    const pdfOutput = doc.output('blob');
    
    return new Response(pdfOutput, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="dashboard-report.pdf"',
      },
    });
  } catch (error) {
    console.error('Erro ao gerar relatório PDF:', error);
    return new Response(JSON.stringify({ error: 'Erro ao gerar relatório PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}