import nodemailer from 'nodemailer'

type MailPayload = {
  fromName: string
  fromEmail: string
  subject: string
  message: string
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variavel de ambiente ausente: ${name}`)
  }
  return value
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
  const host = getRequiredEnv('SMTP_HOST')
  const port = Number(getRequiredEnv('SMTP_PORT'))
  const user = getRequiredEnv('SMTP_USER')
  const pass = getRequiredEnv('SMTP_PASS')
  const recipient = getRequiredEnv('CONTACT_RECIPIENT_EMAIL')
  const secure = process.env.SMTP_SECURE === 'true'

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })

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
