import {
  findAllRegisteredUsers,
  findConteudoPublicadoNaSemana,
  findUsersSubscritosNotificacoes,
  incrementDailyUsage,
  markDailyUsageAlerted,
} from '@/lib/db'
import {
  hasAuthMailConfig,
  sendNewUserAdminAlertEmail,
  sendResumoSemanalEmail,
  sendUsageThresholdAlertEmail,
} from '@/lib/mailer'
import { logger } from '@/lib/logger'

/** Limiares de alerta — progressão 1-2-5 conforme pedido (10, 20, 50, 100…), continuada acima
 * dos valores explicitamente indicados para cobrir dias de tráfego muito alto. */
const USAGE_ALERT_THRESHOLDS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]

/**
 * Resumo semanal (pensado para correr uma vez por semana, via cron — ver
 * app/api/cron/resumo-semanal/route.ts): um único email com tudo o que foi publicado nos últimos
 * 7 dias, só para quem escolheu receber notificações e só para utilizadores normais (os
 * administradores têm os seus próprios alertas operacionais, separados deste). Substitui o antigo
 * envio imediato por cada dataset/relatório/dashboard publicado, que enchia a caixa de correio de
 * quem segue o portal de perto.
 */
export async function enviarResumoSemanalNovidades(): Promise<void> {
  if (!hasAuthMailConfig()) return

  const itens = await findConteudoPublicadoNaSemana()
  if (itens.length === 0) return

  const users = await findUsersSubscritosNotificacoes()
  if (users.length === 0) return

  const results = await Promise.allSettled(users.map((u) => sendResumoSemanalEmail(u.email, itens)))

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    logger.error('error_sending_resumo_semanal', { failed, total: users.length, itens: itens.length })
  }
}

/** Avisa todos os administradores sempre que um novo utilizador se regista. */
export async function notifyAdminsOfNewUser(newUser: { name: string; email: string }): Promise<void> {
  if (!hasAuthMailConfig()) return

  const users = await findAllRegisteredUsers()
  const admins = users.filter((u) => u.role === 'admin' && u.receberNotificacoes !== false)

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
    const admins = users.filter((u) => u.role === 'admin' && u.receberNotificacoes !== false)

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
