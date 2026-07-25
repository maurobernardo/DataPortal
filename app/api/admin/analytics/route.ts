import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = Math.min(Math.max(Number.parseInt(searchParams.get('days') || '30', 10) || 30, 1), 365)

    const [topDownloadsRows, topViewsRows, downloadsByDayRows] = await Promise.all([
      (async () => {
        const [rows] = await db.execute(
          `SELECT id, title, downloads, views, dataType, format, year, source
           FROM Dataset
           ORDER BY downloads DESC, views DESC
           LIMIT 10`
        ) as any
        return rows
      })(),
      (async () => {
        const [rows] = await db.execute(
          `SELECT id, title, views, downloads, dataType, format, year, source
           FROM Dataset
           ORDER BY views DESC, downloads DESC
           LIMIT 10`
        ) as any
        return rows
      })(),
      (async () => {
        const [rows] = await db.execute(
          `SELECT DATE(createdAt) AS day, COUNT(*) AS downloads
           FROM Statistic
           WHERE type = 'download' AND createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
           GROUP BY DATE(createdAt)
           ORDER BY day ASC`,
          [days]
        ) as any
        return rows
      })(),
    ])

    return NextResponse.json({
      days,
      topDownloads: topDownloadsRows,
      topViews: topViewsRows,
      downloadsByDay: downloadsByDayRows,
    })
  } catch (error: any) {
    console.error('Error analytics:', error)
    return NextResponse.json({ error: 'Erro ao carregar analytics' }, { status: 500 })
  }
}

