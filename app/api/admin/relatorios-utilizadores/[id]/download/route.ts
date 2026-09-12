import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { findReportById } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Descarrega o PDF de um relatório enviado por um utilizador — só para admins, e só se o
 *  relatório realmente for de origem 'utilizador' (nunca serve qualquer outro id por este caminho). */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
  }

  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })
  }

  const relatorio = await findReportById(id)
  if (!relatorio || relatorio.origem !== 'utilizador' || !relatorio.filePath) {
    return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 })
  }

  const caminhoCompleto = path.join(process.cwd(), 'public', relatorio.filePath.replace(/^\/+/, ''))
  if (!fs.existsSync(caminhoCompleto)) {
    return NextResponse.json({ error: 'Ficheiro não encontrado no servidor' }, { status: 404 })
  }

  const conteudo = fs.readFileSync(caminhoCompleto)
  const nomeFicheiro = `${relatorio.title.replace(/[^a-zA-Z0-9._-]+/g, '_')}.pdf`
  return new NextResponse(new Uint8Array(conteudo), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomeFicheiro}"`,
    },
  })
}
