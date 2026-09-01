import { NextRequest } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { findUserByEmail } from '@/lib/db'
import { gerarRelatorioPdfBuffer } from '@/lib/relatorio-pdf'
import { logger } from '@/lib/logger'

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

    const pdfBuffer = await gerarRelatorioPdfBuffer({
      startDate, endDate, categoryName, datasetFormat, source,
      geradoPor: user.email,
    })

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="data-portal-relatorio.pdf"',
      },
    });
  } catch (error) {
    logger.error('erro_ao_gerar_relat_rio_pdf', { error: error });
    return new Response(JSON.stringify({ error: 'Erro ao gerar relatório PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
