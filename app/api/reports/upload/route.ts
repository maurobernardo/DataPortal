export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { getCurrentUser } from '@/lib/auth'
import { createUserReportUpload } from '@/lib/db'
import { processarRelatorio, reservarProcessamento } from '@/lib/relatorios/processar'
import { concederAcesso, registarPedido } from '@/lib/relatorios/persistencia'
import { obterEstadoLimite, MENSAGEM_LIMITE_ATINGIDO } from '@/lib/limite-analises-gratis'
import { rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'

const TAMANHO_MAX = 30 * 1024 * 1024 // 30MB: um relatório é texto, não precisa do limite de 100MB dos datasets

function formatarTamanho(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const tamanhos = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + tamanhos[i]
}

/**
 * Um utilizador envia o seu próprio relatório em PDF para o portal analisar — o mesmo pipeline
 * (extracção de texto + digesto por IA) que já corre sobre os relatórios oficiais, ver
 * lib/relatorios/processar.ts. Guardado na tabela `Report` com `origem = 'utilizador'`, visível só
 * a quem o enviou (e à equipa, no admin) até alguém da equipa decidir publicá-lo no catálogo.
 */
export async function POST(request: NextRequest) {
  try {
    const sessao = await getCurrentUser()
    if (!sessao) {
      return NextResponse.json({ error: 'É preciso ter sessão iniciada para enviar um relatório.' }, { status: 401 })
    }

    const rl = await rateLimit(`report-upload:${sessao.userId}`, 5, 60 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitos relatórios enviados. Tente novamente daqui a algum tempo.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    // Enviar o próprio relatório conta para o mesmo limite de 2 análises gratuitas do AI
    // Insights — ver lib/limite-analises-gratis.ts. Um envio novo é sempre um relatório novo
    // (nunca reaproveitado de outra conta), por isso conta sempre, sem excepção.
    const limite = await obterEstadoLimite(sessao.userId, sessao.role === 'admin')
    if (limite.atingiu) {
      return NextResponse.json({ error: MENSAGEM_LIMITE_ATINGIDO }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tituloEnviado = String(formData.get('title') || '').trim()

    if (!file) {
      return NextResponse.json({ error: 'Nenhum ficheiro enviado.' }, { status: 400 })
    }
    if (file.size > TAMANHO_MAX) {
      return NextResponse.json({ error: 'Ficheiro muito grande. Tamanho máximo: 30MB.' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Só ficheiros PDF podem ser enviados.' }, { status: 400 })
    }

    const pastaDestino = join(process.cwd(), 'public', 'uploads', 'relatorios-utilizadores')
    if (!existsSync(pastaDestino)) {
      await mkdir(pastaDestino, { recursive: true })
    }

    const nomeFicheiro = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}.pdf`
    const bytes = await file.arrayBuffer()
    await writeFile(join(pastaDestino, nomeFicheiro), Buffer.from(bytes))

    const titulo = tituloEnviado.slice(0, 490) || file.name.replace(/\.pdf$/i, '').slice(0, 490)
    const relatorio = await createUserReportUpload({
      title: titulo,
      filePath: `/uploads/relatorios-utilizadores/${nomeFicheiro}`,
      fileSize: formatarTamanho(file.size),
      userId: sessao.userId,
    })

    // Quem envia o próprio relatório não paga para o ver analisado: ao contrário de um relatório
    // oficial (onde "desbloquear" é a funcionalidade paga), aqui o acesso já é concedido no envio.
    await registarPedido(relatorio.id, sessao.userId)
    await concederAcesso(relatorio.id, sessao.userId)

    // Mesmo desenho do POST /api/reports/[id]/analisar: dispara o processamento sem esperar por
    // ele (um PDF grande pode levar bem mais do que o limite de tempo do proxy à frente da
    // aplicação), e a página do relatório já sabe perguntar de 4 em 4 segundos se terminou.
    if (await reservarProcessamento(relatorio.id)) {
      processarRelatorio(relatorio.id, sessao.userId).catch((erro) =>
        logger.error('erro_processar_relatorio_enviado_por_utilizador', { error: erro, reportId: relatorio.id })
      )
    }

    return NextResponse.json({ id: relatorio.id })
  } catch (error) {
    logger.error('erro_enviar_relatorio_utilizador', { error })
    return NextResponse.json({ error: 'Erro ao enviar o relatório.' }, { status: 500 })
  }
}
