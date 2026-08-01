import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const source = searchParams.get('source');
    const format = searchParams.get('format');
    const year = searchParams.get('year');

    const conditions: string[] = []
    const values: any[] = []

    if (category) { conditions.push('d.categoryId = ?'); values.push(parseInt(category)) }
    if (format) { conditions.push('d.format = ?'); values.push(format) }
    if (source) { conditions.push('d.source = ?'); values.push(source) }
    if (year) { conditions.push('d.year = ?'); values.push(parseInt(year)) }
    if (search) {
      conditions.push('(d.title LIKE ? OR d.description LIKE ? OR d.keywords LIKE ?)')
      values.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const [rows] = await db.execute(
      `SELECT COUNT(*) as total FROM Dataset d ${whereSql}`,
      values
    ) as any
    const total = rows[0]?.total ?? 0

    return NextResponse.json({ total });
  } catch (error) {
    logger.error('error_counting_datasets', { error: error });
    return NextResponse.json(
      { error: 'Erro ao contar datasets' },
      { status: 500 }
    );
  }
}