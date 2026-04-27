/**
 * Centralny logger.
 *
 * - W dev wypisuje wszystko (tak jak `console.*`).
 * - W produkcji tłumi `debug`/`info` (zostaje tylko `warn`/`error`).
 * - Punkt zaczepienia pod Sentry / Pino — gdy będzie skonfigurowane,
 *   przekierujemy `error()` do `Sentry.captureException`.
 */

type LogContext = Record<string, unknown>

const isProd = process.env.NODE_ENV === "production"

function format(level: string, msg: string, ctx?: LogContext) {
  const time = new Date().toISOString()
  const ctxStr = ctx ? " " + JSON.stringify(ctx) : ""
  return `[${time}] [${level}] ${msg}${ctxStr}`
}

export const logger = {
  debug(msg: string, ctx?: LogContext) {
    if (!isProd) console.debug(format("DEBUG", msg, ctx))
  },
  info(msg: string, ctx?: LogContext) {
    if (!isProd) console.info(format("INFO", msg, ctx))
  },
  warn(msg: string, ctx?: LogContext) {
    console.warn(format("WARN", msg, ctx))
  },
  error(msg: string, error?: unknown, ctx?: LogContext) {
    const errCtx: LogContext = { ...ctx }
    if (error instanceof Error) {
      errCtx.error = error.message
      if (!isProd && error.stack) errCtx.stack = error.stack
    } else if (error !== undefined) {
      errCtx.error = String(error)
    }
    console.error(format("ERROR", msg, errCtx))
    // TODO: Sentry.captureException(error, { extra: ctx })
  },
}
