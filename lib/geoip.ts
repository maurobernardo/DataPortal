import path from 'path'
import { open, type Reader, type CityResponse } from 'maxmind'

/**
 * Resolução de IP -> localização aproximada (PLANO-ORIGEM-UTILIZADORES.md).
 *
 * Deliberadamente NÃO guarda o IP em lado nenhum: `resolverOrigem` recebe o IP, devolve
 * país/região/cidade, e o chamador (`registarAcesso` em lib/origem.ts) descarta o IP a seguir.
 * A base de dados é local (ficheiro .mmdb da MaxMind, actualizado por `npm run geoip:update`) —
 * zero chamadas de rede por pedido, zero envio do IP de visitantes para um serviço externo.
 */

export type OrigemGeografica = {
  pais: string | null
  regiao: string | null
  cidade: string | null
}

let leitor: Reader<CityResponse> | null | undefined // undefined = ainda não tentado carregar

async function obterLeitor(): Promise<Reader<CityResponse> | null> {
  if (leitor !== undefined) return leitor
  try {
    const caminho = path.join(process.cwd(), 'data', 'geoip', 'GeoLite2-City.mmdb')
    leitor = await open<CityResponse>(caminho)
  } catch {
    // Ficheiro ainda não descarregado (`npm run geoip:update`) ou falha de leitura: falha
    // silenciosa aqui, não deve impedir o pedido HTTP que estava a chamar isto.
    leitor = null
  }
  return leitor
}

/** IPs privados/locais não têm localização geográfica real — não vale a pena tentar resolver. */
function ehIpPrivadoOuLocal(ip: string): boolean {
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  )
}

export async function resolverOrigem(ip: string | null | undefined): Promise<OrigemGeografica> {
  const vazio: OrigemGeografica = { pais: null, regiao: null, cidade: null }
  if (!ip || ip === 'unknown' || ehIpPrivadoOuLocal(ip)) return vazio

  const r = await obterLeitor()
  if (!r) return vazio

  try {
    const resultado = r.get(ip)
    if (!resultado) return vazio
    return {
      pais: resultado.country?.iso_code ?? null,
      regiao: resultado.subdivisions?.[0]?.names?.en ?? null,
      cidade: resultado.city?.names?.en ?? null,
    }
  } catch {
    return vazio
  }
}

/** Mesmo critério já usado no rate limiting (lib/security.ts) e nos formulários existentes: o
 *  primeiro IP da cadeia x-forwarded-for é o do visitante original. */
export function extrairIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
