import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import nodemailer from 'nodemailer'

let tabelaGarantida = false

async function garantirTabela() {
  if (tabelaGarantida) return
  await db.execute(
    `CREATE TABLE IF NOT EXISTS SecurityEvent (
      id INT NOT NULL AUTO_INCREMENT,
      tipo VARCHAR(60) NOT NULL,
      identificador VARCHAR(254) NOT NULL,
      ip VARCHAR(64) NULL,
      detalhe TEXT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX securityevent_tipo_identificador_idx (tipo, identificador, createdAt)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  tabelaGarantida = true
}

// Evita mandar um email por cada tentativa a mais depois de já ter alertado — no máximo um
// alerta por (tipo, identificador) a cada janela, mesmo que o ataque continue.
const ultimoAlertaEnviado = new Map<string, number>()
const JANELA_DEDUPE_MS = 60 * 60 * 1000
const LIMIAR_ALERTA = 3

/**
 * Regista um bloqueio de rate limit num ponto sensível (login, 2FA, recuperação de senha) como
 * "sinal de intrusão", e dispara um alerta por email para os administradores se o mesmo alvo for
 * bloqueado repetidamente num curto período — a aproximação possível a um WAF/IDS neste hosting
 * partilhado (sem acesso a um WAF de rede dedicado). Nunca lança erro: uma falha aqui não pode
 * impedir a resposta 429 já devolvida ao pedido original.
 */
export async function registarBloqueioSeguranca(tipo: string, identificador: string, ip: string): Promise<void> {
  try {
    await garantirTabela()
    await db.execute('INSERT INTO SecurityEvent (tipo, identificador, ip) VALUES (?, ?, ?)', [tipo, identificador, ip])

    const [rows] = (await db.execute(
      `SELECT COUNT(*) as total FROM SecurityEvent WHERE tipo = ? AND identificador = ? AND createdAt > (NOW() - INTERVAL 1 DAY)`,
      [tipo, identificador]
    )) as [{ total: number }[], unknown]
    const total = Number(rows[0]?.total || 0)

    if (total < LIMIAR_ALERTA) return

    const chave = `${tipo}:${identificador}`
    const agora = Date.now()
    const ultimo = ultimoAlertaEnviado.get(chave) || 0
    if (agora - ultimo < JANELA_DEDUPE_MS) return
    ultimoAlertaEnviado.set(chave, agora)

    await enviarAlertaIntrusao(tipo, identificador, ip, total)
  } catch (error) {
    logger.error('security_events.erro', { error, tipo, identificador })
  }
}

async function enviarAlertaIntrusao(tipo: string, identificador: string, ip: string, total: number): Promise<void> {
  const destinatarios = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
  if (destinatarios.length === 0) return
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.error('security_events.alerta_sem_smtp', { tipo, identificador, ip, total })
    return
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    await transporter.sendMail({
      from: `"Data Portal - Segurança" <${process.env.SMTP_USER}>`,
      to: destinatarios.join(','),
      subject: `Data Portal: possível intrusão detectada (${tipo})`,
      text: [
        `Foram detectados ${total} bloqueios de rate limit nas últimas 24 horas.`,
        '',
        `Tipo: ${tipo}`,
        `Alvo: ${identificador}`,
        `Último IP: ${ip}`,
        '',
        'Isto pode ser um ataque de força bruta ou credential stuffing. Considere bloquear o IP ou desactivar a conta se aplicável.',
      ].join('\n'),
    })
  } catch (error) {
    logger.error('security_events.erro_enviar_alerta', { error })
  }
}
