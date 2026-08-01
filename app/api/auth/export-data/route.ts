import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserExportData } from '@/lib/db'

export async function GET() {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Sessão expirada. Inicie sessão novamente.' }, { status: 401 })
  }

  const data = await getUserExportData(session.userId)
  if (!data) {
    return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 })
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="dataportal-os-meus-dados.json"',
    },
  })
}
