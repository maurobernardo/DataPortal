import nodemailer from 'nodemailer'

type MailPayload = {
  fromName: string
  fromEmail: string
  subject: string
  message: string
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Variavel de ambiente ausente: ${name}`)
  }
  return value
}

export function hasAuthMailConfig(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_PORT?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  )
}

function createSmtpTransporter() {
  const host = getRequiredEnv('SMTP_HOST')
  const port = Number(getRequiredEnv('SMTP_PORT'))
  const user = getRequiredEnv('SMTP_USER')
  const pass = getRequiredEnv('SMTP_PASS')
  const secure = process.env.SMTP_SECURE === 'true'

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
}

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export function hasMailConfig(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.CONTACT_RECIPIENT_EMAIL
  )
}

export async function sendContactEmail(payload: MailPayload): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const recipient = getRequiredEnv('CONTACT_RECIPIENT_EMAIL')
  const transporter = createSmtpTransporter()

  await transporter.sendMail({
    from: `"Data Portal - Contacto" <${user}>`,
    to: recipient,
    replyTo: `${payload.fromName} <${payload.fromEmail}>`,
    subject: `[Contacto Portal] ${payload.subject}`,
    text: [
      `Nome: ${payload.fromName}`,
      `Email: ${payload.fromEmail}`,
      `Assunto: ${payload.subject}`,
      '',
      'Mensagem:',
      payload.message,
    ].join('\n'),
  })
}

export async function sendRegistrationVerificationEmail(
  to: string,
  code: string,
  token: string
): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const transporter = createSmtpTransporter()
  const confirmUrl = `${getSiteUrl()}/verificar-email?token=${encodeURIComponent(token)}`

  await transporter.sendMail({
    from: `"Data Portal" <${user}>`,
    to,
    subject: 'Confirme o seu registo — Data Portal',
    text: [
      'Obrigado por se registar no Data Portal.',
      '',
      `Código de confirmação: ${code}`,
      '',
      'Introduza este código na página de verificação (válido por 30 minutos).',
      '',
      `Ou confirme pelo link: ${confirmUrl}`,
      '',
      'Se não criou esta conta, ignore este email.',
    ].join('\n'),
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1F2A24;max-width:560px">
        <h2 style="color:#064E2C;margin:0 0 16px">Confirme o seu registo</h2>
        <p>Obrigado por se registar no <strong>Data Portal</strong>.</p>
        <p>Utilize o código abaixo para activar a sua conta (válido por <strong>30 minutos</strong>):</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#064E2C;margin:24px 0">${code}</p>
        <p style="margin:24px 0">
          <a href="${confirmUrl}" style="display:inline-block;background:#064E2C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
            Confirmar pelo link
          </a>
        </p>
        <p style="font-size:13px;color:#8B9A91">Se não criou esta conta, ignore este email.</p>
      </div>
    `,
  })
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const transporter = createSmtpTransporter()
  const confirmUrl = `${getSiteUrl()}/verificar-email?token=${encodeURIComponent(token)}`

  await transporter.sendMail({
    from: `"Data Portal" <${user}>`,
    to,
    subject: 'Confirme o seu email — Data Portal',
    text: [
      'Obrigado por se registar no Data Portal.',
      '',
      'Para activar a sua conta, confirme o seu email através do link abaixo (válido por 30 minutos):',
      confirmUrl,
      '',
      'Se não criou esta conta, ignore este email.',
    ].join('\n'),
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1F2A24;max-width:560px">
        <h2 style="color:#064E2C;margin:0 0 16px">Confirme o seu email</h2>
        <p>Obrigado por se registar no <strong>Data Portal</strong>.</p>
        <p>Clique no botão abaixo para activar a sua conta (link válido por <strong>30 minutos</strong>):</p>
        <p style="margin:24px 0">
          <a href="${confirmUrl}" style="display:inline-block;background:#064E2C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
            Confirmar email
          </a>
        </p>
        <p style="font-size:13px;color:#4A5A52">Ou copie este link: ${confirmUrl}</p>
        <p style="font-size:13px;color:#8B9A91">Se não criou esta conta, ignore este email.</p>
      </div>
    `,
  })
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const transporter = createSmtpTransporter()

  await transporter.sendMail({
    from: `"Data Portal" <${user}>`,
    to,
    subject: 'Código de verificação — Data Portal',
    text: [
      'Utilize o código abaixo para concluir o login no Data Portal:',
      '',
      code,
      '',
      'Este código expira em 5 minutos.',
      'Se não solicitou este código, ignore este email.',
    ].join('\n'),
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1F2A24;max-width:560px">
        <h2 style="color:#064E2C;margin:0 0 16px">Código de verificação</h2>
        <p>Utilize o código abaixo para concluir o login no <strong>Data Portal</strong>:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#064E2C;margin:24px 0">${code}</p>
        <p style="font-size:13px;color:#4A5A52">Este código expira em <strong>5 minutos</strong>.</p>
        <p style="font-size:13px;color:#8B9A91">Se não solicitou este código, ignore este email.</p>
      </div>
    `,
  })
}
