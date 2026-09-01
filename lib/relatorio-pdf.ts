import { readFile } from 'fs/promises'
import { join } from 'path'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { db } from '@/lib/db'
import { buildDatasetFilterSql, buildStatisticDateFilterSql } from '@/lib/report-filters'
import { obterResumoOrigem } from '@/lib/origem-stats'
import { logger } from '@/lib/logger'

/**
 * Geração do PDF institucional do relatório administrativo, extraída de
 * app/api/admin/reports/pdf/route.ts para ser partilhada entre o download sob pedido e o envio
 * agendado por email (lib/relatorios-agendados.ts) — as duas vias produzem exactamente o mesmo
 * documento, só muda o que se faz com o resultado (Response vs anexo de email).
 */

const COR_PRIMARIA: [number, number, number] = [6, 78, 44] // #064E2C
const COR_AMBAR: [number, number, number] = [212, 160, 23] // #D4A017
const COR_VIOLETA: [number, number, number] = [107, 79, 187] // #6B4FBB
const COR_TEXTO: [number, number, number] = [30, 41, 34]
const COR_TEXTO_SUAVE: [number, number, number] = [110, 120, 115]

const NOME_PAIS: Record<string, string> = {
  MZ: 'Moçambique', ZA: 'África do Sul', PT: 'Portugal', BR: 'Brasil', US: 'Estados Unidos',
  GB: 'Reino Unido', DE: 'Alemanha', FR: 'França', NL: 'Países Baixos', KE: 'Quénia',
  ZW: 'Zimbabué', ZM: 'Zâmbia', MW: 'Maláui', TZ: 'Tanzânia', IN: 'Índia', CN: 'China',
  CA: 'Canadá', AU: 'Austrália', IE: 'Irlanda', ES: 'Espanha', AE: 'Emirados Árabes Unidos',
}
const nomePais = (codigo: string) => NOME_PAIS[codigo] || codigo

async function carregarLogoBase64(): Promise<string | null> {
  try {
    const caminho = join(process.cwd(), 'public', 'images', 'logo.png')
    const buffer = await readFile(caminho)
    return `data:image/png;base64,${buffer.toString('base64')}`
  } catch (erro) {
    logger.error('erro_carregar_logo_pdf', { error: erro })
    return null
  }
}

export type FiltrosRelatorioPdf = {
  startDate?: string | null
  endDate?: string | null
  categoryName?: string | null
  datasetFormat?: string | null
  source?: string | null
  geradoPor: string
}

export async function gerarRelatorioPdfBuffer(filtros: FiltrosRelatorioPdf): Promise<Buffer> {
  const { startDate, endDate, categoryName, datasetFormat, source, geradoPor } = filtros
  const datasetFilter = buildDatasetFilterSql({ categoryName, datasetFormat, source })
  const dateFilter = buildStatisticDateFilterSql({ startDate, endDate })

  const diasOrigem = startDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)))
    : 90

  const [
    totalDatasets,
    totalViews,
    totalDownloads,
    topViewedStats,
    topDownloadedStats,
    conversionStats,
    categoryStats,
    utilizadoresStats,
    resumoOrigem,
    logoBase64,
  ] = await Promise.all([
    (async () => {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as total FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id WHERE 1=1 ${datasetFilter.whereSql}`,
        datasetFilter.values
      ) as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as total FROM Statistic s JOIN Dataset d ON s.datasetId = d.id
         LEFT JOIN Category c ON d.categoryId = c.id WHERE s.type = 'view' ${dateFilter.whereSql} ${datasetFilter.whereSql}`,
        [...dateFilter.values, ...datasetFilter.values]
      ) as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as total FROM Statistic s JOIN Dataset d ON s.datasetId = d.id
         LEFT JOIN Category c ON d.categoryId = c.id WHERE s.type = 'download' ${dateFilter.whereSql} ${datasetFilter.whereSql}`,
        [...dateFilter.values, ...datasetFilter.values]
      ) as any
      return rows[0]?.total ?? 0
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT s.datasetId, COUNT(*) as cnt FROM Statistic s JOIN Dataset d ON s.datasetId = d.id
         LEFT JOIN Category c ON d.categoryId = c.id WHERE s.type = 'view' ${dateFilter.whereSql} ${datasetFilter.whereSql}
         GROUP BY s.datasetId ORDER BY cnt DESC LIMIT 10`,
        [...dateFilter.values, ...datasetFilter.values]
      ) as any
      return rows as Array<{ datasetId: number; cnt: number }>
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT s.datasetId, COUNT(*) as cnt FROM Statistic s JOIN Dataset d ON s.datasetId = d.id
         LEFT JOIN Category c ON d.categoryId = c.id WHERE s.type = 'download' ${dateFilter.whereSql} ${datasetFilter.whereSql}
         GROUP BY s.datasetId ORDER BY cnt DESC LIMIT 10`,
        [...dateFilter.values, ...datasetFilter.values]
      ) as any
      return rows as Array<{ datasetId: number; cnt: number }>
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT s.datasetId, s.type, COUNT(*) as cnt FROM Statistic s JOIN Dataset d ON s.datasetId = d.id
         LEFT JOIN Category c ON d.categoryId = c.id WHERE 1=1 ${dateFilter.whereSql} ${datasetFilter.whereSql}
         GROUP BY s.datasetId, s.type`,
        [...dateFilter.values, ...datasetFilter.values]
      ) as any
      return rows as Array<{ datasetId: number; type: 'view' | 'download'; cnt: number }>
    })(),
    (async () => {
      const [rows] = await db.execute(
        `SELECT c.name as categoryName, COUNT(d.id) as count FROM Category c
         LEFT JOIN Dataset d ON d.categoryId = c.id ${datasetFormat ? 'AND d.format = ?' : ''} ${source ? 'AND d.source = ?' : ''}
         ${categoryName ? 'WHERE c.name = ?' : ''} GROUP BY c.id`,
        [
          ...(datasetFormat ? [datasetFormat] : []),
          ...(source ? [source] : []),
          ...(categoryName ? [categoryName] : []),
        ]
      ) as any
      return rows as Array<{ categoryName: string; count: number }>
    })(),
    (async () => {
      try {
        const [totalRows] = await db.execute('SELECT COUNT(*) as total FROM users') as any
        const [verificadosRows] = await db.execute('SELECT COUNT(*) as total FROM users WHERE email_verified = 1') as any
        const [activosRows] = await db.execute(
          "SELECT COUNT(*) as total FROM users WHERE active IS NULL OR active = 1"
        ) as any
        const condicoesPeriodo: string[] = []
        const valoresPeriodo: any[] = []
        if (startDate) { condicoesPeriodo.push('created_at >= ?'); valoresPeriodo.push(startDate) }
        if (endDate) { condicoesPeriodo.push('created_at <= ?'); valoresPeriodo.push(endDate) }
        const whereNovos = condicoesPeriodo.length ? `WHERE ${condicoesPeriodo.join(' AND ')}` : ''
        const [novosRows] = await db.execute(`SELECT COUNT(*) as total FROM users ${whereNovos}`, valoresPeriodo) as any
        return {
          total: Number(totalRows[0]?.total ?? 0),
          verificados: Number(verificadosRows[0]?.total ?? 0),
          activos: Number(activosRows[0]?.total ?? 0),
          novosNoPeriodo: Number(novosRows[0]?.total ?? 0),
        }
      } catch (erro) {
        logger.error('erro_obter_utilizadores_pdf', { error: erro })
        return { total: 0, verificados: 0, activos: 0, novosNoPeriodo: 0 }
      }
    })(),
    obterResumoOrigem(diasOrigem).catch(() => null),
    carregarLogoBase64(),
  ])

  const topViewedIds = topViewedStats.map((s: any) => s.datasetId)
  const topViewedCounts = new Map(topViewedStats.map((s: any) => [s.datasetId, s.cnt]))
  const topViewed = topViewedIds.length
    ? await (async () => {
        const placeholders = topViewedIds.map(() => '?').join(',')
        const [rows] = await db.execute(
          `SELECT d.*, c.name as categoryName FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id
           WHERE d.id IN (${placeholders}) ${datasetFilter.whereSql}`,
          [...topViewedIds, ...datasetFilter.values]
        ) as any
        return (rows as any[])
          .map(r => ({ ...r, category: { name: r.categoryName }, periodViews: topViewedCounts.get(r.id) || 0 }))
          .sort((a, b) => (b.periodViews || 0) - (a.periodViews || 0))
      })()
    : []

  const topDownloadedIds = topDownloadedStats.map((s: any) => s.datasetId)
  const topDownloadedCounts = new Map(topDownloadedStats.map((s: any) => [s.datasetId, s.cnt]))
  const topDownloaded = topDownloadedIds.length
    ? await (async () => {
        const placeholders = topDownloadedIds.map(() => '?').join(',')
        const [rows] = await db.execute(
          `SELECT d.*, c.name as categoryName FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id
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

  const topViewedEnriched = topViewed.map((d: any) => ({ ...d, periodDownloads: byDataset[String(d.id)]?.downloads ?? 0 }))
  const topDownloadedEnriched = topDownloaded.map((d: any) => ({ ...d, periodViews: byDataset[String(d.id)]?.views ?? 0 }))
  const avgConversionRate = totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width

  const cabecalhoSeccao = (titulo: string, y: number): number => {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COR_PRIMARIA)
    doc.text(titulo, 20, y)
    doc.setDrawColor(...COR_AMBAR)
    doc.setLineWidth(0.8)
    doc.line(20, y + 2, 60, y + 2)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COR_TEXTO)
    return y + 10
  }

  doc.setFillColor(...COR_PRIMARIA)
  doc.rect(0, 0, pageWidth, 38, 'F')
  doc.setFillColor(...COR_AMBAR)
  doc.rect(0, 38, pageWidth * 0.34, 1.4, 'F')
  doc.setFillColor(...COR_VIOLETA)
  doc.rect(pageWidth * 0.34, 38, pageWidth * 0.34, 1.4, 'F')

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 16, 8, 22, 22)
    } catch (erro) {
      logger.error('erro_inserir_logo_pdf', { error: erro })
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Data Portal', logoBase64 ? 44 : 20, 18)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatório administrativo · Data4Moz', logoBase64 ? 44 : 20, 26)

  doc.setFontSize(9)
  doc.text(`Gerado por ${geradoPor}`, pageWidth - 20, 14, { align: 'right' })
  doc.text(new Date().toLocaleString('pt-PT'), pageWidth - 20, 20, { align: 'right' })

  let y = 52
  doc.setTextColor(...COR_TEXTO)

  if (categoryName || datasetFormat || source || startDate || endDate) {
    doc.setFontSize(9)
    doc.setTextColor(...COR_TEXTO_SUAVE)
    doc.text(
      `Filtros aplicados: ${[
        categoryName ? `Categoria=${categoryName}` : null,
        datasetFormat ? `Formato=${datasetFormat}` : null,
        source ? `Fonte=${source}` : null,
        startDate ? `Início=${startDate}` : null,
        endDate ? `Fim=${endDate}` : null,
      ].filter(Boolean).join('  ·  ')}`,
      20, y
    )
    y += 8
    doc.setTextColor(...COR_TEXTO)
  }

  y = cabecalhoSeccao('Sumário executivo', y + 4)
  doc.setFontSize(11)
  const sumarioLinhas = [
    `Total de datasets: ${totalDatasets}`,
    `Total de visualizações: ${totalViews.toLocaleString('pt-BR')}`,
    `Total de downloads: ${totalDownloads.toLocaleString('pt-BR')}`,
    `Taxa de conversão média (downloads/visualizações): ${avgConversionRate.toFixed(2)}%`,
  ]
  for (const linha of sumarioLinhas) {
    doc.text(linha, 22, y)
    y += 7
  }

  y = cabecalhoSeccao('Utilizadores da plataforma', y + 4)
  autoTable(doc, {
    startY: y,
    head: [['Total de contas', 'Emails verificados', 'Contas activas', `Novas no período`]],
    body: [[
      String(utilizadoresStats.total),
      String(utilizadoresStats.verificados),
      String(utilizadoresStats.activos),
      String(utilizadoresStats.novosNoPeriodo),
    ]],
    theme: 'grid',
    styles: { fontSize: 10, textColor: COR_TEXTO, halign: 'center' },
    headStyles: { fillColor: COR_PRIMARIA, textColor: [255, 255, 255], fontSize: 9 },
  })
  y = (doc as any).lastAutoTable.finalY + 12

  if (resumoOrigem && resumoOrigem.totalEventos > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    y = cabecalhoSeccao(`Origem dos acessos (últimos ${diasOrigem} dias)`, y)
    doc.setFontSize(9.5)
    doc.setTextColor(...COR_TEXTO_SUAVE)
    doc.text(
      `${resumoOrigem.totalEventos.toLocaleString('pt-BR')} evento(s) registado(s) em ${resumoOrigem.totalPaises} país(es). Localização aproximada pelo IP; o IP em si nunca é guardado.`,
      20, y, { maxWidth: pageWidth - 40 }
    )
    y += 8
    doc.setTextColor(...COR_TEXTO)

    if (resumoOrigem.porPais.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['País', 'Eventos']],
        body: resumoOrigem.porPais.slice(0, 8).map((p) => [nomePais(p.pais), String(p.total)]),
        theme: 'striped',
        styles: { fontSize: 9, textColor: COR_TEXTO },
        headStyles: { fillColor: COR_VIOLETA, textColor: [255, 255, 255], fontSize: 9 },
        margin: { right: pageWidth / 2 + 5 },
        tableWidth: pageWidth / 2 - 25,
      })
      const yAposPais = (doc as any).lastAutoTable.finalY

      if (resumoOrigem.porProvinciaMZ.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Província (MZ)', 'Eventos']],
          body: resumoOrigem.porProvinciaMZ.slice(0, 8).map((p) => [p.regiao, String(p.total)]),
          theme: 'striped',
          styles: { fontSize: 9, textColor: COR_TEXTO },
          headStyles: { fillColor: COR_AMBAR, textColor: [255, 255, 255], fontSize: 9 },
          margin: { left: pageWidth / 2 + 5 },
          tableWidth: pageWidth / 2 - 25,
        })
      }
      y = Math.max(yAposPais, (doc as any).lastAutoTable.finalY) + 12
    } else {
      y += 4
    }
  }

  if (y > 230) { doc.addPage(); y = 20 }
  y = cabecalhoSeccao('Distribuição de datasets por categoria', y)
  const categoryTableData = categoryStats.map((cat: any) => [cat.categoryName, cat.count.toString()])
  autoTable(doc, {
    startY: y,
    head: [['Categoria', 'Quantidade']],
    body: categoryTableData,
    theme: 'grid',
    styles: { fillColor: [247, 249, 248], textColor: COR_TEXTO, fontSize: 10 },
    headStyles: { fillColor: COR_PRIMARIA, textColor: [255, 255, 255], fontSize: 11 },
  })
  y = (doc as any).lastAutoTable.finalY + 12

  const hasPeriodFilter = Boolean(startDate || endDate)
  const viewedColLabel = hasPeriodFilter ? 'Visualizações (período)' : 'Visualizações'
  const downloadedColLabel = hasPeriodFilter ? 'Downloads (período)' : 'Downloads'

  if (topViewedEnriched.length > 0) {
    if (y > 230) { doc.addPage(); y = 20 }
    y = cabecalhoSeccao('Top datasets visualizados', y)
    const topViewedData = topViewedEnriched.map((dataset: any) => [
      dataset.title.length > 30 ? dataset.title.substring(0, 30) + '...' : dataset.title,
      dataset.category.name,
      String(hasPeriodFilter ? (dataset.periodViews ?? 0) : (dataset.periodViews ?? dataset.views)),
      String(hasPeriodFilter ? (dataset.periodDownloads ?? 0) : (dataset.periodDownloads ?? dataset.downloads)),
    ])
    autoTable(doc, {
      startY: y,
      head: [['Título', 'Categoria', viewedColLabel, downloadedColLabel]],
      body: topViewedData,
      theme: 'grid',
      styles: { fillColor: [255, 255, 255], textColor: COR_TEXTO, fontSize: 9 },
      headStyles: { fillColor: COR_VIOLETA, textColor: [255, 255, 255], fontSize: 10 },
    })
    y = (doc as any).lastAutoTable.finalY + 12
  }

  if (topDownloadedEnriched.length > 0) {
    if (y > 230) { doc.addPage(); y = 20 }
    y = cabecalhoSeccao('Top datasets baixados', y)
    const topDownloadedData = topDownloadedEnriched.map((dataset: any) => [
      dataset.title.length > 30 ? dataset.title.substring(0, 30) + '...' : dataset.title,
      dataset.category.name,
      String(hasPeriodFilter ? (dataset.periodDownloads ?? 0) : (dataset.periodDownloads ?? dataset.downloads)),
      String(hasPeriodFilter ? (dataset.periodViews ?? 0) : (dataset.periodViews ?? dataset.views)),
    ])
    autoTable(doc, {
      startY: y,
      head: [['Título', 'Categoria', downloadedColLabel, viewedColLabel]],
      body: topDownloadedData,
      theme: 'grid',
      styles: { fillColor: [255, 255, 255], textColor: COR_TEXTO, fontSize: 9 },
      headStyles: { fillColor: COR_AMBAR, textColor: [255, 255, 255], fontSize: 10 },
    })
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const alturaPagina = doc.internal.pageSize.height
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.3)
    doc.line(20, alturaPagina - 16, pageWidth - 20, alturaPagina - 16)
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 20, alturaPagina - 13, 7, 7)
      } catch { /* falha ao inserir mini-logo não deve impedir o resto do rodapé */ }
    }
    doc.setTextColor(...COR_TEXTO_SUAVE)
    doc.setFontSize(8.5)
    doc.text('Data Portal · Data4Moz · dataportal.co.mz', logoBase64 ? 30 : 20, alturaPagina - 9)
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, alturaPagina - 9, { align: 'right' })
  }

  return Buffer.from(doc.output('arraybuffer'))
}
