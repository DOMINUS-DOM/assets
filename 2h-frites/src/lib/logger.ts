/**
 * Structured logger for server-side operations.
 * Outputs JSON lines for easy parsing by log aggregators.
 * In production, these can be collected by Vercel, Datadog, etc.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };

  if (process.env.NODE_ENV === 'production') {
    // JSON lines format for log aggregation
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      JSON.stringify(entry)
    );
  } else {
    // Pretty print in development
    const prefix = { info: '\u2139\ufe0f', warn: '\u26a0\ufe0f', error: '\u274c', debug: '\ud83d\udd0d' }[level];
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `${prefix} [${level.toUpperCase()}] ${message}`,
      data ? data : ''
    );
  }
}

export const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
  debug: (msg: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') log('debug', msg, data);
  },

  /** Log an API request with timing */
  request: (method: string, path: string, userId?: string, ms?: number) => {
    log('info', `${method} ${path}`, { method, path, userId, responseMs: ms });
  },

  /** Log an error with stack trace */
  exception: (msg: string, err: unknown, context?: Record<string, unknown>) => {
    const error = err instanceof Error ? { message: err.message, stack: err.stack?.split('\n').slice(0, 3).join(' ') } : String(err);
    log('error', msg, { error, ...context });
  },
};
