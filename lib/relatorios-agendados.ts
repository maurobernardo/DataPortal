import { db } from '@/lib/db'
import { gerarRelatorioPdfBuffer } from '@/lib/relatorio-pdf'
import { sendRelatorioAgendadoEmail } from '@/lib/mailer'
import { logger } from '@/lib/logger'

/**
 * Exportação agendada de relatórios: em vez de o admin ter de se lembrar de entrar e clicar em
 * "Exportar PDF" toda semana/mês, o admin configura aqui uma vez e o relatório passa a chegar por
 * email sozinho. Como o Next.js não tem um agendador embutido, o disparo real acontece quando algo
 * externo chama GET /api/cron/relatorios-agendados (ver esse ficheiro) — esta função só decide
 * quais agendamentos estão vencidos hoje e envia-os; não agenda nada sozinha.
 */

export type FrequenciaRelatorio = 'semanal' | 'mensal'

export type RelatorioAgendado = {
  id: number
  nome: string
  frequencia: FrequenciaRelatorio
  diaSemana: number | null // 0=domingo .. 6=sábado, só para 'semanal'
  diaMes: number | null // 1..28, só para 'mensal'
  destinatarios: string[]
  filtroCategoria: string | null
  filtroFormato: string | null
  filtroFonte: string | null
  activo: boolean
  criadoPor: string
  criadoEm: string
  ultimoEnvioEm: string | null
}

async function garantirTabela() {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS relatorios_agendados (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(120) NOT NULL,
      frequencia ENUM('semanal','mensal') NOT NULL,
      diaSemana TINYINT NULL,
      diaMes TINYINT NULL,
      destinatarios TEXT NOT NULL,
      filtroCategoria VARCHAR(120) NULL,
      filtroFormato VARCHAR(40) NULL,
      filtroFonte VARCHAR(120) NULL,
      activo TINYINT NOT NULL DEFAULT 1,
      criadoPor VARCHAR(190) NOT NULL,
      criadoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ultimoEnvioEm DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  )
}

function linhaParaRelatorio(r: any): RelatorioAgendado {
  return {
    id: r.id,
    nome: r.nome,
    frequencia: r.frequencia,
    diaSemana: r.diaSemana === null ? null : Number(r.diaSemana),
    diaMes: r.diaMes === null ? null : Number(r.diaMes),
    destinatarios: JSON.parse(r.destinatarios || '[]'),
    filtroCategoria: r.filtroCategoria,
    filtroFormato: r.filtroFormato,
    filtroFonte: r.filtroFonte,
    activo: Boolean(r.activo),
    criadoPor: r.criadoPor,
    criadoEm: r.criadoEm instanceof Date ? r.criadoEm.toISOString() : String(r.criadoEm),
    ultimoEnvioEm: r.ultimoEnvioEm ? (r.ultimoEnvioEm instanceof Date ? r.ultimoEnvioEm.toISOString() : String(r.ultimoEnvioEm)) : null,
  }
}

export async function listarRelatoriosAgendados(): Promise<RelatorioAgendado[]> {
  await garantirTabela()
  const [rows] = await db.execute('SELECT * FROM relatorios_agendados ORDER BY criadoEm DESC') as any
  return (rows as any[]).map(linhaParaRelatorio)
}

export async function criarRelatorioAgendado(dados: {
  nome: string
  frequencia: FrequenciaRelatorio
  diaSemana: number | null
  diaMes: number | null
  destinatarios: string[]
  filtroCategoria?: string | null
  filtroFormato?: string | null
  filtroFonte?: string | null
  criadoPor: string
}): Promise<RelatorioAgendado> {
  await garantirTabela()
  const [resultado] = await db.execute(
    `INSERT INTO relatorios_agendados
      (nome, frequencia, diaSemana, diaMes, destinatarios, filtroCategoria, filtroFormato, filtroFonte, activo, criadoPor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      dados.nome,
      dados.frequencia,
      dados.frequencia === 'semanal' ? dados.diaSemana : null,
      dados.frequencia === 'mensal' ? dados.diaMes : null,
      JSON.stringify(dados.destinatarios),
      dados.filtroCategoria || null,
      dados.filtroFormato || null,
      dados.filtroFonte || null,
      dados.criadoPor,
    ]
  ) as any
  const [rows] = await db.execute('SELECT * FROM relatorios_agendados WHERE id = ?', [resultado.insertId]) as any
  return linhaParaRelatorio(rows[0])
}

export async function actualizarRelatorioAgendado(
  id: number,
  dados: Partial<{ activo: boolean; nome: string; destinatarios: string[] }>
): Promise<void> {
  await garantirTabela()
  const campos: string[] = []
  const valores: any[] = []
  if (dados.activo !== undefined) { campos.push('activo = ?'); valores.push(dados.activo ? 1 : 0) }
  if (dados.nome !== undefined) { campos.push('nome = ?'); valores.push(dados.nome) }
  if (dados.destinatarios !== undefined) { campos.push('destinatarios = ?'); valores.push(JSON.stringify(dados.destinatarios)) }
  if (campos.length === 0) return
  valores.push(id)
  await db.execute(`UPDATE relatorios_agendados SET ${campos.join(', ')} WHERE id = ?`, valores)
}

export async function removerRelatorioAgendado(id: number): Promise<void> {
  await garantirTabela()
  await db.execute('DELETE FROM relatorios_agendados WHERE id = ?', [id])
}

function jaEnviadoHoje(ultimoEnvioEm: string | null, agora: Date): boolean {
  if (!ultimoEnvioEm) return false
  const anterior = new Date(ultimoEnvioEm)
  return (
    anterior.getFullYear() === agora.getFullYear() &&
    anterior.getMonth() === agora.getMonth() &&
    anterior.getDate() === agora.getDate()
  )
}

function estaVencidoHoje(r: RelatorioAgendado, agora: Date): boolean {
  if (jaEnviadoHoje(r.ultimoEnvioEm, agora)) return false
  if (r.frequencia === 'semanal') {
    return agora.getDay() === (r.diaSemana ?? 1)
  }
  // mensal: dispara no dia configurado, ou no último dia do mês se este tiver menos dias (ex.: dia 30 em Fevereiro)
  const ultimoDiaDoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate()
  const diaAlvo = Math.min(r.diaMes ?? 1, ultimoDiaDoMes)
  return agora.getDate() === diaAlvo
}

/**
 * Chamada pela rota de cron (app/api/cron/relatorios-agendados/route.ts). Percorre os agendamentos
 * activos, envia por email os que estão vencidos hoje e ainda não tinham sido enviados, e marca
 * ultimoEnvioEm. Cada envio usa uma janela de dados igual à sua própria frequência (7 ou 30 dias),
 * para o relatório reflectir só o período desde o último envio.
 */
export async function executarRelatoriosDevidos(): Promise<{ processados: number; enviados: number; erros: number }> {
  const agendamentos = await listarRelatoriosAgendados()
  const agora = new Date()
  let enviados = 0
  let erros = 0
  let processados = 0

  for (const r of agendamentos) {
    if (!r.activo) continue
    if (!estaVencidoHoje(r, agora)) continue
    processados++

    try {
      const dias = r.frequencia === 'semanal' ? 7 : 30
      const inicio = new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000)
      const pdfBuffer = await gerarRelatorioPdfBuffer({
        startDate: inicio.toISOString().slice(0, 10),
        endDate: agora.toISOString().slice(0, 10),
        categoryName: r.filtroCategoria,
        datasetFormat: r.filtroFormato,
        source: r.filtroFonte,
        geradoPor: 'Envio agendado automático',
      })

      const periodoLabel = r.frequencia === 'semanal' ? 'dos últimos 7 dias' : 'dos últimos 30 dias'
      for (const destinatario of r.destinatarios) {
        await sendRelatorioAgendadoEmail(destinatario, r.nome, periodoLabel, pdfBuffer)
      }

      await db.execute('UPDATE relatorios_agendados SET ultimoEnvioEm = NOW() WHERE id = ?', [r.id])
      enviados++
    } catch (erro) {
      erros++
      logger.error('erro_enviar_relatorio_agendado', { error: erro, agendamentoId: r.id })
    }
  }

  return { processados, enviados, erros }
}
