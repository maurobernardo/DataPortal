/**
 * Cache em memória (por sessão de navegação) partilhado entre os vários componentes que
 * pedem a pré-visualização do mesmo dataset (cartão do catálogo, painel de detalhe, página
 * de detalhe) — evita refazer o fetch/parse ao reselecionar um dataset já visto.
 */

const TTL_MS = 5 * 60_000

type CacheEntry = { data: unknown; expiresAt: number }

const cache = new Map<string, CacheEntry>()

function keyFor(kind: 'preview' | 'thumbnail', id: number) {
  return `${kind}:${id}`
}

export function getCachedPreview<T = unknown>(id: number, kind: 'preview' | 'thumbnail' = 'preview'): T | undefined {
  const entry = cache.get(keyFor(kind, id))
  if (!entry) return undefined
  if (entry.expiresAt < Date.now()) {
    cache.delete(keyFor(kind, id))
    return undefined
  }
  return entry.data as T
}

export function setCachedPreview(id: number, data: unknown, kind: 'preview' | 'thumbnail' = 'preview') {
  cache.set(keyFor(kind, id), { data, expiresAt: Date.now() + TTL_MS })
}
