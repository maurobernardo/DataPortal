import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { pastaDoNivel, type NivelBackup } from '@/lib/backup/rotacao'

export const dynamic = 'force-dynamic'

const NIVEIS_VALIDOS: NivelBackup[] = ['diario', 'semanal', 'mensal']

export async function GET(request: NextRequest, { params }: { params: { nivel: string; ficheiro: string } }) {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Acesso reservado a administradores' }, { status: 403 })
  }

  if (!NIVEIS_VALIDOS.includes(params.nivel as NivelBackup)) {
    return NextResponse.json({ error: 'Nível de backup inválido' }, { status: 400 })
  }

  // path.basename() descarta qualquer "../" ou separador de directório no nome recebido: o
  // ficheiro servido nunca pode sair da pasta do nível pedido.
  const nomeFicheiro = path.basename(params.ficheiro)
  if (!nomeFicheiro.endsWith('.sql')) {
    return NextResponse.json({ error: 'Ficheiro inválido' }, { status: 400 })
  }

  const caminhoCompleto = path.join(pastaDoNivel(params.nivel as NivelBackup), nomeFicheiro)
  if (!fs.existsSync(caminhoCompleto)) {
    return NextResponse.json({ error: 'Backup não encontrado' }, { status: 404 })
  }

  const conteudo = fs.readFileSync(caminhoCompleto)
  return new NextResponse(conteudo, {
    headers: {
      'Content-Type': 'application/sql',
      'Content-Disposition': `attachment; filename="${nomeFicheiro}"`,
    },
  })
}
