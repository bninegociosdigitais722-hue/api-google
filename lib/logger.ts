import { randomUUID } from 'crypto'

type LogLevel = 'info' | 'error' | 'warn'

export type LogContext = {
  requestId?: string
  host?: string | null
  path?: string
  ownerId?: string | null
  [key: string]: any
}

const baseLog = (level: LogLevel, message: string, ctx: LogContext = {}) => {
  const payload = {
    level,
    message,
    requestId: ctx.requestId ?? randomUUID(),
    host: ctx.host,
    path: ctx.path,
    ownerId: ctx.ownerId,
    ...ctx,
  }

  // Avoid circular structures
  try {
    console.log(JSON.stringify(payload))
  } catch (err) {
    console.log(`[logger] ${level}: ${message}`, payload)
  }

  return payload.requestId
}

export const logInfo = (message: string, ctx?: LogContext) => baseLog('info', message, ctx)
export const logWarn = (message: string, ctx?: LogContext) => baseLog('warn', message, ctx)
export const logError = (message: string, ctx?: LogContext) => baseLog('error', message, ctx)

export const resolveRequestId = (headers?: Headers | null) => {
  const fromHeader = headers?.get('x-request-id') ?? headers?.get('x-correlation-id')
  return fromHeader || randomUUID()
}

