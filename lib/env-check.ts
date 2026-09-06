import { logger } from '@/lib/logger'

const VALORES_DE_EXEMPLO = new Set([
  'replace-with-a-strong-random-secret',
  'your-smtp-user@gmail.com',
  'your-app-password',
])

const SECRETS_OBRIGATORIOS_EM_PRODUCAO = ['JWT_SECRET', 'DATABASE_URL', 'CRON_SECRET']

/**
 * Validação de arranque para os segredos guardados em variáveis de ambiente (.env, ou o
 * equivalente do painel de hosting em produção). Este portal corre em hosting partilhado
 * (cPanel), onde um cofre de segredos dedicado (Vault, AWS Secrets Manager) não é viável sem
 * contratar um serviço externo novo — por isso a mitigação aqui é: nunca aceitar o valor de
 * exemplo do .env.example, e nunca arrancar em produção sem os segredos mínimos definidos.
 */
export function validarSecretsObrigatorios(): void {
  if (process.env.NODE_ENV !== 'production') return

  const emFalta: string[] = []
  const comValorDeExemplo: string[] = []

  for (const nome of SECRETS_OBRIGATORIOS_EM_PRODUCAO) {
    const valor = process.env[nome]?.trim()
    if (!valor) {
      emFalta.push(nome)
    } else if (VALORES_DE_EXEMPLO.has(valor)) {
      comValorDeExemplo.push(nome)
    }
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length < 32) {
    logger.error('env_check.jwt_secret_fraco', {
      aviso: 'JWT_SECRET tem menos de 32 caracteres — gere um valor mais longo e aleatório.',
    })
  }

  if (emFalta.length > 0) {
    logger.error('env_check.secrets_em_falta', { emFalta })
  }
  if (comValorDeExemplo.length > 0) {
    logger.error('env_check.secrets_com_valor_de_exemplo', { comValorDeExemplo })
  }
}
