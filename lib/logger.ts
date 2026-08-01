type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

function serializeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  return value
}

function serializeContext(context?: LogContext) {
  if (!context) return undefined
  const out: LogContext = {}
  for (const [key, value] of Object.entries(context)) {
    out[key] = serializeValue(value)
  }
  return out
}

function emit(level: LogLevel, event: string, context?: LogContext) {
  const entry = {
    level,
    event,
    time: new Date().toISOString(),
    ...serializeContext(context),
  }
  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

/**
 * Logger estruturado (JSON por linha) — substitui `console.error`/`console.log` soltos
 * nas rotas para permitir correlação e filtragem por nível em produção.
 */
export const logger = {
  debug: (event: string, context?: LogContext) => emit('debug', event, context),
  info: (event: string, context?: LogContext) => emit('info', event, context),
  warn: (event: string, context?: LogContext) => emit('warn', event, context),
  error: (event: string, context?: LogContext) => emit('error', event, context),
}
