import nodemailer from 'nodemailer'

type MailPayload = {
  fromName: string
  fromEmail: string
  subject: string
  message: string
  purposeLabel?: string
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
  return (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
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

const CONTACT_RECIPIENT_DISPLAY = 'portaldedados@data4moz.com'
const FONT_STACK = 'Inter,Arial,sans-serif'

/**
 * Casca comum a todos os emails do portal (faixa verde institucional, corpo, rodapé). Construída
 * com tabelas e estilos inline propositadamente: é o único formato que renderiza de forma
 * consistente no Gmail, Outlook e Apple Mail — flexbox/grid são ignorados por vários clientes.
 */
function emailShell(opts: { heading: string; bodyHtml: string; footerHtml: string }): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.heading}</title>
</head>
<body style="margin:0; padding:0; background-color:#F1F8F4; font-family:${FONT_STACK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F8F4; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #E2E8E5;">
          <tr>
            <td style="background-color:#064E2C; padding:28px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="44" style="width:44px; background-color:#ffffff; border-radius:10px; padding:4px;" valign="middle">
                    <img src="${getSiteUrl()}/images/logo.png" width="36" height="36" alt="Data Portal" style="display:block; width:36px; height:36px; border-radius:8px;" />
                  </td>
                  <td style="width:12px;">&nbsp;</td>
                  <td valign="middle">
                    <p style="margin:0; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#9FD4B4; font-family:${FONT_STACK};">
                      Data Portal · Data4Moz
                    </p>
                    <p style="margin:6px 0 0 0; font-size:20px; font-weight:800; line-height:1.3; color:#ffffff; font-family:${FONT_STACK};">
                      ${opts.heading}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px; background-color:#FAFBFA; border-top:1px solid #E2E8E5;">
              ${opts.footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 20px 0; font-size:14px; line-height:1.7; color:#1F2A24; font-family:${FONT_STACK};">${html}</p>`
}

function codeBlock(code: string): string {
  return `<p style="margin:0 0 20px 0; font-size:32px; font-weight:700; letter-spacing:6px; color:#064E2C; font-family:${FONT_STACK};">${code}</p>`
}

function ctaButton(label: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 4px 0;">
      <tr>
        <td style="border-radius:10px; background-color:#064E2C;">
          <a href="${href}" style="display:inline-block; padding:13px 28px; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; font-family:${FONT_STACK};">
            ${label}
          </a>
        </td>
      </tr>
    </table>`
}

function footerNote(text: string): string {
  return `<p style="margin:0; font-size:12px; line-height:1.6; color:#8B9A91; font-family:${FONT_STACK};">${text}</p>`
}

function defaultFooter(to: string): string {
  return footerNote(
    `Recebeu este email porque tem uma conta no Data Portal associada a ${to}. Dúvidas? Responda a este email ou contacte ${CONTACT_RECIPIENT_DISPLAY}.`
  )
}

export async function sendContactEmail(payload: MailPayload): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const recipient = getRequiredEnv('CONTACT_RECIPIENT_EMAIL')
  const transporter = createSmtpTransporter()

  const bodyHtml = [
    paragraph(`<strong>Nome:</strong> ${payload.fromName}`),
    paragraph(`<strong>Email:</strong> ${payload.fromEmail}`),
    payload.purposeLabel ? paragraph(`<strong>Finalidade:</strong> ${payload.purposeLabel}`) : '',
    paragraph(`<strong>Assunto:</strong> ${payload.subject}`),
    `<div style="margin:20px 0 0 0; padding:16px; background-color:#F7F9F8; border:1px solid #E2E8E5; border-radius:10px;">
      <p style="margin:0; font-size:13px; line-height:1.7; color:#1F2A24; font-family:${FONT_STACK}; white-space:pre-wrap;">${payload.message}</p>
    </div>`,
  ].join('')

  await transporter.sendMail({
    from: `"Data Portal - Contacto" <${user}>`,
    to: recipient,
    replyTo: `${payload.fromName} <${payload.fromEmail}>`,
    subject: `[Contacto Portal] ${payload.subject}`,
    text: [
      `Nome: ${payload.fromName}`,
      `Email: ${payload.fromEmail}`,
      payload.purposeLabel ? `Finalidade: ${payload.purposeLabel}` : null,
      `Assunto: ${payload.subject}`,
      '',
      'Mensagem:',
      payload.message,
    ]
      .filter((linha): linha is string => linha !== null)
      .join('\n'),
    html: emailShell({
      heading: 'Nova mensagem de contacto',
      bodyHtml,
      footerHtml: footerNote('Enviado a partir do formulário de contacto do Data Portal.'),
    }),
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

  const bodyHtml = [
    paragraph('Obrigado por se registar no <strong>Data Portal</strong>.'),
    paragraph('Utilize o código abaixo para activar a sua conta (válido por <strong>30 minutos</strong>):'),
    codeBlock(code),
    ctaButton('Confirmar pelo link', confirmUrl),
  ].join('')

  await transporter.sendMail({
    from: `"Data Portal" <${user}>`,
    to,
    subject: 'Data Portal: confirme o seu registo',
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
    html: emailShell({
      heading: 'Confirme o seu registo',
      bodyHtml,
      footerHtml: footerNote('Se não criou esta conta, ignore este email.'),
    }),
  })
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const transporter = createSmtpTransporter()
  const confirmUrl = `${getSiteUrl()}/verificar-email?token=${encodeURIComponent(token)}`

  const bodyHtml = [
    paragraph('Obrigado por se registar no <strong>Data Portal</strong>.'),
    paragraph('Clique no botão abaixo para activar a sua conta (link válido por <strong>30 minutos</strong>):'),
    ctaButton('Confirmar email', confirmUrl),
  ].join('')

  await transporter.sendMail({
    from: `"Data Portal" <${user}>`,
    to,
    subject: 'Data Portal: confirme o seu email',
    text: [
      'Obrigado por se registar no Data Portal.',
      '',
      'Para activar a sua conta, confirme o seu email através do link abaixo (válido por 30 minutos):',
      confirmUrl,
      '',
      'Se não criou esta conta, ignore este email.',
    ].join('\n'),
    html: emailShell({
      heading: 'Confirme o seu email',
      bodyHtml,
      footerHtml: footerNote('Se não criou esta conta, ignore este email.'),
    }),
  })
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const transporter = createSmtpTransporter()

  const bodyHtml = [
    paragraph('Recebemos um pedido para redefinir a sua senha no <strong>Data Portal</strong>.'),
    paragraph('Utilize o código abaixo para continuar (válido por <strong>15 minutos</strong>):'),
    codeBlock(code),
  ].join('')

  await transporter.sendMail({
    from: `"Data Portal" <${user}>`,
    to,
    subject: 'Data Portal: recuperação de senha',
    text: [
      'Recebemos um pedido para redefinir a sua senha no Data Portal.',
      '',
      `Código de recuperação: ${code}`,
      '',
      'Introduza este código na página de redefinição de senha (válido por 15 minutos).',
      '',
      'Se não solicitou esta alteração, ignore este email: a sua senha actual permanece válida.',
    ].join('\n'),
    html: emailShell({
      heading: 'Recuperação de senha',
      bodyHtml,
      footerHtml: footerNote('Se não solicitou esta alteração, ignore este email; a sua senha actual permanece válida.'),
    }),
  })
}

export async function sendEmailChangeVerification(to: string, code: string): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const transporter = createSmtpTransporter()

  const bodyHtml = [
    paragraph('Recebemos um pedido para associar este email à sua conta no <strong>Data Portal</strong>.'),
    paragraph('Utilize o código abaixo para confirmar (válido por <strong>15 minutos</strong>):'),
    codeBlock(code),
  ].join('')

  await transporter.sendMail({
    from: `"Data Portal" <${user}>`,
    to,
    subject: 'Data Portal: confirme o seu novo email',
    text: [
      'Recebemos um pedido para associar este email à sua conta no Data Portal.',
      '',
      `Código de confirmação: ${code}`,
      '',
      'Introduza este código na página de perfil para concluir a alteração (válido por 15 minutos).',
      '',
      'Se não solicitou esta alteração, ignore este email: o seu email actual permanece válido.',
    ].join('\n'),
    html: emailShell({
      heading: 'Confirme o seu novo email',
      bodyHtml,
      footerHtml: footerNote('Se não solicitou esta alteração, ignore este email; o seu email actual permanece válido.'),
    }),
  })
}

export async function sendDatasetUpdatedEmail(to: string, datasetTitle: string, datasetId: number): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const transporter = createSmtpTransporter()
  const datasetUrl = `${getSiteUrl()}/dataset/${datasetId}`

  const bodyHtml = [
    paragraph(`O dataset <strong>${datasetTitle}</strong> que subscreveu foi actualizado no Data Portal.`),
    ctaButton('Ver dataset actualizado', datasetUrl),
  ].join('')

  await transporter.sendMail({
    from: `"Data Portal" <${user}>`,
    to,
    subject: `Data Portal: "${datasetTitle}" foi actualizado`,
    text: [
      `O dataset "${datasetTitle}" que subscreveu foi actualizado no Data Portal.`,
      '',
      `Ver o dataset: ${datasetUrl}`,
      '',
      'Recebe este email porque activou alertas de actualização para este dataset a partir de uma análise de IA Insights guardada.',
    ].join('\n'),
    html: emailShell({
      heading: 'Dataset actualizado',
      bodyHtml,
      footerHtml: footerNote(
        'Recebe este email porque activou alertas de actualização para este dataset a partir de uma análise de IA Insights guardada.'
      ),
    }),
  })
}

const CONTENT_TYPE_LABELS: Record<'dataset' | 'relatorio' | 'dashboard', string> = {
  dataset: 'dataset',
  relatorio: 'relatório',
  dashboard: 'dashboard',
}

export async function sendNewContentNotificationEmail(
  to: string,
  contentType: 'dataset' | 'relatorio' | 'dashboard',
  title: string,
  contentUrl: string
): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const transporter = createSmtpTransporter()
  const label = CONTENT_TYPE_LABELS[contentType]

  const bodyHtml = [
    paragraph(`Um novo ${label} foi publicado no <strong>Data Portal</strong>:`),
    `<p style="margin:0 0 20px 0; font-size:18px; font-weight:700; color:#064E2C; font-family:${FONT_STACK};">${title}</p>`,
    ctaButton(`Ver ${label}`, contentUrl),
  ].join('')

  await transporter.sendMail({
    from: `"Data Portal" <${user}>`,
    to,
    subject: `Data Portal: novo ${label} disponível: "${title}"`,
    text: [
      `Um novo ${label} foi publicado no Data Portal: "${title}".`,
      '',
      `Ver: ${contentUrl}`,
      '',
      'Recebe este email porque tem uma conta registada no Data Portal.',
    ].join('\n'),
    html: emailShell({
      heading: `Novo ${label} disponível`,
      bodyHtml,
      footerHtml: defaultFooter(to),
    }),
  })
}

export async function sendNewUserAdminAlertEmail(
  to: string,
  newUser: { name: string; email: string }
): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const transporter = createSmtpTransporter()
  const usersUrl = `${getSiteUrl()}/dashboard`

  const bodyHtml = [
    paragraph(`<strong>Nome:</strong> ${newUser.name}`),
    paragraph(`<strong>Email:</strong> ${newUser.email}`),
    ctaButton('Ver utilizadores', usersUrl),
  ].join('')

  await transporter.sendMail({
    from: `"Data Portal" <${user}>`,
    to,
    subject: `Data Portal: novo utilizador registado: ${newUser.name}`,
    text: [
      'Um novo utilizador registou-se no Data Portal.',
      '',
      `Nome: ${newUser.name}`,
      `Email: ${newUser.email}`,
      '',
      `Ver utilizadores: ${usersUrl}`,
    ].join('\n'),
    html: emailShell({
      heading: 'Novo utilizador registado',
      bodyHtml,
      footerHtml: footerNote('Recebe este alerta por ser administrador do Data Portal.'),
    }),
  })
}

export async function sendUsageThresholdAlertEmail(
  to: string,
  kind: 'views' | 'downloads',
  threshold: number,
  total: number
): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const transporter = createSmtpTransporter()
  const label = kind === 'views' ? 'visualizações' : 'downloads'
  const dashboardUrl = `${getSiteUrl()}/dashboard`
  const today = new Date().toLocaleDateString('pt-PT')

  const bodyHtml = [
    paragraph(`O Data Portal atingiu <strong>${threshold} ${label}</strong> hoje (${today}).`),
    `<p style="margin:0 0 20px 0; font-size:32px; font-weight:700; color:#064E2C; font-family:${FONT_STACK};">${total}</p>`,
    ctaButton('Ver painel de administração', dashboardUrl),
  ].join('')

  await transporter.sendMail({
    from: `"Data Portal" <${user}>`,
    to,
    subject: `Data Portal: ${threshold}+ ${label} hoje`,
    text: [
      `O portal atingiu ${threshold} ${label} hoje (${today}).`,
      '',
      `Total actual: ${total} ${label}.`,
      '',
      `Ver painel: ${dashboardUrl}`,
    ].join('\n'),
    html: emailShell({
      heading: `${threshold}+ ${label} hoje`,
      bodyHtml,
      footerHtml: footerNote('Recebe este alerta por ser administrador do Data Portal.'),
    }),
  })
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const transporter = createSmtpTransporter()
  const siteUrl = getSiteUrl()
  const firstName = name.trim().split(/\s+/)[0] || name

  const features: { title: string; desc: string }[] = [
    {
      title: 'Catálogo de dados',
      desc: 'Datasets geoespaciais e alfanuméricos oficiais, com pré-visualização antes de descarregar.',
    },
    {
      title: 'AI Insights',
      desc: 'Faça uma pergunta em português sobre os dados e receba gráfico, mapa ou previsão em segundos.',
    },
    {
      title: 'Mapas Inteligentes e Dashboards',
      desc: 'Visualizações interactivas já preparadas, prontas a explorar sem instalar nada.',
    },
    {
      title: 'Favoritos e alertas',
      desc: 'Guarde os datasets que usa com frequência e seja avisado quando forem actualizados.',
    },
  ]

  const featureRows = features
    .map(
      (f, i) => `
        <tr>
          <td style="padding:${i === 0 ? '0' : '20px'} 0 0 0; border-top:${i === 0 ? 'none' : '1px solid #E2E8E5'}; padding-top:${i === 0 ? '0' : '20px'};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="4" style="background-color:#064E2C; border-radius:2px;">&nbsp;</td>
                <td style="width:12px;">&nbsp;</td>
                <td>
                  <p style="margin:0 0 4px 0; font-size:15px; font-weight:700; color:#0B1B14; font-family:${FONT_STACK};">
                    ${f.title}
                  </p>
                  <p style="margin:0; font-size:13px; line-height:1.6; color:#4A5A52; font-family:${FONT_STACK};">
                    ${f.desc}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    )
    .join('')

  const bodyHtml = [
    paragraph('A sua conta está activa. O Data Portal reúne os dados oficiais de Moçambique num só lugar; eis o que pode fazer a partir de agora:'),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${featureRows}</table>`,
    `<div style="margin-top:24px;">${ctaButton('Explorar o Data Portal', siteUrl)}</div>`,
  ].join('')

  await transporter.sendMail({
    from: `"Data Portal" <${user}>`,
    to,
    subject: 'Bem-vindo(a) ao Data Portal',
    text: [
      `Bem-vindo(a) ao Data Portal, ${firstName}.`,
      '',
      'A sua conta está activa. Eis o que pode fazer:',
      ...features.map((f) => `- ${f.title}: ${f.desc}`),
      '',
      `Explorar: ${siteUrl}`,
    ].join('\n'),
    html: emailShell({
      heading: `Bem-vindo(a), ${firstName}.`,
      bodyHtml,
      footerHtml: defaultFooter(to),
    }),
  })
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const user = getRequiredEnv('SMTP_USER')
  const transporter = createSmtpTransporter()

  const bodyHtml = [
    paragraph('Utilize o código abaixo para concluir o login no <strong>Data Portal</strong>:'),
    codeBlock(code),
    paragraph('Este código expira em <strong>5 minutos</strong>.'),
  ].join('')

  await transporter.sendMail({
    from: `"Data Portal" <${user}>`,
    to,
    subject: 'Data Portal: código de verificação',
    text: [
      'Utilize o código abaixo para concluir o login no Data Portal:',
      '',
      code,
      '',
      'Este código expira em 5 minutos.',
      'Se não solicitou este código, ignore este email.',
    ].join('\n'),
    html: emailShell({
      heading: 'Código de verificação',
      bodyHtml,
      footerHtml: footerNote('Se não solicitou este código, ignore este email.'),
    }),
  })
}
