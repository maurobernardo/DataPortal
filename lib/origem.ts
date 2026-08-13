import { db } from './db'
import { extrairIp, resolverOrigem } from './geoip'

export type TipoEventoOrigem =
  | 'vista_dataset'
  | 'download'
  | 'vista_mapa'
  | 'pedido_mapa'
  | 'pedido_relatorio'
  | 'analise_ia'
  | 'contacto'

/**
 * Regista um evento com a sua origem geográfica aproximada (PLANO-ORIGEM-UTILIZADORES.md).
 *
 * Best-effort e nunca bloqueante: chamar isto nunca deve poder fazer falhar o pedido que estava a
 * decorrer (uma vista de dataset ou um download não podem começar a falhar por causa de analítica
 * interna) — por isso qualquer erro aqui é apanhado e silenciado, nunca propagado ao chamador.
 */
export async function registarAcesso(
  request: Request,
  tipoEvento: TipoEventoOrigem,
  opcoes: { referenciaId?: string | number; utilizadorId?: number | null } = {}
): Promise<void> {
  try {
    const ip = extrairIp(request)
    const origem = await resolverOrigem(ip)
    await db.execute(
      `INSERT INTO AcessoOrigem (tipo_evento, referencia_id, pais, regiao, cidade, utilizador_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        tipoEvento,
        opcoes.referenciaId != null ? String(opcoes.referenciaId) : null,
        origem.pais,
        origem.regiao,
        origem.cidade,
        opcoes.utilizadorId ?? null,
      ]
    )
  } catch {
    // silencioso: ver comentário acima
  }
}
