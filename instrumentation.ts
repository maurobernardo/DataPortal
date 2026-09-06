/**
 * Corre uma única vez quando o processo Next.js arranca (servidor Node, não Edge). Serve para
 * falhar cedo e de forma óbvia se um segredo obrigatório estiver em falta ou for o valor de
 * exemplo do .env.example, em vez de deixar isso rebentar silenciosamente mais tarde (ex.: JWT
 * a assinar sessões com uma string fraca) — ver lib/env-check.ts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validarSecretsObrigatorios } = await import('./lib/env-check')
    validarSecretsObrigatorios()
  }
}
