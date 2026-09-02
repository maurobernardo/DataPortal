import {
  findAllRegisteredUsers,
  findUsersSubscritosNotificacoes,
  incrementDailyUsage,
  markDailyUsageAlerted,
} from '@/lib/db'
import {
  hasAuthMailConfig,
  sendNewContentNotificationEmail,
  sendNewUserAdminAlertEmail,
  sendUsageThresholdAlertEmail,
} from '@/lib/mailer'
import { logger } from '@/lib/logger'

/** Limiares de alerta — progressão 1-2-5 conforme pedido (10, 20, 50, 100…), continuada acima
 * dos valores explicitamente indicados para cobrir dias de tráfego muito alto. */
const USAGE_ALERT_THRESHOLDS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]

function getSiteUrl(): string {
  return (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

/**
 * Avisa quem escolheu receber notificações (nunca todos os utilizadores registados: essa era a
 * versão antiga — o portal enviava email a toda a base de dados sempre que algo novo era
 * publicado, sem hipótese de recusar) sempre que um novo dataset, relatório ou dashboard é
 * publicado. Corre em segundo plano (nunca bloqueia a resposta da criação do conteúdo) e cada
 * envio falha isoladamente — um endereço inválido não impede os restantes.
 */
export async function notifyUsersOfNewContent(
  contentType: 'dataset' | 'relatorio' | 'dashboard',
  title: string,
  path: string
): Promise<void> {
  if (!hasAuthMailConfig()) return

  const url = `${getSiteUrl()}${path}`
  const users = await findUsersSubscritosNotificacoes()
  if (users.length === 0) return

  const results = await Promise.allSettled(
    users.map((u) => sendNewContentNotificationEmail(u.email, contentType, title, url))
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    logger.error('error_sending_new_content_notifications', { contentType, title, failed, total: users.length })
  }
}

/** Avisa todos os administradores sempre que um novo utilizador se regista. */
export async function notifyAdminsOfNewUser(newUser: { name: string; email: string }): Promise<void> {
  if (!hasAuthMailConfig()) return

  const users = await findAllRegisteredUsers()
  const admins = users.filter((u) => u.role === 'admin')

  const results = await Promise.allSettled(
    admins.map((a) => sendNewUserAdminAlertEmail(a.email, newUser))
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    logger.error('error_sending_new_user_admin_alert', { newUserEmail: newUser.email, failed, total: admins.length })
  }
}

/**
 * Regista uma visualização/download no contador diário do portal e, se este evento fez o total
 * do dia cruzar um novo limiar (10, 20, 50, 100…) ainda não alertado, avisa os administradores.
 * Chamar sempre em "fire and forget" a partir de quem incrementa a estatística — nunca deve
 * atrasar nem falhar a operação principal (visualizar/descarregar).
 */
export async function recordDailyUsageAndMaybeAlertAdmins(kind: 'views' | 'downloads'): Promise<void> {
  try {
    const result = await incrementDailyUsage(kind)
    if (!result) return

    const crossed = USAGE_ALERT_THRESHOLDS.filter((t) => t <= result.count && t > result.alertedThreshold).pop()
    if (crossed == null) return

    await markDailyUsageAlerted(kind, crossed)

    if (!hasAuthMailConfig()) return
    const users = await findAllRegisteredUsers()
    const admins = users.filter((u) => u.role === 'admin')

    const results = await Promise.allSettled(
      admins.map((a) => sendUsageThresholdAlertEmail(a.email, kind, crossed, result.count))
    )
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      logger.error('error_sending_usage_threshold_alert', { kind, crossed, failed, total: admins.length })
    }
  } catch (error) {
    logger.error('error_recording_daily_usage', { error, kind })
  }
}
