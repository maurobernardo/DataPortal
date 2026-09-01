import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { definirCertificacaoDataset, type CertificacaoDataset } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'

const VALORES_VALIDOS = new Set<CertificacaoDataset>(['nao_verificado', 'fonte_oficial_confirmada'])

/** Selo de proveniência por dataset: distingue fonte oficial confirmada por uma pessoa de dataset
 *  ainda não verificado. Nunca é definido automaticamente — é sempre uma decisão humana explícita. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
    }

    const id = Number.parseInt(params.id, 10)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const certificacao = body?.certificacao as CertificacaoDataset
    if (!VALORES_VALIDOS.has(certificacao)) {
      return NextResponse.json({ error: 'Valor de certificação inválido' }, { status: 400 })
    }

    await definirCertificacaoDataset(id, certificacao)
    await logAudit({
      actorEmail: admin.email,
      action: certificacao === 'fonte_oficial_confirmada' ? 'certificar_dataset' : 'remover_certificacao_dataset',
      entityType: 'dataset',
      entityId: id,
    })

    return NextResponse.json({ success: true, certificacao })
  } catch (error) {
    logger.error('erro_definir_certificacao_dataset', { error })
    return NextResponse.json({ error: 'Erro ao actualizar certificação' }, { status: 500 })
  }
}
