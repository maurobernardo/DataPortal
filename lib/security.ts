import { logger } from '@/lib/logger'

type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitResult = { allowed: boolean; retryAfter: number }

const memoryStore = new Map<string, RateLimitEntry>()

export function normalizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLen)
}

export function normalizeEmail(value: unknown): string {
  return normalizeText(value, 254).toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isStrongPassword(password: string): boolean {
  if (password.length < 12) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/\d/.test(password)) return false
  if (!/[^A-Za-z0-9]/.test(password)) return false
  return true
}

function rateLimitInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    }
  }

  entry.count += 1
  memoryStore.set(key, entry)
  return { allowed: true, retryAfter: 0 }
}

// ==================== Backend Redis (opcional) ====================
// Activado apenas quando REDIS_URL está definido. Necessário para limitar correctamente
// em produção com múltiplas instâncias/serverless, onde um Map em memória por processo
// não é partilhado e cada instância teria o seu próprio contador.
type RedisClient = import('ioredis').Redis

let redisClientPromise: Promise<RedisClient | null> | null = null

async function getRedisClient(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL?.trim()
  if (!url) return null

  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      try {
        const { Redis } = await import('ioredis')
        const client = new Redis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          connectTimeout: 3_000,
          // Não tenta reconectar indefinidamente — se o Redis estiver em baixo/inacessível,
          // desiste depressa e o rateLimit() cai para o modo em memória (fail open).
          retryStrategy: () => null,
        })
        client.on('error', (error) => logger.error('ratelimit.redis.connection_error', { error }))

        // Limite adicional para a ligação inicial: em alguns ambientes de rede
        // (sandboxes, firewalls) a ligação falhada fica pendente mais tempo do que o
        // `connectTimeout` do próprio ioredis — este race garante um limite superior real.
        await Promise.race([
          client.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('redis connect timeout')), 3_000)),
        ])

        logger.info('ratelimit.redis.connected')
        return client
      } catch (error) {
        logger.error('ratelimit.redis.connect_failed', { error })
        return null
      }
    })()
  }

  return redisClientPromise
}

async function rateLimitRedis(
  client: RedisClient,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`
  const count = await client.incr(redisKey)
  if (count === 1) {
    await client.pexpire(redisKey, windowMs)
  }
  if (count > limit) {
    const ttl = await client.pttl(redisKey)
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((ttl > 0 ? ttl : windowMs) / 1000)) }
  }
  return { allowed: true, retryAfter: 0 }
}

/**
 * Limitador de taxa. Usa Redis quando `REDIS_URL` está configurado (partilhado entre
 * instâncias); caso contrário usa um contador em memória por processo (suficiente para
 * uma única instância, como em desenvolvimento local). Falha aberta para memória local
 * se o Redis estiver configurado mas indisponível, em vez de bloquear o pedido.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const client = await getRedisClient()
  if (client) {
    try {
      return await rateLimitRedis(client, key, limit, windowMs)
    } catch (error) {
      logger.error('ratelimit.redis.query_failed', { error })
    }
  }
  return rateLimitInMemory(key, limit, windowMs)
}
